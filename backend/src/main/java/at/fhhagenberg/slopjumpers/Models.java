package at.fhhagenberg.slopjumpers;

import jakarta.validation.constraints.*;
import java.util.List;

public final class Models {
    private Models() {}

    public record Start(@NotBlank @Size(max = 20) String alias,
                        @NotBlank @Pattern(regexp = "[a-fA-F0-9-]{36}") String playerId,
                        @NotBlank @Pattern(regexp = "[A-Z]{2}") String nationalityCode) {}
    public record Progress(@Min(0) @Max(1000000) int distance,
                           @Min(0) @Max(1000000) int tokens,
                           @Min(0) @Max(100000000) long elapsedMs,
                           @Size(max = 32) String collisionId) {}
    public record Run(String id, String playerId, String alias, int distance, int tokens,
                      long elapsedMs, boolean finished, long createdAt,
                      String nationalityCode, String courseVersion, int levelLength,
                      String collisionId) {}
    public record PlayerProfile(String playerId, String alias, String nationalityCode) {}
    public record Receipt(int distance, int checkpoint, boolean duplicate, boolean finished) {}
    public record Nationality(String code, String name) {}
    public record Leader(String alias, int distance, int tokens, Nationality nationality, boolean finished, String collisionId) {}
    public record Leaderboard(long generatedAt, List<Leader> entries) {}
    public record Obstacle(double distance, double width, double height, String slopId) {}
    public record Star(int id, double distance, double height) {}
    public record Level(int number, String courseVersion, int start, int end,
                        List<Obstacle> obstacles, List<Star> stars) {}
}
