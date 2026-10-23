package com.amstar.repair;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.amstar.repair.support.IntegrationTest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
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
   * Both roles run the shop floor. This used to assert the opposite for every one of these paths;
   * the shop decided the bookkeeper does the same work on a ticket that an owner does, so the
   * assertions are inverted on purpose.
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
   * The one thing she cannot do. Scoped to the Invoices page's own action, which she has no UI for.
   * Not a hard boundary - /status reaches COMPLETED too - so this pins the rule, not a security
   * guarantee.
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
        response.isOk(),
        "expected this to be allowed, got " + response.status() + " " + response.body());
  }

  /**
   * A password reset is the shop's "lock them out" action, and the only one a manager can actually
   * reach - sign-out-everywhere has no button. Without the token_version bump in
   * PasswordResetService.resetPassword, a token stolen before the reset keeps authenticating for up
   * to ten more hours, because tv is the only revocation the JWT filter checks.
   */
  @Test
  void aPasswordResetKillsTokensIssuedBeforeIt() throws Exception {
    String stolenToken = adminToken();
    assertTrue(get("/api/repairs/queue", stolenToken).isOk(), "the token works before the reset");

    // The raw token only ever exists in the email, so plant a known one the way
    // requestReset does: a SHA-256 hex digest in password_reset_tokens.
    String rawToken = "reset-regression-" + System.nanoTime();
    String tokenHash =
        HexFormat.of()
            .formatHex(
                MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8)));
    jdbc.update(
        "insert into password_reset_tokens (user_id, token_hash, expires_at) "
            + "values ((select id from users where email = ?), ?, now() + interval '30 minutes')",
        ADMIN_EMAIL,
        tokenHash);

    ApiResponse reset =
        post(
            "/api/auth/reset-password",
            null,
            Map.of("token", rawToken, "password", "BrandNewPassword456"));
    assertTrue(reset.isOk(), "the planted token should be redeemable: " + reset.body());

    assertEquals(
        401,
        get("/api/repairs/queue", stolenToken).status(),
        "a token issued before the reset must stop working the moment the password changes");

    ApiResponse login =
        post(
            "/api/auth/login",
            null,
            Map.of("email", ADMIN_EMAIL, "password", "BrandNewPassword456"));
    assertTrue(login.isOk(), "the new password must work: " + login.body());
    assertTrue(
        get("/api/repairs/queue", (String) login.asMap().get("token")).isOk(),
        "and the freshly issued token must carry the new token_version");
  }

  // --- the role hierarchy -------------------------------------------------

  /**
   * The grant matrix, all nine actor/target pairs.
   *
   * <p>The rule is "strictly below your own", which is what stops the hierarchy being able to widen
   * itself: no role can mint its own rank, so a single compromised account cannot multiply. ADMIN
   * is the one nobody can hand out, which is why a second owner stays a deliberate manual job - the
   * allowlist plus the documented SQL.
   */
  @Test
  void aRoleCanOnlyBeGrantedBelowYourOwn() {
    String admin = adminToken();
    String bookkeeper = bookkeeperToken();
    String technician = technicianToken();
    long rosterId = firstTechnicianId(admin);

    // A technician cannot reach the roster's writes at all: SecurityConfig
    // stops them before any hierarchy check runs.
    for (String role : List.of("ADMIN", "BOOKKEEPER", "TECHNICIAN")) {
      assertForbidden(
          patch("/api/technicians/" + rosterId + "/role", technician, Map.of("role", role)));
    }

    // Nobody mints an admin. 400 rather than 403 for both: the actor is allowed
    // to act on this person, they have asked for a role that cannot be handed
    // out. 403 is reserved for "not your person to touch", below.
    assertEquals(
        400,
        patch("/api/technicians/" + rosterId + "/role", admin, Map.of("role", "ADMIN")).status(),
        "an admin must not be able to create another admin");
    assertEquals(
        400,
        patch("/api/technicians/" + rosterId + "/role", bookkeeper, Map.of("role", "ADMIN"))
            .status(),
        "a bookkeeper must not be able to create an admin");

    // A bookkeeper cannot mint her own rank, but may appoint a technician.
    assertEquals(
        400,
        patch("/api/technicians/" + rosterId + "/role", bookkeeper, Map.of("role", "BOOKKEEPER"))
            .status(),
        "a bookkeeper must not be able to create another bookkeeper");
    assertTrue(
        patch("/api/technicians/" + rosterId + "/role", bookkeeper, Map.of("role", "TECHNICIAN"))
            .isOk(),
        "a bookkeeper may appoint a technician");

    // An admin may do both of the ranks below.
    assertTrue(
        patch("/api/technicians/" + rosterId + "/role", admin, Map.of("role", "BOOKKEEPER")).isOk(),
        "an admin may appoint a bookkeeper");

    // ...and now that the target IS a bookkeeper, an equal rank cannot touch them.
    assertForbidden(
        patch("/api/technicians/" + rosterId + "/role", bookkeeper, Map.of("role", "TECHNICIAN")));
  }

  /** Your own rank is never strictly below your own, and the message should say so. */
  @Test
  void nobodyCanChangeTheirOwnRole() {
    String admin = adminToken();
    long rosterId = firstTechnicianId(admin);
    // Point a roster entry at the admin's own account, the way an invite would.
    jdbc.update(
        "update technicians set user_id = (select id from users where email = ?) where id = ?",
        ADMIN_EMAIL,
        rosterId);

    ApiResponse response =
        patch("/api/technicians/" + rosterId + "/role", admin, Map.of("role", "BOOKKEEPER"));

    assertEquals(400, response.status(), "body was: " + response.body());
    assertEquals("You cannot change your own role.", response.asMap().get("error"));
  }

  /**
   * A demotion has to bite on the next request, not when the token expires.
   *
   * <p>Same mechanism as the manual SQL path: changeRole bumps token_version, which is the only
   * revocation JwtAuthenticationFilter checks. Without the bump the account would keep the
   * authority it just lost for up to ten hours.
   */
  @Test
  void changingARoleInvalidatesTheTokenItWasHolding() {
    String admin = adminToken();
    String technician = technicianToken();
    long rosterId = firstTechnicianId(admin);

    assertTrue(get("/api/repairs/queue", technician).isOk(), "the token works before the change");

    assertTrue(
        patch("/api/technicians/" + rosterId + "/role", admin, Map.of("role", "BOOKKEEPER")).isOk(),
        "the admin may promote a technician to bookkeeper");

    assertEquals(
        401,
        get("/api/repairs/queue", technician).status(),
        "the old token must stop working the moment the role changes");
  }

  /** A roster entry with no account has no role to change. */
  @Test
  void aRosterEntryWithNoAccountCannotBeGivenARole() {
    String admin = adminToken();
    long rosterId = firstTechnicianId(admin);

    ApiResponse response =
        patch("/api/technicians/" + rosterId + "/role", admin, Map.of("role", "TECHNICIAN"));

    assertEquals(400, response.status(), "body was: " + response.body());
    assertTrue(
        String.valueOf(response.asMap().get("error")).contains("does not have an account"),
        "the message should send the manager to the invite: " + response.body());
  }

  // --- linking an account that already exists -----------------------------

  /**
   * The migration case: an account that predates the roster being able to hold one.
   *
   * <p>Inviting them cannot work - the address is taken, correctly - so without this their login
   * and their name on the roster stay two unrelated records.
   */
  @Test
  void anExistingAccountCanBeLinkedToARosterEntry() {
    String admin = adminToken();
    bookkeeperToken(); // the account exists, and predates any roster link
    long rosterId = firstTechnicianId(admin);

    assertEquals(
        400,
        post(
                "/api/technicians/" + rosterId + "/invite",
                admin,
                Map.of("email", BOOKKEEPER_EMAIL, "role", "TECHNICIAN"))
            .status(),
        "inviting a taken address must be refused, which is why linking exists");

    assertTrue(
        patch("/api/technicians/" + rosterId + "/account", admin, Map.of("email", BOOKKEEPER_EMAIL))
            .isOk(),
        "an admin may link a bookkeeper's existing account");

    assertEquals(
        "BOOKKEEPER",
        rosterEntry(admin, rosterId).get("role"),
        "the roster now shows the role that account already had");
  }

  /** One account, one roster entry - the partial unique index, with a readable message. */
  @Test
  void anAccountCannotBeLinkedToTwoPeople() {
    String admin = adminToken();
    bookkeeperToken();
    List<Map<String, Object>> roster = get("/api/technicians", admin).asList();
    long first = ((Number) roster.get(0).get("id")).longValue();
    long second = ((Number) roster.get(1).get("id")).longValue();

    assertTrue(
        patch("/api/technicians/" + first + "/account", admin, Map.of("email", BOOKKEEPER_EMAIL))
            .isOk());

    ApiResponse twice =
        patch("/api/technicians/" + second + "/account", admin, Map.of("email", BOOKKEEPER_EMAIL));
    assertEquals(400, twice.status(), "body was: " + twice.body());
    assertTrue(
        String.valueOf(twice.asMap().get("error")).contains("already linked"),
        "the message should name who holds it: " + twice.body());
  }

  /**
   * Linking obeys the hierarchy, with one deliberate exception: yourself.
   *
   * <p>An owner who also turns a wrench has to be able to put their own name on the roster, and
   * their own rank is never strictly below their own. They still cannot reach the other owner,
   * which is the same rule that stops two admins editing each other.
   */
  @Test
  void linkingIsBoundByTheHierarchyExceptForYourself() {
    String admin = adminToken();
    String bookkeeper = bookkeeperToken();
    List<Map<String, Object>> roster = get("/api/technicians", admin).asList();
    long first = ((Number) roster.get(0).get("id")).longValue();
    long second = ((Number) roster.get(1).get("id")).longValue();

    // A bookkeeper cannot reach an admin's account.
    assertForbidden(
        patch("/api/technicians/" + first + "/account", bookkeeper, Map.of("email", ADMIN_EMAIL)));

    // An admin may link their own.
    assertTrue(
        patch("/api/technicians/" + first + "/account", admin, Map.of("email", ADMIN_EMAIL)).isOk(),
        "an admin may link their own account to their own name");

    // A bookkeeper may link her own too.
    assertTrue(
        patch(
                "/api/technicians/" + second + "/account",
                bookkeeper,
                Map.of("email", BOOKKEEPER_EMAIL))
            .isOk(),
        "a bookkeeper may link her own account");
  }

  /** Unlinking leaves the account and the roster entry both standing. */
  @Test
  void unlinkingKeepsBothSides() {
    String admin = adminToken();
    bookkeeperToken();
    long rosterId = firstTechnicianId(admin);
    patch("/api/technicians/" + rosterId + "/account", admin, Map.of("email", BOOKKEEPER_EMAIL));

    assertTrue(delete("/api/technicians/" + rosterId + "/account", admin).isOk());

    assertNull(rosterEntry(admin, rosterId).get("role"), "the roster entry has no account again");
    assertTrue(
        post("/api/auth/login", null, Map.of("email", BOOKKEEPER_EMAIL, "password", "Password123"))
            .isOk(),
        "the account itself is untouched");
  }

  /** A typo should say so rather than fail silently. */
  @Test
  void linkingAnAddressWithNoAccountIsRefused() {
    String admin = adminToken();
    long rosterId = firstTechnicianId(admin);

    ApiResponse response =
        patch(
            "/api/technicians/" + rosterId + "/account",
            admin,
            Map.of("email", "nobody@amstar-test.com"));

    assertEquals(400, response.status(), "body was: " + response.body());
    assertTrue(String.valueOf(response.asMap().get("error")).contains("No account"));
  }

  private Map<String, Object> rosterEntry(String token, long id) {
    return get("/api/technicians", token).asList().stream()
        .filter(t -> ((Number) t.get("id")).longValue() == id)
        .findFirst()
        .orElseThrow(() -> new AssertionError("roster entry " + id + " is missing"));
  }

  // --- revoking access ----------------------------------------------------

  /**
   * The gap this endpoint closes: "Remove from roster" never touched the account.
   *
   * <p>Taking someone off the roster hides them from the assignment lists and nothing more, so a
   * bookkeeper who left the shop kept full write access until somebody ran SQL. This pins both
   * halves - that removal alone does NOT revoke, and that revoking does.
   */
  @Test
  void removingSomeoneFromTheRosterDoesNotRevokeTheirSignIn() {
    String admin = adminToken();
    String technician = technicianToken();
    long rosterId = firstTechnicianId(admin);

    assertTrue(
        patch("/api/technicians/" + rosterId, admin, Map.of("isActive", false)).isOk(),
        "take them off the roster");

    assertTrue(
        get("/api/repairs/queue", technician).isOk(),
        "removal is not revocation - the account still works, which is why /account/active exists");
  }

  /** Revoking bites on the very next request, not when the token expires. */
  @Test
  void revokingAnAccountEndsItsSessionImmediately() {
    String admin = adminToken();
    String technician = technicianToken();
    long rosterId = firstTechnicianId(admin);

    assertTrue(get("/api/repairs/queue", technician).isOk(), "works before the revoke");

    assertTrue(
        patch("/api/technicians/" + rosterId + "/account/active", admin, Map.of("active", false))
            .isOk());

    assertEquals(
        401,
        get("/api/repairs/queue", technician).status(),
        "is_active and the token_version bump together must end the session now");

    assertTrue(
        post("/api/auth/login", null, Map.of("email", TECHNICIAN_EMAIL, "password", "Password123"))
            .isClientError(),
        "and they cannot simply sign in again");
  }

  /** Restoring puts them back, so a mistake is recoverable without SQL. */
  @Test
  void aRevokedAccountCanBeRestored() {
    String admin = adminToken();
    technicianToken();
    long rosterId = firstTechnicianId(admin);

    patch("/api/technicians/" + rosterId + "/account/active", admin, Map.of("active", false));
    assertTrue(
        patch("/api/technicians/" + rosterId + "/account/active", admin, Map.of("active", true))
            .isOk());

    assertTrue(
        post("/api/auth/login", null, Map.of("email", TECHNICIAN_EMAIL, "password", "Password123"))
            .isOk(),
        "they can sign in again");
  }

  /**
   * No self exception here, unlike linking.
   *
   * <p>Revoking yourself signs you out of the session you are doing it from, and for the last owner
   * out of the only account that could undo it.
   */
  @Test
  void nobodyCanRevokeTheirOwnSignIn() {
    String admin = adminToken();
    long rosterId = firstTechnicianId(admin);
    patch("/api/technicians/" + rosterId + "/account", admin, Map.of("email", ADMIN_EMAIL));

    ApiResponse response =
        patch("/api/technicians/" + rosterId + "/account/active", admin, Map.of("active", false));

    assertEquals(400, response.status(), "body was: " + response.body());
    assertEquals("You cannot revoke your own sign-in.", response.asMap().get("error"));
  }

  /** Nobody can revoke upwards, so the shop cannot be locked out of its own owners. */
  @Test
  void revokingIsBoundByTheHierarchy() {
    String admin = adminToken();
    String bookkeeper = bookkeeperToken();
    String technician = technicianToken(); // lands on the first roster entry

    List<Map<String, Object>> roster = get("/api/technicians", admin).asList();
    long technicianRow = ((Number) roster.get(0).get("id")).longValue();
    long adminRow = ((Number) roster.get(1).get("id")).longValue();
    patch("/api/technicians/" + adminRow + "/account", admin, Map.of("email", ADMIN_EMAIL));

    // A bookkeeper cannot reach an admin's sign-in.
    assertForbidden(
        patch(
            "/api/technicians/" + adminRow + "/account/active",
            bookkeeper,
            Map.of("active", false)));

    // She can reach a technician, who ranks below her.
    assertTrue(
        patch(
                "/api/technicians/" + technicianRow + "/account/active",
                bookkeeper,
                Map.of("active", false))
            .isOk(),
        "a bookkeeper may revoke a technician");
    assertEquals(401, get("/api/repairs/queue", technician).status());
  }

  /** The roster has to show a revoked account as revoked, not as a working one. */
  @Test
  void theRosterShowsWhenAnAccountIsRevoked() {
    String admin = adminToken();
    technicianToken();
    long rosterId = firstTechnicianId(admin);

    assertEquals(
        Boolean.TRUE, rosterEntry(admin, rosterId).get("accountActive"), "live to begin with");

    patch("/api/technicians/" + rosterId + "/account/active", admin, Map.of("active", false));

    assertEquals(
        Boolean.FALSE,
        rosterEntry(admin, rosterId).get("accountActive"),
        "a revoked account must not look identical to a working one");
    assertEquals(
        "TECHNICIAN", rosterEntry(admin, rosterId).get("role"), "and it still has its role");
  }

  // --- invites ------------------------------------------------------------

  /** An invited account is inert until the link is opened. */
  @Test
  void anInvitedAccountCannotSignInUntilTheInviteIsAccepted() {
    String admin = adminToken();
    long rosterId = firstTechnicianId(admin);

    assertTrue(
        post(
                "/api/technicians/" + rosterId + "/invite",
                admin,
                Map.of("email", TECHNICIAN_EMAIL, "role", "TECHNICIAN"))
            .isOk());

    // The row exists, with a password nobody has ever seen and is_active false.
    ApiResponse tooEarly =
        post("/api/auth/login", null, Map.of("email", TECHNICIAN_EMAIL, "password", "Password123"));
    assertTrue(tooEarly.isClientError(), "an unaccepted invite must not be a working account");

    String raw = plantCredentialToken(TECHNICIAN_EMAIL, "INVITE");
    assertTrue(
        post("/api/auth/accept-invite", null, Map.of("token", raw, "password", "Password123"))
            .isOk());

    assertEquals(
        "TECHNICIAN",
        roleIn(
            (String)
                post(
                        "/api/auth/login",
                        null,
                        Map.of("email", TECHNICIAN_EMAIL, "password", "Password123"))
                    .asMap()
                    .get("token")));
  }

  /**
   * The two token purposes are not interchangeable.
   *
   * <p>An invite redeemed at /reset-password would set a password and leave is_active false, which
   * is a dead end; a reset redeemed at /accept-invite would activate an account a manager had
   * deliberately switched off.
   */
  @Test
  void anInviteTokenAndAResetTokenCannotBeSwapped() {
    String admin = adminToken();
    long rosterId = firstTechnicianId(admin);
    post(
        "/api/technicians/" + rosterId + "/invite",
        admin,
        Map.of("email", TECHNICIAN_EMAIL, "role", "TECHNICIAN"));

    String invite = plantCredentialToken(TECHNICIAN_EMAIL, "INVITE");
    assertEquals(
        400,
        post("/api/auth/reset-password", null, Map.of("token", invite, "password", "Password123"))
            .status(),
        "an invite token must not work as a password reset");

    String reset = plantCredentialToken(ADMIN_EMAIL, "RESET");
    assertEquals(
        400,
        post("/api/auth/accept-invite", null, Map.of("token", reset, "password", "Password123"))
            .status(),
        "a reset token must not activate an account");
  }

  /** Only an owner can bring on a bookkeeper; a bookkeeper can only bring on a technician. */
  @Test
  void invitingIsBoundByTheSameHierarchy() {
    String admin = adminToken();
    String bookkeeper = bookkeeperToken();
    long rosterId = firstTechnicianId(admin);

    assertForbidden(
        post(
            "/api/technicians/" + rosterId + "/invite",
            bookkeeper,
            Map.of("email", "someone@amstar-test.com", "role", "BOOKKEEPER")));
    assertForbidden(
        post(
            "/api/technicians/" + rosterId + "/invite",
            admin,
            Map.of("email", "someone@amstar-test.com", "role", "ADMIN")));
    assertTrue(
        post(
                "/api/technicians/" + rosterId + "/invite",
                bookkeeper,
                Map.of("email", TECHNICIAN_EMAIL, "role", "TECHNICIAN"))
            .isOk(),
        "a bookkeeper may invite a technician");
  }

  /** The floor role reads the shop and writes nothing, with no money in sight. */
  @Test
  void aTechnicianReadsTheShopAndSeesNoMoney() {
    String admin = adminToken();
    long ticket = createTicket(admin, "Rosalind", 3, "2026-12-01");
    patch("/api/repairs/" + ticket + "/notes", admin, Map.of("notes", "CUSTOMER CALLED"));

    String technician = technicianToken();

    assertTrue(get("/api/repairs/queue", technician).isOk(), "a technician may read the queue");
    assertForbidden(
        patch("/api/repairs/" + ticket + "/status", technician, Map.of("status", "IN_PROGRESS")));
    assertForbidden(
        patch("/api/repairs/" + ticket + "/severity", technician, Map.of("severity", 5)));
    assertForbidden(delete("/api/repairs/" + ticket, technician));

    // BILLING_AUTHORITIES was unreachable until TECHNICIAN existed. It is live now.
    Map<String, Object> asTechnician = ticketById(technician, ticket);
    assertNull(asTechnician.get("notes"), "a technician must not read the notes");
    assertNull(asTechnician.get("retailPrice"), "a technician must not read the prices");
    assertNull(asTechnician.get("laborPrice"), "a technician must not read the prices");
  }

  private void assertForbidden(ApiResponse response) {
    assertEquals(
        403,
        response.status(),
        "this must be refused for a bookkeeper account: " + response.body());
  }
}
