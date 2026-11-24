package at.fhhagenberg.slopjumpers;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;

class RunIntegrationTest extends HttpIntegrationTest {
    @Test
    void registrationRequiresANationality() throws Exception {
        // Arrange
        var form = Map.of("alias", "Pilot", "playerId", UUID.randomUUID().toString());

        // Act
        var response = call("POST", "/runs", form);

        // Assert
        assertThat(response.getStatus()).isEqualTo(400);
    }

    @Test
    void registrationRejectsAnUnknownNationality() throws Exception {
        // Arrange
        var form = Map.of("alias", "Pilot", "playerId", UUID.randomUUID().toString(), "nationalityCode", "XX");

        // Act
        var response = call("POST", "/runs", form);

        // Assert
        assertThat(response.getStatus()).isEqualTo(400);
    }

    @Test
    void aNewRunStartsAtZeroWithNoCheckpoints() throws Exception {
        // Arrange
        String player = UUID.randomUUID().toString();

        // Act
        String runId = start(player);

        // Assert
        var run = getJson("/runs/" + runId);
        assertThat(run.get("distance").asInt()).isZero();
        assertThat(run.get("elapsedMs").asLong()).isZero();
        assertThat(run.get("finished").asBoolean()).isFalse();
        assertThat(checkpointCount(runId)).isZero();
    }

    @Test
    void aNewRunAppearsInItsPlayersHistory() throws Exception {
        // Arrange
        String player = UUID.randomUUID().toString();
        String runId = start(player);

        // Act
        var history = getJson("/runs?playerId=" + player);

        // Assert
        assertThat(history.size()).isOne();
        assertThat(history.get(0).get("id").asText()).isEqualTo(runId);
    }

    @Test
    void aPlayerWithoutRunsHasNoSavedProfile() throws Exception {
        // Arrange
        String newPlayer = UUID.randomUUID().toString();

        // Act
        var response = call("GET", "/players/" + newPlayer + "/profile", null);

        // Assert
        assertThat(response.getStatus()).isEqualTo(204);
    }

    @Test
    void anInvalidPlayerIdIsRejected() throws Exception {
        // Act
        var response = call("GET", "/players/invalid/profile", null);

        // Assert
        assertThat(response.getStatus()).isEqualTo(400);
    }

    @Test
    void registrationReturnsTheSavedProfileWithoutCachingIt() throws Exception {
        // Arrange
        String player = UUID.randomUUID().toString();
        start(player);

        // Act
        var response = call("GET", "/players/" + player + "/profile", null);

        // Assert
        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store");
        var profile = body(response);
        assertThat(profile.get("alias").asText()).isEqualTo("Test runner");
        assertThat(profile.get("nationalityCode").asText()).isEqualTo("AT");
        assertThat(profile.get("playerId").asText()).isEqualTo(player);
    }

    @Test
    void registrationUsesTheLatestStartEvenWhenAnOlderRunScoredHigher() throws Exception {
        // Arrange
        String player = UUID.randomUUID().toString();
        startWithUpdatedProfile(player);

        // Act
        var profile = getJson("/players/" + player + "/profile");

        // Assert
        assertThat(profile.get("alias").asText()).isEqualTo("Next robot");
        assertThat(profile.get("nationalityCode").asText()).isEqualTo("DE");
    }

    @Test
    void changingTheProfileKeepsTheOriginalRunIdentity() throws Exception {
        // Arrange
        String player = UUID.randomUUID().toString();
        String previous = startWithUpdatedProfile(player);

        // Act
        var run = getJson("/runs/" + previous);

        // Assert
        assertThat(run.get("alias").asText()).isEqualTo("Test runner");
        assertThat(run.get("nationalityCode").asText()).isEqualTo("AT");
    }

    @Test
    void finishingAfterTwoCheckpointsRecordsOneFinishedRun() throws Exception {
        // Arrange
        String player = UUID.randomUUID().toString();
        String runId = start(player);
        save("/runs/" + runId + "/checkpoints/1", progress(1500));
        save("/runs/" + runId + "/checkpoints/2", progress(3000));

        // Act
        save("/runs/" + runId + "/finish", progress(3453));

        // Assert
        var history = getJson("/runs?playerId=" + player);
        assertThat(history.size()).isOne();
        assertThat(history.get(0).get("distance").asInt()).isEqualTo(3453);
        assertThat(history.get(0).get("finished").asBoolean()).isTrue();
        assertThat(checkpointCount(runId)).isEqualTo(2);
    }

    @Test
    void aFinishedDistanceCountsTowardsThePersonalBest() throws Exception {
        // Arrange
        String player = UUID.randomUUID().toString();
        String runId = start(player);
        save("/runs/" + runId + "/finish", progress(3453));

        // Act
        var best = getJson("/personal-best?playerId=" + player);

        // Assert
        assertThat(best.get("distance").asInt()).isEqualTo(3453);
    }

    @Test
    void anotherPlayerCannotSeeTheSavedRunInTheirHistory() throws Exception {
        // Arrange
        String runId = start();
        save("/runs/" + runId + "/finish", progress(300));
        String otherPlayer = UUID.randomUUID().toString();

        // Act
        var history = getJson("/runs?playerId=" + otherPlayer);

        // Assert
        assertThat(history.size()).isZero();
    }

    @Test
    void simultaneousRetriesStoreOnlyOneCheckpoint() throws Exception {
        // Arrange
        String runId = start();
        String checkpoint = "/runs/" + runId + "/checkpoints/1";
        var payload = progress(1500);
        Callable<Integer> putCheckpoint = () -> call("PUT", checkpoint, payload).getStatus();
        var retries = Collections.nCopies(8, putCheckpoint);

        // Act
        List<Future<Integer>> responses;
        try (var pool = Executors.newFixedThreadPool(8)) {
            responses = pool.invokeAll(retries);
        }

        // Assert
        for (var response : responses) {
            assertThat(response.get()).isEqualTo(200);
        }
        assertThat(checkpointCount(runId)).isOne();
    }

    @Test
    void aRetryWithChangedTokensKeepsTheFirstCheckpoint() throws Exception {
        // Arrange
        String runId = start();
        String checkpoint = "/runs/" + runId + "/checkpoints/1";
        save(checkpoint, new Models.Progress(1500, 5, 22500, null));

        // Act
        var retry = call("PUT", checkpoint, new Models.Progress(1500, 6, 22500, null));

        // Assert
        assertThat(retry.getStatus()).isEqualTo(409);
        assertThat(getJson("/runs/" + runId).get("tokens").asInt()).isEqualTo(5);
        assertThat(checkpointCount(runId)).isOne();
    }

    @Test
    void repeatingTheFinalSaveReturnsADuplicateReceipt() throws Exception {
        // Arrange
        String runId = start();
        String finish = "/runs/" + runId + "/finish";
        save(finish, progress(300));

        // Act
        var retry = call("PUT", finish, progress(300));

        // Assert
        assertThat(retry.getStatus()).isEqualTo(200);
        assertThat(body(retry).get("duplicate").asBoolean()).isTrue();
    }

    @Test
    void aFinishedDistanceCannotBeChanged() throws Exception {
        // Arrange
        String runId = start();
        String finish = "/runs/" + runId + "/finish";
        save(finish, progress(300));

        // Act
        var response = call("PUT", finish, progress(301));

        // Assert
        assertThat(response.getStatus()).isEqualTo(409);
    }

    @Test
    void aFinishedRunCannotAcceptAnotherCheckpoint() throws Exception {
        // Arrange
        String runId = start();
        String finish = "/runs/" + runId + "/finish";
        save(finish, progress(300));

        // Act
        var response = call("PUT", "/runs/" + runId + "/checkpoints/2", progress(3000));

        // Assert
        assertThat(response.getStatus()).isEqualTo(409);
    }

    @Test
    void anEarlyCheckpointCannotBeSaved() throws Exception {
        // Arrange
        String runId = start();
        String checkpoint = "/runs/" + runId + "/checkpoints/1";

        // Act
        var response = call("PUT", checkpoint, progress(199));

        // Assert
        assertThat(response.getStatus()).isEqualTo(400);
    }

    @Test
    void anImpossibleElapsedTimeIsRejected() throws Exception {
        // Arrange
        String runId = start();
        String checkpoint = "/runs/" + runId + "/checkpoints/1";

        // Act
        var response = call("PUT", checkpoint, new Models.Progress(1500, 10, 10, null));

        // Assert
        assertThat(response.getStatus()).isEqualTo(400);
    }

    @Test
    void aCheckpointCannotMoveTheRunBackwards() throws Exception {
        // Arrange
        String runId = start();
        String checkpoint = "/runs/" + runId + "/checkpoints/1";
        save("/runs/" + runId + "/checkpoints/2", progress(3000));

        // Act
        var response = call("PUT", checkpoint, progress(1500));

        // Assert
        assertThat(response.getStatus()).isEqualTo(409);
    }

    @Test
    void aBlankPilotNameIsRejected() throws Exception {
        // Arrange
        var registration = Map.of("alias", "   ", "playerId", UUID.randomUUID().toString(), "nationalityCode", "AT");

        // Act
        var response = call("POST", "/runs", registration);

        // Assert
        assertThat(response.getStatus()).isEqualTo(400);
    }

    private String startWithUpdatedProfile(String player) throws Exception {
        String previous = start(player);
        save("/runs/" + previous + "/finish", progress(3000));
        // Make the order explicit even when both starts happen in the same millisecond.
        db.update("UPDATE runs SET created_at=1 WHERE id=?", previous);
        var updated = Map.of("alias", "Next robot", "playerId", player, "nationalityCode", "DE");
        var response = call("POST", "/runs", updated);
        assertThat(response.getStatus()).isEqualTo(201);
        String latest = body(response).get("id").asText();
        assertThat(getJson("/runs/" + latest).get("distance").asInt()).isZero();
        return previous;
    }
}
