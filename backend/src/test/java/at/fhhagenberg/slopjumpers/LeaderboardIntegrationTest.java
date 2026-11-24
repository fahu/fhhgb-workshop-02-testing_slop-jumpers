package at.fhhagenberg.slopjumpers;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class LeaderboardIntegrationTest extends HttpIntegrationTest {
    @Test
    void onlyTheEightLongestDistancesAreRanked() throws Exception {
        // Arrange
        for (int distance = 500; distance < 512; distance++) {
            save("/runs/" + start() + "/finish", progress(distance));
        }

        // Act
        var entries = getJson("/leaderboard").get("entries");

        // Assert
        assertThat(entries).extracting(entry -> entry.get("distance").asInt())
            .containsExactly(511, 510, 509, 508, 507, 506, 505, 504);
    }

    @Test
    void theRankingShowsThePilotsCountry() throws Exception {
        // Arrange
        save("/runs/" + start() + "/finish", progress(300));

        // Act
        var entry = getJson("/leaderboard").get("entries").get(0);

        // Assert
        assertThat(entry.get("nationality").get("name").asText()).isEqualTo("Austria");
    }

    @Test
    void aRunWithNoProgressDoesNotQualifyForTheRanking() throws Exception {
        // Arrange
        start();

        // Act
        var entries = getJson("/leaderboard").get("entries");

        // Assert
        assertThat(entries.size()).isZero();
    }

    @Test
    void onlyTheBestRunPerPilotIsRankedWithItsCollision() throws Exception {
        // Arrange
        String player = UUID.randomUUID().toString();
        save("/runs/" + start(player) + "/finish", new Models.Progress(281, 1, 5000, "citation-404"));
        save("/runs/" + start(player) + "/finish", new Models.Progress(176, 0, 3000, "seven-finger-hand"));

        // Act
        var entries = getJson("/leaderboard").get("entries");

        // Assert
        assertThat(entries.size()).isOne();
        var best = entries.get(0);
        assertThat(best.get("distance").asInt()).isEqualTo(281);
        assertThat(best.get("collisionId").asText()).isEqualTo("citation-404");
        assertThat(best.get("finished").asBoolean()).isTrue();
    }

    @Test
    void endingARunManuallyRecordsNoCollision() throws Exception {
        // Arrange
        save("/runs/" + start() + "/finish", progress(75));

        // Act
        var result = getJson("/leaderboard").get("entries").get(0);

        // Assert
        assertThat(result.get("collisionId").isNull()).isTrue();
    }

    @Test
    void aShorterRunDoesNotEraseTheEarlierCollisionFromHistory() throws Exception {
        // Arrange
        String player = UUID.randomUUID().toString();
        String best = start(player);
        save("/runs/" + best + "/finish", new Models.Progress(281, 1, 5000, "citation-404"));
        save("/runs/" + start(player) + "/finish", progress(75));

        // Act
        var history = getJson("/runs?playerId=" + player);

        // Assert
        assertThat(history.size()).isEqualTo(2);
        assertThat(history).anySatisfy(run -> {
            assertThat(run.get("id").asText()).isEqualTo(best);
            assertThat(run.get("collisionId").asText()).isEqualTo("citation-404");
        });
        assertThat(getJson("/runs/" + best).get("collisionId").asText()).isEqualTo("citation-404");
    }

    @Test
    void aCrashMustMatchTheObstacleAtThatDistance() throws Exception {
        // Arrange
        String runId = start();
        String finish = "/runs/" + runId + "/finish";

        // Act
        var response = call("PUT", finish, new Models.Progress(390, 1, 7000, "vibe-coded-toaster"));

        // Assert
        assertThat(response.getStatus()).isEqualTo(400);
    }

    @Test
    void aCheckpointCannotReportACollision() throws Exception {
        // Arrange
        String runId = start();

        // Act
        var response = call("PUT", "/runs/" + runId + "/checkpoints/1",
            new Models.Progress(1500, 3, 25000, "citation-404"));

        // Assert
        assertThat(response.getStatus()).isEqualTo(400);
    }

    @Test
    void repeatingTheSameCollisionAcknowledgesTheOriginalFinish() throws Exception {
        // Arrange
        String runId = start();
        String finish = "/runs/" + runId + "/finish";
        var collision = new Models.Progress(281, 1, 5000, "citation-404");
        save(finish, collision);

        // Act
        var retry = call("PUT", finish, collision);

        // Assert
        assertThat(retry.getStatus()).isEqualTo(200);
        assertThat(body(retry).get("duplicate").asBoolean()).isTrue();
    }

    @Test
    void aRetryCannotRemoveTheRecordedCollision() throws Exception {
        // Arrange
        String runId = start();
        String finish = "/runs/" + runId + "/finish";
        var collision = new Models.Progress(281, 1, 5000, "citation-404");
        save(finish, collision);

        // Act
        var retry = call("PUT", finish, new Models.Progress(281, 1, 5000, null));

        // Assert
        assertThat(retry.getStatus()).isEqualTo(409);
    }
}
