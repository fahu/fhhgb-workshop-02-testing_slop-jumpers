package at.fhhagenberg.slopjumpers;

import java.util.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import static at.fhhagenberg.slopjumpers.Models.*;

@Component
public class Nationalities implements ApplicationRunner {
    private final JdbcTemplate db;
    private final List<Nationality> values = Arrays.stream(Locale.getISOCountries())
        .map(code -> new Nationality(code, Locale.of("", code).getDisplayCountry(Locale.ENGLISH)))
        .sorted(Comparator.comparing(Nationality::name)).toList();

    public Nationalities(JdbcTemplate db) {
        this.db = db;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<Object[]> countries = new ArrayList<>();
        for (Nationality nationality : values) {
            countries.add(new Object[]{nationality.code(), nationality.name()});
        }
        countries.add(new Object[]{"ZZ", "Not recorded"});
        db.batchUpdate("MERGE INTO nationalities (code,name) KEY(code) VALUES (?,?)", countries);
    }

    public List<Nationality> list() {
        return values;
    }

    public boolean contains(String code) {
        return values.stream().anyMatch(nationality -> nationality.code().equals(code));
    }
}
