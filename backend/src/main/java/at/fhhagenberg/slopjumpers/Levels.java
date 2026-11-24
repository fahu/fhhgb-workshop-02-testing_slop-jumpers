package at.fhhagenberg.slopjumpers;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import static at.fhhagenberg.slopjumpers.Models.*;

@Component
public class Levels {
    public static final String VERSION = "slop-v1";
    public static final int LENGTH = 1500;
    private static final int MAX_LEVEL = 666;
    private static final int[] POSITIONS = {180, 285, 395, 505, 615, 725, 835, 945, 1055, 1165, 1275, 1385};

    private final List<String> originalSlopIds;
    private final List<String> courseOrder;

    public Levels(JsonMapper json) throws IOException {
        var ids = new ArrayList<String>();
        try (var resource = new ClassPathResource("slop-items.json").getInputStream()) {
            for (var item : json.readTree(resource)) {
                ids.add(item.get("id").asText());
            }
        }
        if (ids.size() < POSITIONS.length || ids.stream().distinct().count() != ids.size()) {
            throw new IllegalStateException("The catalogue needs enough unique slop items to fill a belt.");
        }
        // The catalogue keeps the original twelve in their former order for save retries.
        originalSlopIds = List.copyOf(ids.subList(0, POSITIONS.length));
        // Keep the familiar first two jumps, then bring the new items to the front of the course.
        Collections.rotate(ids.subList(2, ids.size()), 2 - POSITIONS.length);
        courseOrder = List.copyOf(ids);
    }

    /** Each belt takes its next twelve items from the catalogue sequence. */
    public Level get(int number) {
        if (number < 1 || number > MAX_LEVEL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid level number.");
        }
        int start = (number - 1) * LENGTH;
        List<Star> stars = new ArrayList<>();
        for (int offset = 60, i = 0; offset < LENGTH - 30; offset += 60, i++) {
            boolean nearObstacle = false;
            for (int position : POSITIONS) {
                nearObstacle |= Math.abs(position - offset) < 25;
            }
            stars.add(new Star(i, start + offset, nearObstacle || i % 3 == 0 ? 106 : 14));
        }
        return new Level(number, VERSION, start, start + LENGTH, obstacles(number), stars);
    }

    public boolean matchesCollision(int distance, String collisionId) {
        int level = distance / LENGTH + 1;
        if (level > MAX_LEVEL) {
            return false;
        }
        for (int slot = 0; slot < POSITIONS.length; slot++) {
            Obstacle obstacle = obstacle(level, slot);
            double reach = obstacle.width() / 2 + 2;
            // The browser rounds down to whole metres, so accept the corresponding metre interval.
            if (distance + 1 > obstacle.distance() - reach && distance < obstacle.distance() + reach) {
                String original = originalSlopIds.get((slot + level - 1) % originalSlopIds.size());
                return obstacle.slopId().equals(collisionId) || original.equals(collisionId);
            }
        }
        return false;
    }

    List<Obstacle> obstacles(int number) {
        List<Obstacle> obstacles = new ArrayList<>();
        for (int i = 0; i < POSITIONS.length; i++) {
            obstacles.add(obstacle(number, i));
        }
        return obstacles;
    }

    private Obstacle obstacle(int number, int slot) {
        int start = (number - 1) * LENGTH;
        int itemIndex = ((number - 1) * POSITIONS.length + slot) % courseOrder.size();
        return new Obstacle(start + POSITIONS[slot], 4 + slot % 3, 27 + (slot % 3) * 6, courseOrder.get(itemIndex));
    }
}
