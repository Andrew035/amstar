package com.amstar.repair;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.amstar.repair.support.IntegrationTest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * A ticket from intake to deletion, through the API the shop actually uses.
 *
 * <p>Every mutation also writes a row to the activity feed, and that table has a CHECK constraint
 * listing the allowed actions. Adding a feature without adding its action to the constraint breaks
 * the feature in production; these tests exercise every action, so that mistake fails the build.
 */
public class TicketLifecycleTest extends IntegrationTest {

  @Test
  void everyChangeToATicketSticksAndIsRecorded() {
    String admin = adminToken();
    long id = createTicket(admin, "Kane", 3, "2026-12-01");

    assertOk(patch("/api/repairs/" + id + "/status", admin, Map.of("status", "IN_PROGRESS")));
    assertOk(patch("/api/repairs/" + id + "/severity", admin, Map.of("severity", 5)));
    assertOk(patch("/api/repairs/" + id + "/assign", admin, Map.of("worker", "Max, Melvin")));
    assertOk(
        patch(
            "/api/repairs/" + id + "/service", admin, Map.of("serviceType", "CLUTCH REPLACEMENT")));
    assertOk(patch("/api/repairs/" + id + "/due-date", admin, Map.of("dueDate", "2026-12-24")));
    assertOk(patch("/api/repairs/" + id + "/customer", admin, Map.of("customerName", "Kane Ruiz")));
    assertOk(
        patch("/api/repairs/" + id + "/notes", admin, Map.of("notes", "Waiting on the owner")));
    assertOk(patch("/api/repairs/" + id + "/parts", admin, Map.of("parts", "Valve body VB-9912")));
    assertOk(
        patch(
            "/api/repairs/" + id + "/pricing",
            admin,
            Map.of("retailPrice", 1200.50, "includeRetail", true)));

    Map<String, Object> ticket = ticketById(admin, id);
    assertEquals("IN_PROGRESS", ticket.get("status"));
    assertEquals(5, ticket.get("severity"));
    assertEquals("Kane Ruiz", ticket.get("customerName"));
    assertEquals("2026-12-24", ticket.get("expectedCompletionDate"));
    assertEquals("CLUTCH REPLACEMENT", ticket.get("serviceType"));
    assertEquals("Waiting on the owner", ticket.get("notes"));
    assertEquals("Valve body VB-9912", ticket.get("parts"));
    assertTrue(
        String.valueOf(ticket.get("assignedWorker")).contains("Max"), "technicians were not saved");

    // The feed must have logged each of these, which only works if every action
    // is listed in the activity_action_valid constraint.
    List<String> actions = activityActions(admin);
    assertTrue(
        actions.containsAll(
            List.of(
                "CREATED",
                "STATUS",
                "SEVERITY",
                "ASSIGNED",
                "SERVICES",
                "DUE_DATE",
                "CUSTOMER",
                "NOTES",
                "PARTS",
                "PRICING")),
        "the activity feed is missing actions, saw: " + actions);
  }

  @Test
  void completingATicketStampsTheDateAndReopeningClearsIt() {
    String admin = adminToken();
    long id = createTicket(admin, "Ruiz", 2, "2026-12-01");

    assertOk(patch("/api/repairs/" + id + "/status", admin, Map.of("status", "COMPLETED")));
    assertTrue(
        ticketById(admin, id).get("actualCompletionDate") != null,
        "a completed ticket must carry its completion date");

    assertOk(patch("/api/repairs/" + id + "/status", admin, Map.of("status", "PENDING")));
    assertEquals(
        null,
        ticketById(admin, id).get("actualCompletionDate"),
        "reopening a ticket must clear the completion date");
  }

  @Test
  void movingTheDueDateReordersTheQueue() {
    String admin = adminToken();
    // Dates relative to today: the urgency part of the score only starts counting
    // inside ten days of the due date, so fixed dates would stop testing anything.
    java.time.LocalDate today = java.time.LocalDate.now();
    long far = createTicket(admin, "Later", 3, today.plusDays(30).toString());
    long near = createTicket(admin, "Sooner", 3, today.plusDays(2).toString());

    assertEquals(near, firstInQueue(admin), "the nearer due date should rank higher");

    assertOk(
        patch(
            "/api/repairs/" + far + "/due-date",
            admin,
            Map.of("dueDate", today.minusDays(3).toString())));
    assertEquals(far, firstInQueue(admin), "an overdue ticket must move to the top");
  }

  @Test
  void anOverdueTicketOutranksOneDueLater() {
    String admin = adminToken();
    java.time.LocalDate today = java.time.LocalDate.now();
    long overdue = createTicket(admin, "Late", 2, today.minusDays(5).toString());
    createTicket(admin, "Comfortable", 5, today.plusDays(45).toString());

    assertEquals(
        overdue,
        firstInQueue(admin),
        "a late level-2 job should outrank a level-5 job that is not due for weeks");
  }

  @Test
  void deletingATicketLeavesItsHistoryReadable() {
    String admin = adminToken();
    long id = createTicket(admin, "Gone", 3, "2026-12-01");

    ApiResponse deleted = delete("/api/repairs/" + id, admin);
    assertEquals(204, deleted.status());

    assertTrue(activityActions(admin).contains("DELETED"), "the deletion was not recorded");
    assertTrue(
        queue(admin).stream().noneMatch(row -> ((Number) row.get("id")).longValue() == id),
        "the deleted ticket is still in the queue");
  }

  @Test
  void theSameCarComingBackDoesNotCreateASecondVehicle() {
    String admin = adminToken();
    Map<String, Object> vehicle =
        Map.of("licensePlate", "SAME123", "state", "NY", "make", "FORD", "model", "E-250");

    for (int visit = 0; visit < 2; visit++) {
      post(
          "/api/repairs",
          admin,
          Map.of(
              "customerName", "Repeat Customer",
              "vehicle", vehicle,
              "serviceType", "OIL CHANGE",
              "severity", 2,
              "expectedCompletionDate", "2026-12-01",
              "status", "PENDING"));
    }

    Integer vehicles =
        jdbc.queryForObject(
            "select count(*) from vehicles where upper(license_plate) = 'SAME123'", Integer.class);
    assertEquals(1, vehicles, "the same plate must reuse one vehicle record");
  }

  @Test
  void aServiceTypedForTheFirstTimeJoinsTheCatalog() {
    String admin = adminToken();
    long id = createTicket(admin, "New Work", 4, "2026-12-01");

    assertOk(
        patch("/api/repairs/" + id + "/service", admin, Map.of("serviceType", "flywheel swap")));

    Integer inCatalog =
        jdbc.queryForObject(
            "select count(*) from services where name = 'FLYWHEEL SWAP'", Integer.class);
    assertEquals(1, inCatalog, "a new service must be stored, uppercased, in the catalog");
  }

  @Test
  void anUnknownTechnicianNameIsIgnoredRatherThanInvented() {
    String admin = adminToken();
    long id = createTicket(admin, "Kane", 3, "2026-12-01");

    assertOk(patch("/api/repairs/" + id + "/assign", admin, Map.of("worker", "Max, Ghost Worker")));

    String assigned = String.valueOf(ticketById(admin, id).get("assignedWorker"));
    assertTrue(assigned.contains("Max"), "the real technician should still be assigned");
    assertFalse(assigned.contains("Ghost"), "an unknown name must not be invented on the roster");
  }

  @Test
  void aCorrectedVinReplacesTheMistypedOne() {
    String admin = adminToken();
    Map<String, Object> wrong =
        Map.of(
            "licensePlate",
            "FIX123",
            "state",
            "MD",
            "vin",
            "1AAAAAAAAAAAAAAAA",
            "make",
            "FORD",
            "model",
            "E-250");
    post(
        "/api/repairs",
        admin,
        Map.of(
            "customerName",
            "Typo",
            "vehicle",
            wrong,
            "serviceType",
            "OIL CHANGE",
            "severity",
            2,
            "expectedCompletionDate",
            "2026-12-01",
            "status",
            "PENDING"));

    Map<String, Object> right =
        Map.of(
            "licensePlate",
            "FIX123",
            "state",
            "MD",
            "vin",
            "2BBBBBBBBBBBBBBBB",
            "make",
            "HONDA",
            "model",
            "CIVIC");
    post(
        "/api/repairs",
        admin,
        Map.of(
            "customerName",
            "Typo",
            "vehicle",
            right,
            "serviceType",
            "OIL CHANGE",
            "severity",
            2,
            "expectedCompletionDate",
            "2026-12-01",
            "status",
            "PENDING"));

    String storedVin =
        jdbc.queryForObject(
            "select vin from vehicles where upper(license_plate) = 'FIX123'", String.class);
    assertEquals("2BBBBBBBBBBBBBBBB", storedVin, "the corrected VIN should win");
  }

  @Test
  void deletingTheLastTicketForACarRemovesTheCar() {
    String admin = adminToken();
    long id = createTicket(admin, "Mistake", 3, "2026-12-01");
    String plate =
        jdbc.queryForObject(
            "select v.license_plate from vehicles v"
                + " join service_tickets t on t.vehicle_id = v.id where t.id = ?",
            String.class,
            id);

    assertEquals(204, delete("/api/repairs/" + id, admin).status());

    Integer left =
        jdbc.queryForObject(
            "select count(*) from vehicles where license_plate = ?", Integer.class, plate);
    assertEquals(0, left, "a car with no tickets left should not stay on file");
  }

  @Test
  void deletingOneOfTwoTicketsKeepsTheCar() {
    String admin = adminToken();
    Map<String, Object> vehicle =
        Map.of("licensePlate", "KEEP99", "state", "NY", "make", "FORD", "model", "E-250");
    long first = ticketFor(admin, vehicle);
    ticketFor(admin, vehicle);

    assertEquals(204, delete("/api/repairs/" + first, admin).status());

    Integer left =
        jdbc.queryForObject(
            "select count(*) from vehicles where upper(license_plate) = 'KEEP99'", Integer.class);
    assertEquals(1, left, "a car with a ticket still open must not be deleted");
  }

  // --- helpers ------------------------------------------------------------

  /** Creates a ticket against a specific vehicle payload and returns its id. */
  private long ticketFor(String token, Map<String, Object> vehicle) {
    ApiResponse created =
        post(
            "/api/repairs",
            token,
            Map.of(
                "customerName", "Repeat Customer",
                "vehicle", vehicle,
                "serviceType", "OIL CHANGE",
                "severity", 2,
                "expectedCompletionDate", "2026-12-01",
                "status", "PENDING"));
    assertOk(created);
    return ((Number) created.asMap().get("id")).longValue();
  }

  private void assertOk(ApiResponse response) {
    assertTrue(
        response.isOk(),
        "expected the change to be accepted, got " + response.status() + " " + response.body());
  }

  private List<Map<String, Object>> queue(String token) {
    return get("/api/repairs/queue", token).asList();
  }

  private long firstInQueue(String token) {
    return ((Number) queue(token).get(0).get("id")).longValue();
  }
}
