package at.fhhagenberg.slopjumpers;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import static at.fhhagenberg.slopjumpers.Models.*;

@Service
public class Runs {
    private final JdbcTemplate db;
    private final TransactionTemplate tx;
    private final Nationalities nationalities;
    private final Levels levels;

    public Runs(JdbcTemplate db, TransactionTemplate tx, Nationalities nationalities, Levels levels) {
        this.db = db;
        this.tx = tx;
        this.nationalities = nationalities;
        this.levels = levels;
    }

    public Run start(Start input) {
        String alias = input.alias().strip();
        if (alias.isBlank() || alias.codePoints().anyMatch(Character::isISOControl)) {
            throw bad("Use a visible nickname of 1–20 characters.");
        }
        try {
            UUID.fromString(input.playerId());
        } catch (IllegalArgumentException error) {
            throw bad("Invalid player identity.");
        }
        if (!nationalities.contains(input.nationalityCode())) {
            throw bad("Choose a valid nationality.");
        }
        String id = UUID.randomUUID().toString();
        long now = System.currentTimeMillis();
        db.update("INSERT INTO runs(id,player_id,alias,created_at,nationality_code,course_version,level_length) VALUES(?,?,?,?,?,?,?)",
            id, input.playerId(), alias, now, input.nationalityCode(), Levels.VERSION, Levels.LENGTH);

        return get(id);
    }

    public Run get(String id) {
        List<Run> rows = db.query("SELECT * FROM runs WHERE id=?", this::row, id);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Run not found.");
        }
        return rows.getFirst();
    }

    public List<Run> history(String playerId) {
        return db.query("SELECT * FROM runs WHERE player_id=? ORDER BY created_at DESC LIMIT 12", this::row, playerId);
    }

    public PlayerProfile profile(String playerId) {
        try {
            UUID.fromString(playerId);
        } catch (IllegalArgumentException error) {
            throw bad("Invalid player identity.");
        }
        // Run starts already persist the profile; use the latest snapshot, including 0 m runs.
        List<PlayerProfile> rows = db.query("""
            SELECT player_id,alias,nationality_code FROM runs
            WHERE player_id=?
            ORDER BY created_at DESC,id DESC LIMIT 1
            """, (rs, n) -> new PlayerProfile(rs.getString(1), rs.getString(2), rs.getString(3)), playerId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public int personalBest(String playerId) {
        return db.queryForObject("SELECT COALESCE(MAX(distance),0) FROM runs WHERE player_id=? AND course_version=?", Integer.class, playerId, Levels.VERSION);
    }

    public Receipt save(String id, int checkpoint, Progress input, boolean finish) {
        return tx.execute(status -> {
            List<Run> locked = db.query("SELECT * FROM runs WHERE id=? FOR UPDATE", this::row, id);
            if (locked.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Run not found.");
            }
            Run run = locked.getFirst();
            validate(input, run);
            if (input.collisionId() != null && (!finish || !Levels.VERSION.equals(run.courseVersion())
                || !levels.matchesCollision(input.distance(), input.collisionId()))) {
                throw bad("The slop item does not match this collision.");
            }
            if (!finish && (checkpoint < 1 || checkpoint > 5000 || input.distance() != checkpoint * run.levelLength())) {
                throw bad("Progress must match the end of this level.");
            }
            if (!finish) {
                List<Progress> previous = db.query("SELECT distance,tokens,elapsed_ms FROM checkpoints WHERE run_id=? AND checkpoint_no=?",
                    (rs, n) -> new Progress(rs.getInt(1), rs.getInt(2), rs.getLong(3), null), id, checkpoint);
                if (!previous.isEmpty()) {
                    if (!previous.getFirst().equals(input)) {
                        throw conflict("This checkpoint was already saved with different progress.");
                    }
                    return new Receipt(input.distance(), checkpoint, true, false);
                }
            }
            if (run.finished()) {
                if (finish && run.distance() == input.distance() && run.tokens() == input.tokens()
                    && run.elapsedMs() == input.elapsedMs() && Objects.equals(run.collisionId(), input.collisionId())) {
                    return new Receipt(input.distance(), checkpoint, true, true);
                }
                throw conflict("This run has already finished.");
            }
            if (input.distance() < run.distance() || input.tokens() < run.tokens() || input.elapsedMs() < run.elapsedMs()) {
                throw conflict("Progress cannot move backwards.");
            }
            if (!finish) {
                db.update("INSERT INTO checkpoints(run_id,checkpoint_no,distance,tokens,elapsed_ms) VALUES(?,?,?,?,?)",
                    id, checkpoint, input.distance(), input.tokens(), input.elapsedMs());
            }
            db.update("UPDATE runs SET distance=?,tokens=?,elapsed_ms=?,finished=?,collision_id=? WHERE id=?",
                input.distance(), input.tokens(), input.elapsedMs(), finish, input.collisionId(), id);
            return new Receipt(input.distance(), checkpoint, false, finish);
        });
    }

    private void validate(Progress input, Run run) {
        double seconds = input.elapsedMs() / 1000.0;
        double ramp = Math.min(seconds, 87.5);
        double maximumDistance = Levels.VERSION.equals(run.courseVersion())
            ? 60 * ramp + 0.4 * ramp * ramp + Math.max(0, seconds - ramp) * 130
            : 20 * seconds;
        if (input.tokens() > input.distance() || input.distance() > maximumDistance + 30) {
            throw bad("Progress is not plausible for this course.");
        }
    }

    private Run row(ResultSet rs, int n) throws SQLException {
        return new Run(rs.getString("id"), rs.getString("player_id"), rs.getString("alias"),
            rs.getInt("distance"), rs.getInt("tokens"), rs.getLong("elapsed_ms"),
            rs.getBoolean("finished"), rs.getLong("created_at"), rs.getString("nationality_code"),
            rs.getString("course_version"), rs.getInt("level_length"), rs.getString("collision_id"));
    }

    private ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
