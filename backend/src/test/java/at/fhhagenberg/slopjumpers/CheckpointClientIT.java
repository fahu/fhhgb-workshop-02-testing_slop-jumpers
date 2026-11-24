package at.fhhagenberg.slopjumpers;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

/** Hosts the Java API while Vitest exercises the TypeScript client over HTTP. */
@SpringBootTest(webEnvironment = RANDOM_PORT, properties = "server.address=127.0.0.1")
class CheckpointClientIT {
    @LocalServerPort int port;

    @Test
    void runClientTestsAgainstThisServer(@TempDir Path logs) throws Exception {
        var frontend = Path.of("../frontend").toAbsolutePath().normalize();
        var log = logs.resolve("vitest.log");
        var command = new ProcessBuilder(
            "node", "node_modules/vitest/vitest.mjs", "run", "--config", "vitest.live.config.ts"
        ).directory(frontend.toFile()).redirectErrorStream(true).redirectOutput(log.toFile());
        command.environment().put("SLOP_TEST_BACKEND_URL", "http://127.0.0.1:" + port);

        var vitest = command.start();
        try {
            assertTrue(vitest.waitFor(90, TimeUnit.SECONDS), "Vitest did not finish in 90 seconds");
            System.out.print(Files.readString(log));
            assertEquals(0, vitest.exitValue(), "See the Vitest result above");
        } finally {
            vitest.destroyForcibly();
        }
    }
}
