package com.amstar.repair;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.amstar.repair.support.IntegrationTest;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * Who may do what.
 *
 * <p>The frontend hides manager-only controls, but a hidden button is not security. These tests
 * call the API directly, the way anyone with a browser console could, and fail if a shop-floor
 * account can ever change a ticket, the roster, or the service catalog.
 */
public class SecurityRulesTest extends IntegrationTest {

  @Test
  void registeringRequiresTheShopSignupCode() {
    ApiResponse response =
        post(
            "/api/auth/register",
            null,
            Map.of("email", "stranger@example.com", "password", "Password123", "signupCode", "no"));

    assertEquals(400, response.status());
  }

  @Test
  void aShortPasswordIsRefused() {
    ApiResponse response =
        post(
            "/api/auth/register",
            null,
            Map.of("email", "short@example.com", "password", "pass", "signupCode", SIGNUP_CODE));

    assertEquals(400, response.status());
  }

  @Test
  void theEmailAllowlistDecidesWhoIsAManager() {
    assertEquals("ADMIN", roleIn(adminToken()));
    assertEquals("BOOKKEEPER", roleIn(bookkeeperToken()));
  }

  @Test
  void anUnlistedEmailCannotRegisterEvenWithTheCode() {
    ApiResponse response =
        post(
            "/api/auth/register",
            null,
            Map.of(
                "email", "stranger@example.com",
                "password", "Password123",
                "signupCode", SIGNUP_CODE));

    assertEquals(400, response.status());
    assertEquals(
        "Invalid signup code",
        response.asMap().get("error"),
        "the message must not reveal that the code was right and the address wrong");
  }

  @Test
  void nothingIsReadableWithoutSigningIn() {
    for (String path :
        new String[] {"/api/repairs/queue", "/api/technicians", "/api/services", "/api/activity"}) {
      ApiResponse response = get(path, null);
      assertTrue(
          response.isClientError(),
          path + " must not be readable without signing in, got " + response.status());
    }
  }

  @Test
  void aTamperedTokenIsRejected() {
    String token = adminToken();
    String tampered = token.substring(0, token.lastIndexOf('.') + 1) + "not-the-real-signature";

    assertEquals(401, get("/api/repairs/queue", tampered).status());
  }

  @Test
  void shopViewCanReadTheQueue() {
    assertTrue(get("/api/repairs/queue", bookkeeperToken()).isOk());
  }

  /**
   * Both roles run the shop floor. This used to assert the opposite for every one
   * of these paths; the shop decided the bookkeeper does the same work on a
   * ticket that an owner does, so the assertions are inverted on purpose.
   */
  @Test
  void theBookkeeperHasTheSameAuthorityOverATicketAsAnAdmin() {
    String admin = adminToken();
    long id = createTicket(admin, "Kane", 3, "2026-12-01");
    String books = bookkeeperToken();

    assertOk(patch("/api/repairs/" + id + "/status", books, Map.of("status", "IN_PROGRESS")));
    assertOk(patch("/api/repairs/" + id + "/severity", books, Map.of("severity", 5)));
    assertOk(patch("/api/repairs/" + id + "/assign", books, Map.of("worker", "Max")));
    assertOk(patch("/api/repairs/" + id + "/due-date", books, Map.of("dueDate", "2026-12-24")));
    assertOk(patch("/api/repairs/" + id + "/customer", books, Map.of("customerName", "Kane Ruiz")));
    assertOk(patch("/api/repairs/" + id + "/notes", books, Map.of("notes", "hello")));
    assertOk(patch("/api/repairs/" + id + "/parts", books, Map.of("parts", "valve body")));
    // Labor as well as the parts: she prices the whole job from the queue modal.
    assertOk(patch("/api/repairs/" + id + "/pricing", books, Map.of("laborPrice", 420)));
    assertOk(
        patch(
            "/api/repairs/" + id + "/line-items",
            books,
            Map.of(
                "items",
                List.of(Map.of("description", "VALVE BODY", "unitPrice", 318.40, "quantity", 1)))));

    Map<String, Object> after = ticketById(admin, id);
    assertEquals("IN_PROGRESS", after.get("status"));
    assertEquals(5, after.get("severity"));
    assertEquals("hello", after.get("notes"));

    assertOk(delete("/api/repairs/" + id, books));
  }

  @Test
  void theBookkeeperMayCreateTicketsAndManageTheRoster() {
    String books = bookkeeperToken();

    assertOk(
        post(
            "/api/repairs",
            books,
            Map.of(
                "customerName", "Ingrid Solheim",
                "vehicle", Map.of("licensePlate", "ZZZ111", "state", "NY"),
                "serviceType", "OIL CHANGE",
                "severity", 3,
                "expectedCompletionDate", "2026-12-01")));
    assertOk(post("/api/technicians", books, Map.of("fullName", "Rosalind Okafor")));
  }

  /**
   * The one thing she cannot do. Scoped to the Invoices page's own action, which
   * she has no UI for. Not a hard boundary - /status reaches COMPLETED too - so
   * this pins the rule, not a security guarantee.
   */
  @Test
  void onlyAnAdminMayMarkATicketInvoiced() {
    String admin = adminToken();
    long id = createTicket(admin, "Dalisay", 3, "2026-12-01");
    assertOk(patch("/api/repairs/" + id + "/status", admin, Map.of("status", "READY_FOR_INVOICE")));

    assertForbidden(patch("/api/repairs/" + id + "/invoiced", bookkeeperToken(), null));
    assertEquals("READY_FOR_INVOICE", ticketById(admin, id).get("status"));

    assertOk(patch("/api/repairs/" + id + "/invoiced", admin, null));
    assertEquals("COMPLETED", ticketById(admin, id).get("status"));
  }

  @Test
  void aDeactivatedAccountCannotSignIn() {
    adminToken(); // registers the account
    jdbc.update("update users set is_active = false where email = ?", ADMIN_EMAIL);

    ApiResponse login =
        post("/api/auth/login", null, Map.of("email", ADMIN_EMAIL, "password", "Password123"));

    assertEquals(401, login.status());
  }

  @Test
  void theWrongPasswordIsRejected() {
    adminToken();

    assertEquals(
        401,
        post("/api/auth/login", null, Map.of("email", ADMIN_EMAIL, "password", "wrong")).status());
  }

  @Test
  void forgotPasswordNeverRevealsWhoHasAnAccount() {
    adminToken();

    ApiResponse known = post("/api/auth/forgot-password", null, Map.of("email", ADMIN_EMAIL));
    ApiResponse unknown =
        post("/api/auth/forgot-password", null, Map.of("email", "nobody@example.com"));

    assertEquals(known.status(), unknown.status());
    assertEquals(known.body(), unknown.body());
  }

  @Test
  void passwordsAreNeverStoredInPlainText() {
    adminToken();

    String hash =
        jdbc.queryForObject(
            "select password_hash from users where email = ?", String.class, ADMIN_EMAIL);

    assertFalse(hash.contains("Password123"), "the password must not be recoverable from the row");
    assertTrue(hash.startsWith("$2"), "expected a BCrypt hash, got: " + hash);
  }

  @Test
  void shopViewCannotReadNotesPartsOrPrices() {
    String admin = adminToken();
    long id = createTicket(admin, "Kane", 3, "2026-12-01");
    patch("/api/repairs/" + id + "/notes", admin, Map.of("notes", "manager only"));
    patch("/api/repairs/" + id + "/parts", admin, Map.of("parts", "valve body VB-9912"));
    patch(
        "/api/repairs/" + id + "/line-items",
        admin,
        Map.of(
            "items",
            List.of(Map.of("description", "FRONT ROTORS", "unitPrice", 254.06, "quantity", 1))));

    assertEquals("manager only", ticketById(admin, id).get("notes"), "a manager still sees them");

    // This assertion is the inverse of what it was before the role rename. She
    // cannot write the invoice without the breakdown, so the bookkeeper sits
    // inside the billing boundary rather than outside it.
    Map<String, Object> asBookkeeper = ticketById(bookkeeperToken(), id);
    assertEquals("manager only", asBookkeeper.get("notes"), "she writes the invoice from these");
    assertEquals("valve body VB-9912", asBookkeeper.get("parts"));
    assertEquals(
        1,
        ((List<?>) asBookkeeper.get("lineItems")).size(),
        "line items are the invoice; she has to see them");
  }

  /**
   * The documented way to change someone's role: a SQL update plus a token_version bump. Pinned as
   * a test because the bump is the half that is easy to forget, and forgetting it leaves a demoted
   * account holding admin authority until its token expires up to ten hours later.
   */
  @Test
  void demotingAnAdminToBookkeeperTakesEffectImmediately() {
    String oldToken = adminToken();
    long id = createTicket(oldToken, "Rosalind", 3, "2026-12-01");
    assertEquals("ADMIN", roleIn(oldToken));

    jdbc.update(
        "update users set role = 'BOOKKEEPER', token_version = token_version + 1 where email = ?",
        ADMIN_EMAIL);

    // The bump is what makes it immediate: JwtAuthenticationFilter compares the
    // token's tv claim against the row on every single request.
    assertEquals(
        401,
        get("/api/repairs/queue", oldToken).status(),
        "the old admin token must stop working the moment the role changes");

    ApiResponse login =
        post("/api/auth/login", null, Map.of("email", ADMIN_EMAIL, "password", "Password123"));
    assertTrue(login.isOk(), "the account still exists and the password is unchanged");
    String newToken = (String) login.asMap().get("token");

    assertEquals("BOOKKEEPER", roleIn(newToken));
    assertForbidden(patch("/api/repairs/" + id + "/invoiced", newToken, null));
    assertTrue(get("/api/repairs/queue", newToken).isOk(), "she can still read the queue");
  }

  @Test
  void theBookkeeperPricesPartsAndLabor() {
    String admin = adminToken();
    long id = createTicket(admin, "Dalisay", 3, "2026-12-01");
    String books = bookkeeperToken();

    // Her write: the parts, with a cost each, from the modal on the queue.
    assertTrue(
        patch(
                "/api/repairs/" + id + "/line-items",
                books,
                Map.of(
                    "items",
                    List.of(
                        Map.of("description", "VALVE BODY", "unitPrice", 318.40, "quantity", 1))))
            .isOk(),
        "the bookkeeper enters the parts");
    assertEquals(1, ((List<?>) ticketById(admin, id).get("lineItems")).size());

    // Labor too: the modal on the queue prices the whole job.
    assertOk(patch("/api/repairs/" + id + "/pricing", books, Map.of("laborPrice", 500)));
    assertEquals(818.40, ticketById(admin, id).get("invoiceTotal"));
  }

  // --- helpers ------------------------------------------------------------

  private String roleIn(String token) {
    String payload = token.split("\\.")[1];
    String json = new String(Base64.getUrlDecoder().decode(payload));
    Matcher matcher = Pattern.compile("\"role\":\"([A-Z_]+)\"").matcher(json);
    return matcher.find() ? matcher.group(1) : null;
  }

  private void assertOk(ApiResponse response) {
    assertTrue(
        response.isOk(), "expected this to be allowed, got " + response.status() + " " + response.body());
  }

  private void assertForbidden(ApiResponse response) {
    assertEquals(
        403,
        response.status(),
        "this must be refused for a bookkeeper account: " + response.body());
  }
}
