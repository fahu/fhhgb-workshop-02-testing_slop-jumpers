package at.fhhagenberg.slopjumpers;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CourseIntegrationTest extends HttpIntegrationTest {
    @Test
    void aBeltHasTheSameLayoutOnEveryRequest() throws Exception {
        // Arrange
        var firstVisit = getJson("/levels/1");

        // Act
        var nextVisit = getJson("/levels/1");

        // Assert
        assertThat(nextVisit).isEqualTo(firstVisit);
    }

    @Test
    void successiveBeltsMeetAtThe1500MetreGate() throws Exception {
        // Act
        var first = getJson("/levels/1");
        var second = getJson("/levels/2");

        // Assert
        assertThat(first.get("start").asInt()).isZero();
        assertThat(first.get("end").asInt()).isEqualTo(1500);
        assertThat(second.get("start").asInt()).isEqualTo(1500);
        assertThat(second.get("end").asInt()).isEqualTo(3000);
    }

    @Test
    void theFirstThreeBeltsUseTheFullCatalogueWithNoRepeatsWithinABelt() throws Exception {
        // Arrange
        var catalogue = new HashSet<String>();

        // Act
        var belts = List.of(getJson("/levels/1"), getJson("/levels/2"), getJson("/levels/3"));

        // Assert
        for (var belt : belts) {
            var obstacles = belt.get("obstacles");
            var names = new HashSet<String>();
            obstacles.forEach(item -> names.add(item.get("slopId").asText()));
            assertThat(obstacles.size()).isEqualTo(12);
            assertThat(names).hasSize(12);
            catalogue.addAll(names);
        }
        assertThat(catalogue).hasSize(32);
    }

    @Test
    void theThirdObstacleOnTheFirstBeltIsEmDashAvalanche() throws Exception {
        // Act
        var belt = getJson("/levels/1");

        // Assert
        assertThat(belt.get("obstacles").get(2).get("slopId").asText()).isEqualTo("em-dash-avalanche");
    }

    @Test
    void theFirstBeltOffersGroundAndOverheadTokens() throws Exception {
        // Act
        var stars = getJson("/levels/1").get("stars");

        // Assert
        var heights = new HashSet<Integer>();
        stars.forEach(token -> heights.add(token.get("height").asInt()));
        assertThat(heights).containsExactlyInAnyOrder(14, 106);
    }

    @Test
    void levelZeroIsRejected() throws Exception {
        // Act
        var response = call("GET", "/levels/0", null);

        // Assert
        assertThat(response.getStatus()).isEqualTo(400);
    }

    @Test
    void aCurrentRunCannotSaveAtTheOld200MetreGate() throws Exception {
        // Arrange
        String runId = start();

        // Act
        var response = call("PUT", "/runs/" + runId + "/checkpoints/1", progress(200));

        // Assert
        assertThat(response.getStatus()).isEqualTo(400);
    }

    @Test
    void theLeaderboardPreservesCollisionsFromBothSupportedCourseLayouts() throws Exception {
        // Arrange
        String current = start();
        String original = start();
        var currentCrash = new Models.Progress(390, 1, 7000, "em-dash-avalanche");
        var originalCrash = new Models.Progress(390, 1, 7000, "seo-spaghetti");

        // Act
        save("/runs/" + current + "/finish", currentCrash);
        save("/runs/" + original + "/finish", originalCrash);

        // Assert
        var causes = new HashSet<String>();
        getJson("/leaderboard").get("entries").forEach(score -> causes.add(score.get("collisionId").asText()));
        assertThat(causes).containsExactlyInAnyOrder("em-dash-avalanche", "seo-spaghetti");
    }

    @Test
    void aLegacyRunCanRetryAtItsOriginal200MetreGate() throws Exception {
        // Arrange
        String runId = legacyRun();
        String checkpoint = "/runs/" + runId + "/checkpoints/1";
        save(checkpoint, progress(200));

        // Act
        var retry = call("PUT", checkpoint, progress(200));

        // Assert
        assertThat(retry.getStatus()).isEqualTo(200);
        assertThat(body(retry).get("duplicate").asBoolean()).isTrue();
    }

    @Test
    void aLegacyScoreIsExcludedFromTheCurrentLeaderboard() throws Exception {
        // Arrange
        String runId = legacyRun();
        save("/runs/" + runId + "/checkpoints/1", progress(200));

        // Act
        var entries = getJson("/leaderboard").get("entries");

        // Assert
        assertThat(entries.size()).isZero();
    }

    private String legacyRun() {
        String id = UUID.randomUUID().toString();
        db.update("""
            INSERT INTO runs(id, player_id, alias, created_at, course_version, level_length)
            VALUES (?, ?, ?, ?, ?, ?)
            """, id, UUID.randomUUID().toString(), "Earlier runner", 1, "previous-course", 200);
        return id;
    }
}
