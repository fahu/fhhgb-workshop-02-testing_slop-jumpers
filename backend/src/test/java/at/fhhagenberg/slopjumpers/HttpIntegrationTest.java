package at.fhhagenberg.slopjumpers;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest
abstract class HttpIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired WebApplicationContext context;
    @Autowired JsonMapper json;
    private MockMvc mvc;

    @BeforeEach
    void resetDatabase() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
        db.update("DELETE FROM checkpoints");
        db.update("DELETE FROM runs");
    }

    MockHttpServletResponse call(String method, String path, Object body) throws Exception {
        var request = MockMvcRequestBuilders.request(HttpMethod.valueOf(method), "/api" + path);
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body));
        }
        return mvc.perform(request).andReturn().getResponse();
    }

    JsonNode body(MockHttpServletResponse response) {
        return json.readTree(response.getContentAsByteArray());
    }

    JsonNode getJson(String path) throws Exception {
        var response = call("GET", path, null);
        assertThat(response.getStatus()).as("GET %s", path).isEqualTo(200);
        return body(response);
    }

    void save(String path, Object payload) throws Exception {
        var response = call("PUT", path, payload);
        assertThat(response.getStatus()).as("PUT %s", path).isEqualTo(200);
    }

    int checkpointCount(String runId) {
        return db.queryForObject("SELECT COUNT(*) FROM checkpoints WHERE run_id=?", Integer.class, runId);
    }

    String start() throws Exception {
        return start(UUID.randomUUID().toString());
    }

    String start(String player) throws Exception {
        var response = call("POST", "/runs", Map.of("alias", "Test runner", "playerId", player, "nationalityCode", "AT"));
        assertThat(response.getStatus()).isEqualTo(201);
        return body(response).get("id").asText();
    }

    Map<String, Object> progress(int distance) {
        return Map.of("distance", distance, "tokens", distance / 16, "elapsedMs", distance * 50);
    }
}
