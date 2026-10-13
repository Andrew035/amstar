package com.amstar.repair.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base class for tests that run the whole application against a real PostgreSQL.
 *
 * <p>Real database on purpose: Flyway runs every migration, and {@code ddl-auto=validate} then
 * checks the entities against the schema those migrations produced. A broken migration, or an
 * entity field with no column behind it, fails here instead of on the shop's server.
 *
 * <p>Requests go through the JDK's own HTTP client rather than a Spring test client, so these tests
 * do not break when Spring moves its test helpers between versions.
 *
 * <p>The container is static: one database is started for the whole test run and shared by every
 * subclass. Each test starts from a clean slate - see {@link #resetDatabase()}.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class IntegrationTest {

  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:15-alpine")
          .withDatabaseName("amstar_test")
          .withUsername("test_user")
          .withPassword("test_password");

  static {
    POSTGRES.start();
  }

  @DynamicPropertySource
  static void datasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  protected static final String SIGNUP_CODE = "TEST-SIGNUP-CODE";

  /** An email on the admin allowlist in application.properties. */
  protected static final String ADMIN_EMAIL = "admin@amstar-test.com";

  /** An email on the bookkeeper allowlist in application-test.properties. */
  protected static final String BOOKKEEPER_EMAIL = "floor@amstar-test.com";

  private static final ObjectMapper JSON = new ObjectMapper();

  private static final HttpClient HTTP =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

  @LocalServerPort protected int port;

  @Autowired protected JdbcTemplate jdbc;

  /**
   * Wipes tickets and accounts between tests, but leaves the reference data the migrations seeded
   * (technicians, services) so tests can assign real names.
   */
  @BeforeEach
  void resetDatabase() {
    jdbc.execute(
        "truncate ticket_activity, ticket_services, ticket_technicians, service_tickets,"
            + " vehicles, customers, password_reset_tokens restart identity cascade");
    /*
     * users is DELETEd, not TRUNCATEd, and that is load-bearing.
     *
     * V20 gave technicians a `user_id` referencing users. TRUNCATE ... CASCADE
     * follows every foreign key pointing at the table unconditionally - rows or
     * no rows - so including users in the list above silently truncated
     * technicians with it and wiped the seeded roster that almost every test
     * depends on. DELETE honours `on delete set null` instead: the roster
     * survives with its account links cleared, which is the state a fresh test
     * wants. password_reset_tokens is emptied above, so nothing blocks this.
     */
    jdbc.execute("delete from users");
    jdbc.execute("alter table users alter column id restart with 1");
  }

  // --- talking to the API -------------------------------------------------

  /** One HTTP response: the status code plus the body, parsed on demand. */
  public record ApiResponse(int status, String body) {

    public boolean isOk() {
      return status >= 200 && status < 300;
    }

    public boolean isClientError() {
      return status >= 400 && status < 500;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> asMap() {
      return read(Map.class);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> asList() {
      return read(List.class);
    }

    private <T> T read(Class<T> type) {
      try {
        return JSON.readValue(body, type);
      } catch (Exception e) {
        throw new AssertionError("expected JSON, got: " + body, e);
      }
    }
  }

  protected ApiResponse send(String method, String path, String token, Object body) {
    try {
      HttpRequest.BodyPublisher payload =
          body == null
              ? HttpRequest.BodyPublishers.noBody()
              : HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body));

      HttpRequest.Builder request =
          HttpRequest.newBuilder()
              .uri(URI.create("http://localhost:" + port + path))
              .timeout(Duration.ofSeconds(20))
              .header("Content-Type", "application/json")
              .method(method, payload);
      if (token != null) {
        request.header("Authorization", "Bearer " + token);
      }

      HttpResponse<String> response =
          HTTP.send(request.build(), HttpResponse.BodyHandlers.ofString());
      return new ApiResponse(response.statusCode(), response.body());
    } catch (Exception e) {
      throw new AssertionError(method + " " + path + " could not be sent", e);
    }
  }

  protected ApiResponse get(String path, String token) {
    return send("GET", path, token, null);
  }

  protected ApiResponse post(String path, String token, Object body) {
    return send("POST", path, token, body);
  }

  protected ApiResponse patch(String path, String token, Object body) {
    return send("PATCH", path, token, body);
  }

  protected ApiResponse delete(String path, String token) {
    return send("DELETE", path, token, null);
  }

  // --- accounts and tickets -----------------------------------------------

  protected String adminToken() {
    return tokenFor(ADMIN_EMAIL);
  }

  /**
   * The address an invited technician gets. Deliberately on neither allowlist: a technician cannot
   * self-register, the invite is the authorization.
   */
  protected static final String TECHNICIAN_EMAIL = "tech@amstar-test.com";

  /**
   * A signed-in TECHNICIAN, created the only way one can be.
   *
   * <p>Walks the real path rather than inserting a row: an admin invites the first name on the
   * roster, the invite is redeemed, and the account signs in. The raw token exists only in the
   * email, and nothing is listening on the test SMTP port, so it is planted as its SHA-256 digest -
   * exactly what sendInvite stores - and redeemed through the public endpoint.
   *
   * @return a bearer token for an active TECHNICIAN account
   */
  protected String technicianToken() {
    String admin = adminToken();
    long rosterId = firstTechnicianId(admin);
    ApiResponse invited =
        post(
            "/api/technicians/" + rosterId + "/invite",
            admin,
            Map.of("email", TECHNICIAN_EMAIL, "role", "TECHNICIAN"));
    if (!invited.isOk()) {
      throw new AssertionError("could not invite a technician: " + invited.body());
    }

    String raw = plantCredentialToken(TECHNICIAN_EMAIL, "INVITE");
    ApiResponse accepted =
        post("/api/auth/accept-invite", null, Map.of("token", raw, "password", "Password123"));
    if (!accepted.isOk()) {
      throw new AssertionError("could not accept the invite: " + accepted.body());
    }

    ApiResponse login =
        post(
            "/api/auth/login",
            null,
            Map.of("email", TECHNICIAN_EMAIL, "password", "Password123"));
    Object token = login.asMap().get("token");
    if (token == null) {
      throw new AssertionError("invited technician could not sign in: " + login.body());
    }
    return (String) token;
  }

  /** The id of the first seeded roster entry, which the invite tests attach accounts to. */
  protected long firstTechnicianId(String token) {
    List<Map<String, Object>> roster = get("/api/technicians", token).asList();
    if (roster.isEmpty()) {
      throw new AssertionError("the seeded roster is empty");
    }
    return ((Number) roster.get(0).get("id")).longValue();
  }

  /**
   * Stores a credential token for an address and hands back the raw value.
   *
   * <p>The app only ever persists the digest, so a test that needs a working link has to plant one.
   * `purpose` is RESET or INVITE; the two are not interchangeable by design.
   */
  protected String plantCredentialToken(String email, String purpose) {
    String raw = purpose.toLowerCase() + "-" + System.nanoTime();
    String digest;
    try {
      digest =
          java.util.HexFormat.of()
              .formatHex(
                  java.security.MessageDigest.getInstance("SHA-256")
                      .digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new AssertionError("SHA-256 unavailable", e);
    }
    jdbc.update(
        "insert into password_reset_tokens (user_id, token_hash, expires_at, purpose) "
            + "values ((select id from users where email = ?), ?, now() + interval '30 minutes', ?)",
        email,
        digest,
        purpose);
    return raw;
  }

  protected String bookkeeperToken() {
    return tokenFor(BOOKKEEPER_EMAIL);
  }

  private String tokenFor(String email) {
    post(
        "/api/auth/register",
        null,
        Map.of("email", email, "password", "Password123", "signupCode", SIGNUP_CODE));

    ApiResponse login =
        post("/api/auth/login", null, Map.of("email", email, "password", "Password123"));
    Object token = login.asMap().get("token");
    if (token == null) {
      throw new AssertionError("could not sign in as " + email + ": " + login.body());
    }
    return (String) token;
  }

  /** Creates a ticket and returns its id. */
  protected long createTicket(String token, String customer, int severity, String dueDate) {
    ApiResponse created =
        post(
            "/api/repairs",
            token,
            Map.of(
                "customerName",
                customer,
                "vehicle",
                Map.of(
                    "licensePlate", "T" + (System.nanoTime() % 100000),
                    "state", "NY",
                    "make", "FORD",
                    "model", "E-250",
                    "year", 2010),
                "serviceType",
                "OIL CHANGE",
                "severity",
                severity,
                "expectedCompletionDate",
                dueDate,
                "assignedWorker",
                "Max",
                "status",
                "PENDING"));

    if (!created.isOk()) {
      throw new AssertionError("could not create a test ticket: " + created.body());
    }
    return ((Number) created.asMap().get("id")).longValue();
  }

  /** The ticket as the queue returns it. */
  protected Map<String, Object> ticketById(String token, long id) {
    return get("/api/repairs/queue", token).asList().stream()
        .filter(t -> ((Number) t.get("id")).longValue() == id)
        .findFirst()
        .orElseThrow(() -> new AssertionError("ticket " + id + " is missing from the queue"));
  }

  protected List<String> activityActions(String token) {
    return get("/api/activity", token).asList().stream()
        .map(row -> String.valueOf(row.get("action")))
        .toList();
  }
}
