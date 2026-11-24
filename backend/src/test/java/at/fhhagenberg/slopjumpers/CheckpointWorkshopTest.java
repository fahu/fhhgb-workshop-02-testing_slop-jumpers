package at.fhhagenberg.slopjumpers;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.fail;

class CheckpointWorkshopTest extends HttpIntegrationTest {
    @Test
    void theSavedRunShowsTheFirstCheckpointDistance() throws Exception {
        // Arrange
        String runId = start();
        String checkpoint = "/runs/" + runId + "/checkpoints/1";

        // Act
        var response = call("PUT", checkpoint, progress(1500));

        // Assert
        assertThat(response.getStatus()).isEqualTo(200);
        var savedRun = getJson("/runs/" + runId);
        assertThat(savedRun.get("distance").asInt()).isEqualTo(1500);
    }

    @Test
    @Disabled("Exercise 2A. Remove this annotation when you start.")
    void retryingAnIdenticalCheckpointStoresItOnlyOnce() throws Exception {
        fail("Send the same checkpoint twice. Check the receipts and count the stored checkpoints for this run.");
    }

    // Bonus: What else would you like to test?
}
