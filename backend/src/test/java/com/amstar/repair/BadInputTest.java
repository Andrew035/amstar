package com.amstar.repair;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
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

  /**
   * A create always inserts. Jackson binds `id` straight off the request body, so without
   * repair.setId(null) in createRepair, repository.save() takes em.merge() and this POST silently
   * UPDATEs the named ticket instead - overwriting its notes and pricing and deleting its line
   * items through orphanRemoval.
   */
  @Test
  void aCreateCarryingAnExistingIdMustNotOverwriteThatTicket() {
    String admin = adminToken();
    long victim = createTicket(admin, "Rosalind", 4, "2026-12-01");
    assertTrue(
        patch("/api/repairs/" + victim + "/notes", admin, Map.of("notes", "KEEP THIS NOTE")).isOk(),
        "setting up the victim ticket");

    Map<String, Object> payload = new HashMap<>();
    payload.put("id", victim); // the whole point of the test
    payload.put("customerName", "Someone Else");
    payload.put("serviceType", "OIL CHANGE");
    payload.put("severity", 1);
    payload.put("expectedCompletionDate", "2026-12-31");
    payload.put(
        "vehicle",
        Map.of(
            "licensePlate", "ZZZ999", "state", "NY", "make", "KIA", "model", "RIO", "year", 2001));

    ApiResponse created = post("/api/repairs", admin, payload);
    assertTrue(created.isOk(), "body was: " + created.body());

    long newId = ((Number) created.asMap().get("id")).longValue();
    assertNotEquals(victim, newId, "the create must insert a new row, not merge onto " + victim);

    Map<String, Object> survivor = ticketById(admin, victim);
    assertEquals("KEEP THIS NOTE", survivor.get("notes"), "the victim's notes were overwritten");
    assertEquals(
        4, ((Number) survivor.get("severity")).intValue(), "the victim's severity was overwritten");
    assertEquals(2, get("/api/repairs/queue", admin).asList().size(), "both tickets must exist");
  }

  @Test
  void twoPeopleWithOneNameStaySeparate() {
    String admin = adminToken();
    createTicket(admin, "Mike Smith", 3, "2026-12-01", "(301)-555-0100");
    createTicket(admin, "Mike Smith", 3, "2026-12-01", "(301)-555-0199");

    assertEquals(2, customersNamed("Mike Smith"), "a different number means a different person");
  }

  @Test
  void theSameNumberFindsTheSamePerson() {
    String admin = adminToken();
    createTicket(admin, "Mike Smith", 3, "2026-12-01", "(301)-555-0100");
    // Different case, and the number unformatted: still one person.
    createTicket(admin, "mike smith", 3, "2026-12-01", "3015550100");

    assertEquals(1, customersNamed("Mike Smith"), "formatting is not identity");
  }

  @Test
  void anAmbiguousNameWithNoNumberIsRefused() {
    String admin = adminToken();
    createTicket(admin, "Mike Smith", 3, "2026-12-01", "(301)-555-0100");
    long second = createTicket(admin, "Mike Smith", 3, "2026-12-01", "(301)-555-0199");

    // Two people now answer to this name, so a rename to it with no number has
    // no right answer. Refusing beats silently picking one.
    assertRefused(
        patch("/api/repairs/" + second + "/customer", admin, Map.of("customerName", "Mike Smith")),
        "an ambiguous customer name");
  }

  /** How many customer rows carry this name, whatever their number. */
  private int customersNamed(String name) {
    Integer count =
        jdbc.queryForObject(
            "select count(*) from customers where lower(full_name) = lower(?)",
            Integer.class,
            name);
    return count == null ? 0 : count;
  }

  private void assertRefused(ApiResponse response, String what) {
    assertTrue(
        response.isClientError(),
        what + " must be refused with a 4xx, got " + response.status() + " " + response.body());
  }
}
