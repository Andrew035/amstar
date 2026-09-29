package com.amstar.repair;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.amstar.repair.support.IntegrationTest;
import java.util.Base64;
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
    assertEquals("SHOP_VIEW", roleIn(shopViewToken()));
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
    assertTrue(get("/api/repairs/queue", shopViewToken()).isOk());
  }

  @Test
  void shopViewCannotChangeATicket() {
    String admin = adminToken();
    long id = createTicket(admin, "Kane", 3, "2026-12-01");
    String shop = shopViewToken();

    assertForbidden(patch("/api/repairs/" + id + "/status", shop, Map.of("status", "COMPLETED")));
    assertForbidden(patch("/api/repairs/" + id + "/severity", shop, Map.of("severity", 5)));
    assertForbidden(patch("/api/repairs/" + id + "/assign", shop, Map.of("worker", "Max")));
    assertForbidden(
        patch("/api/repairs/" + id + "/due-date", shop, Map.of("dueDate", "2026-12-24")));
    assertForbidden(patch("/api/repairs/" + id + "/customer", shop, Map.of("customerName", "X")));
    assertForbidden(patch("/api/repairs/" + id + "/notes", shop, Map.of("notes", "hello")));
    assertForbidden(patch("/api/repairs/" + id + "/parts", shop, Map.of("parts", "hello")));
    assertForbidden(patch("/api/repairs/" + id + "/pricing", shop, Map.of("retailPrice", 100)));
    assertForbidden(delete("/api/repairs/" + id, shop));

    assertEquals(
        "PENDING", ticketById(admin, id).get("status"), "nothing should have changed on the ticket");
  }

  @Test
  void shopViewCannotCreateATicketOrChangeTheRoster() {
    String shop = shopViewToken();

    assertForbidden(
        post(
            "/api/repairs",
            shop,
            Map.of(
                "customerName", "Nobody",
                "vehicle", Map.of("licensePlate", "ZZZ111", "state", "NY"),
                "serviceType", "OIL CHANGE",
                "severity", 3,
                "expectedCompletionDate", "2026-12-01")));
    assertForbidden(post("/api/technicians", shop, Map.of("fullName", "Sneaky")));
    assertForbidden(patch("/api/technicians/1", shop, Map.of("isActive", false)));
    assertForbidden(patch("/api/services/1", shop, Map.of("isActive", false)));
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
  void shopViewCannotReadNotesOrParts() {
    String admin = adminToken();
    long id = createTicket(admin, "Kane", 3, "2026-12-01");
    patch("/api/repairs/" + id + "/notes", admin, Map.of("notes", "manager only"));
    patch("/api/repairs/" + id + "/parts", admin, Map.of("parts", "valve body VB-9912"));

    assertEquals("manager only", ticketById(admin, id).get("notes"), "a manager still sees them");

    Map<String, Object> asShopFloor = ticketById(shopViewToken(), id);
    assertNull(asShopFloor.get("notes"), "notes must not reach a shop-floor account");
    assertNull(asShopFloor.get("parts"), "parts must not reach a shop-floor account");
  }

  // --- helpers ------------------------------------------------------------

  private String roleIn(String token) {
    String payload = token.split("\\.")[1];
    String json = new String(Base64.getUrlDecoder().decode(payload));
    Matcher matcher = Pattern.compile("\"role\":\"([A-Z_]+)\"").matcher(json);
    return matcher.find() ? matcher.group(1) : null;
  }

  private void assertForbidden(ApiResponse response) {
    assertEquals(
        403,
        response.status(),
        "a shop-floor account must not be able to make this change: " + response.body());
  }
}
