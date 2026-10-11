package com.amstar.repair;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.amstar.repair.support.IntegrationTest;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Bad input must be refused, not crash the server and not slip into the database.
 *
 * <p>The rule these tests enforce: a request the shop could not have meant returns 400 or 404 with
 * a message, never a 500. A 500 means an unhandled failure, and an unhandled failure is how a
 * half-written ticket or a wrong price ends up stored.
 */
public class BadInputTest extends IntegrationTest {

  @Test
  void severityMustBeAWholeNumberFromOneToFive() {
    String admin = adminToken();
    long id = createTicket(admin, "Kane", 3, "2026-12-01");

    for (Object bad : new Object[] {0, 6, -1, 3.7, "3", null}) {
      Map<String, Object> body = new HashMap<>();
      body.put("severity", bad);
      assertRefused(patch("/api/repairs/" + id + "/severity", admin, body), "severity " + bad);
    }

    assertEquals(3, ticketById(admin, id).get("severity"), "a refused change must not be stored");
  }

  @Test
  void statusMustBeOneTheShopUses() {
    String admin = adminToken();
    long id = createTicket(admin, "Kane", 3, "2026-12-01");

    for (String bad : new String[] {"DONE", "in_progress", "", "DROP TABLE"}) {
      assertRefused(
          patch("/api/repairs/" + id + "/status", admin, Map.of("status", bad)), "status " + bad);
    }

    // The positive half: forgetting either the Java set or the database CHECK
    // makes the new status unreachable, and the shop's whole handoff with it.
    assertTrue(
        patch("/api/repairs/" + id + "/status", admin, Map.of("status", "READY_FOR_INVOICE"))
            .isOk(),
        "READY_FOR_INVOICE must be accepted");
  }

  @Test
  void aDueDateMustBeADate() {
    String admin = adminToken();
    long id = createTicket(admin, "Kane", 3, "2026-12-01");

    for (String bad : new String[] {"tomorrow", "12/24/2026", "2026-13-45", ""}) {
      assertRefused(
          patch("/api/repairs/" + id + "/due-date", admin, Map.of("dueDate", bad)), "date " + bad);
    }

    assertEquals(
        "2026-12-01",
        ticketById(admin, id).get("expectedCompletionDate"),
        "a refused date must not be stored");
  }

  @Test
  void pricesCannotBeNegative() {
    String admin = adminToken();
    long id = createTicket(admin, "Kane", 3, "2026-12-01");

    assertRefused(
        patch("/api/repairs/" + id + "/pricing", admin, Map.of("retailPrice", -50)),
        "a negative price");
  }

  @Test
  void theCustomerNameCannotBeBlankOrEnormous() {
    String admin = adminToken();
    long id = createTicket(admin, "Kane", 3, "2026-12-01");

    assertRefused(
        patch("/api/repairs/" + id + "/customer", admin, Map.of("customerName", "   ")),
        "a blank customer name");
    assertRefused(
        patch("/api/repairs/" + id + "/customer", admin, Map.of("customerName", "x".repeat(200))),
        "a 200-character customer name");

    assertEquals("Kane", ticketById(admin, id).get("customerName"));
  }

  @Test
  void notesAndPartsAreCapped() {
    String admin = adminToken();
    long id = createTicket(admin, "Kane", 3, "2026-12-01");

    assertRefused(
        patch("/api/repairs/" + id + "/notes", admin, Map.of("notes", "x".repeat(5001))),
        "over-long notes");
    assertRefused(
        patch("/api/repairs/" + id + "/parts", admin, Map.of("parts", "x".repeat(5001))),
        "an over-long parts list");
  }

  @Test
  void aTicketMissingItsRequiredFieldsIsRefused() {
    String admin = adminToken();

    ApiResponse response =
        post(
            "/api/repairs",
            admin,
            Map.of("customerName", "No Vehicle", "serviceType", "OIL CHANGE", "severity", 3));

    assertRefused(response, "a ticket with no vehicle and no due date");
  }

  @Test
  void anUnknownTicketIsNotFoundRatherThanAnError() {
    String admin = adminToken();

    assertEquals(
        404, patch("/api/repairs/999999/status", admin, Map.of("status", "COMPLETED")).status());
    assertEquals(404, delete("/api/repairs/999999", admin).status());
  }

  @Test
  void anIdThatIsNotANumberIsRefusedCleanly() {
    String admin = adminToken();

    assertRefused(
        patch("/api/repairs/abc/status", admin, Map.of("status", "COMPLETED")), "a non-numeric id");
  }

  @Test
  void aTechnicianNameCannotBeBlankOrDuplicated() {
    String admin = adminToken();

    assertRefused(post("/api/technicians", admin, Map.of("fullName", "  ")), "a blank name");

    post("/api/technicians", admin, Map.of("fullName", "Casey Doe"));
    assertRefused(
        post("/api/technicians", admin, Map.of("fullName", "casey doe")),
        "the same technician twice");
  }

  // --- helpers ------------------------------------------------------------

  /** A 4xx with a message is a refusal; a 5xx is the app falling over. */
  /**
   * The UI shows whatever is in "error", so a refusal has to name the field the shop got wrong. A
   * generic string here means the form can only say "something went wrong".
   */
  @Test
  void aRefusalNamesWhatIsActuallyWrong() {
    String admin = adminToken();

    ApiResponse response =
        post(
            "/api/repairs",
            admin,
            Map.of(
                "customerName",
                "No Due Date",
                "serviceType",
                "OIL CHANGE",
                "severity",
                3,
                "vehicle",
                Map.of("licensePlate", "NODATE1", "state", "NY")));

    assertEquals(400, response.status(), "body was: " + response.body());
    assertEquals(
        "An expected completion date is required",
        response.asMap().get("error"),
        "the message the form displays, actual body: " + response.body());
  }

  private void assertRefused(ApiResponse response, String what) {
    assertTrue(
        response.isClientError(),
        what + " must be refused with a 4xx, got " + response.status() + " " + response.body());
  }
}
