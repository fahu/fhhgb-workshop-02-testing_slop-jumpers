package at.fhhagenberg.slopjumpers;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static at.fhhagenberg.slopjumpers.Models.*;

@Repository
public class LeaderboardQuery {
    private final JdbcTemplate db;

    public LeaderboardQuery(JdbcTemplate db) {
        this.db = db;
    }

    public Leaderboard load() {
        List<Leader> entries = db.query("""
            SELECT r.alias, r.distance, r.tokens, n.code, n.name, r.finished, r.collision_id
            FROM (
                SELECT runs.*, ROW_NUMBER() OVER (
                    PARTITION BY player_id ORDER BY distance DESC, tokens DESC, created_at DESC, id DESC
                ) AS rank_for_player
                FROM runs WHERE distance > 0 AND course_version = ?
            ) r
            JOIN nationalities n ON n.code = r.nationality_code
            WHERE r.rank_for_player = 1
            ORDER BY r.distance DESC, r.tokens DESC, r.id
            LIMIT 8
            """, (rs, index) -> new Leader(rs.getString("alias"), rs.getInt("distance"), rs.getInt("tokens"),
                new Nationality(rs.getString("code"), rs.getString("name")),
                rs.getBoolean("finished"), rs.getString("collision_id")), Levels.VERSION);
        return new Leaderboard(System.currentTimeMillis(), entries);
    }
}
