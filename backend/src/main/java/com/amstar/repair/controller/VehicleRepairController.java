package com.amstar.repair.controller;

import com.amstar.repair.model.TicketLineItem;
import com.amstar.repair.model.TicketStatus;
import com.amstar.repair.model.UserRole;
import com.amstar.repair.model.VehicleRepair;
import com.amstar.repair.service.PriorityQueueService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/repairs")
public class VehicleRepairController {
  private final PriorityQueueService priorityQueueService;

  public VehicleRepairController(PriorityQueueService priorityQueueService) {
    this.priorityQueueService = priorityQueueService;
  }

  @GetMapping("/queue")
  public List<VehicleRepair> getPriorityQueue(Authentication authentication) {
    List<VehicleRepair> queue = priorityQueueService.getPrioritizedQueue();

    // Billing detail is manager-and-bookkeeper only. Hiding the panels in React
    // is not privacy - any account can read them straight off this JSON.
    // Safe to null them here: spring.jpa.open-in-view is false and this path is
    // not transactional, so these entities are detached and nothing can flush
    // the nulls back to the table.
    //
    // Prices are nulled alongside the rest. Be clear about what this is: both
    // current roles may see money, and users_role_valid (V14) permits no third
    // role, so this branch cannot be reached today and no test can cover it
    // through the API. It is here because the migration that adds a read-only
    // floor role is the natural place to revisit it, and omitting prices now is
    // the asymmetry that would ship them to that role by default.
    if (!canSeeBilling(authentication)) {
      for (VehicleRepair repair : queue) {
        repair.setNotes(null);
        repair.setLineItems(null);
        repair.setRetailPrice(null);
        repair.setLaborPrice(null);
      }
    }
    return queue;
  }

  /** Roles entitled to read notes, line items and prices. */
  private static final Set<String> BILLING_AUTHORITIES =
      Set.of("ROLE_" + UserRole.ADMIN, "ROLE_" + UserRole.BOOKKEEPER);

  private static boolean canSeeBilling(Authentication authentication) {
    return authentication != null
        && authentication.getAuthorities().stream()
            .anyMatch(granted -> BILLING_AUTHORITIES.contains(granted.getAuthority()));
  }

  @PostMapping
  public VehicleRepair addRepair(@Valid @RequestBody VehicleRepair repair) {
    return priorityQueueService.createRepair(repair);
  }

  @PatchMapping("/{id}/status")
  public ResponseEntity<?> updateStatus(
      @PathVariable Long id, @RequestBody java.util.Map<String, String> request) {
    String status = request.get("status");
    if (!TicketStatus.isValid(status)) {
      return ResponseEntity.badRequest()
          .body(java.util.Map.of("error", "Status must be one of " + TicketStatus.ALL));
    }

    boolean isUpdated = priorityQueueService.updateRepairStatus(id, status);

    if (isUpdated) {
      return ResponseEntity.ok().build();
    } else {
      return ResponseEntity.notFound().build();
    }
  }

  /**
   * The bookkeeper clears a ticket once the invoice is written.
   *
   * <p>Separate from PATCH /{id}/status because SecurityConfig grants this path to BOOKKEEPER and
   * that one to ADMIN only. A single endpoint taking a status would mean granting every transition.
   * An out-of-order call raises IllegalArgumentException, which GlobalExceptionHandler maps to a
   * 400 with a readable message.
   */
  @PatchMapping("/{id}/invoiced")
  public ResponseEntity<?> markInvoiced(@PathVariable Long id) {
    return priorityQueueService.markInvoiced(id)
        ? ResponseEntity.ok().build()
        : ResponseEntity.notFound().build();
  }

  @PatchMapping("/{id}/assign")
  public ResponseEntity<?> assignWorker(
      @PathVariable Long id, @RequestBody java.util.Map<String, String> request) {
    boolean isAssigned = priorityQueueService.assignWorker(id, request.get("worker"));

    if (isAssigned) {
      return ResponseEntity.ok().build();
    }
    return ResponseEntity.notFound().build();
  }

  @PatchMapping("/{id}/pricing")
  public ResponseEntity<?> updatePricing(
      @PathVariable Long id, @RequestBody VehicleRepair pricingData) {
    // tickets_price_non_negative rejects these at the database otherwise.
    for (BigDecimal price :
        java.util.List.of(pricingData.getRetailPrice(), pricingData.getLaborPrice())) {
      if (price != null && price.signum() < 0) {
        return ResponseEntity.badRequest()
            .body(java.util.Map.of("error", "Prices cannot be negative"));
      }
    }
    String billing = pricingData.getBillingType();
    // Mirrors billing_type_valid; without it the DB returns a 409 instead of a 400.
    if (billing != null && !billing.equals("RETAIL") && !billing.equals("WHOLESALE")) {
      return ResponseEntity.badRequest()
          .body(java.util.Map.of("error", "Billing type must be RETAIL or WHOLESALE"));
    }

    boolean isUpdated = priorityQueueService.updatePricing(id, pricingData);

    if (isUpdated) {
      return ResponseEntity.ok().build();
    }
    return ResponseEntity.notFound().build();
  }

  @PatchMapping("/{id}/service")
  public ResponseEntity<?> updateServiceType(
      @PathVariable Long id, @RequestBody java.util.Map<String, String> request) {
    boolean isUpdated = priorityQueueService.updateServiceType(id, request.get("serviceType"));
    if (isUpdated) {
      return ResponseEntity.ok().build();
    }
    return ResponseEntity.notFound().build();
  }

  @PatchMapping("/{id}/notes")
  public ResponseEntity<?> updateNotes(
      @PathVariable Long id, @RequestBody java.util.Map<String, String> request) {
    String notes = request.get("notes");
    // Mirrors tickets_notes_length; without it the DB returns a 409 instead.
    if (notes != null && notes.length() > 5000) {
      return ResponseEntity.badRequest()
          .body(java.util.Map.of("error", "Notes must be 5000 characters or fewer"));
    }

    boolean isUpdated = priorityQueueService.updateNotes(id, notes);
    return isUpdated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
  }

  @PatchMapping("/{id}/customer")
  public ResponseEntity<?> updateCustomerName(
      @PathVariable Long id, @RequestBody java.util.Map<String, String> request) {
    String name = request.get("customerName");
    name = name == null ? null : name.trim();
    // Mirrors customers.full_name: not null, varchar(120).
    if (name == null || name.isEmpty() || name.length() > 120) {
      return ResponseEntity.badRequest()
          .body(
              java.util.Map.of("error", "A customer name of 120 characters or fewer is required"));
    }

    // Optional, and only ever set: a blank leaves the number already on file
    // alone, so saving the name back does not wipe a phone number.
    String phone = request.get("customerPhone");
    phone = phone == null ? null : phone.trim();
    if (phone != null && phone.length() > 20) {
      return ResponseEntity.badRequest()
          .body(java.util.Map.of("error", "A phone number must be 20 characters or fewer"));
    }

    boolean isUpdated = priorityQueueService.updateCustomerName(id, name, phone);
    return isUpdated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
  }

  /** The odometer reading, which often arrives after the car does. */
  @PatchMapping("/{id}/mileage")
  public ResponseEntity<?> updateMileage(
      @PathVariable Long id, @RequestBody java.util.Map<String, Object> request) {
    Object raw = request.get("mileage");
    Integer mileage = null;
    if (raw instanceof Number number) {
      mileage = number.intValue();
    } else if (raw instanceof String text && !text.isBlank()) {
      try {
        mileage = Integer.valueOf(text.trim());
      } catch (NumberFormatException e) {
        return ResponseEntity.badRequest()
            .body(java.util.Map.of("error", "Mileage must be a whole number"));
      }
    }
    // Mirrors vehicles_mileage_sane in V18, so a typo is a readable 400 rather
    // than a constraint violation turned into a 409.
    if (mileage != null && (mileage < 0 || mileage > 3_000_000)) {
      return ResponseEntity.badRequest()
          .body(java.util.Map.of("error", "Mileage must be between 0 and 3,000,000"));
    }

    boolean isUpdated = priorityQueueService.updateMileage(id, mileage);
    return isUpdated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
  }

  @PatchMapping("/{id}/due-date")
  public ResponseEntity<?> updateDueDate(
      @PathVariable Long id, @RequestBody java.util.Map<String, String> request) {
    String raw = request.get("dueDate");
    java.time.LocalDate dueDate;
    try {
      // expected_completion_date is NOT NULL, so a blank date is a 400, not a clear.
      dueDate = java.time.LocalDate.parse(raw);
    } catch (Exception e) {
      return ResponseEntity.badRequest()
          .body(java.util.Map.of("error", "A due date of the form YYYY-MM-DD is required"));
    }

    boolean isUpdated = priorityQueueService.updateDueDate(id, dueDate);
    return isUpdated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
  }

  @PatchMapping("/{id}/severity")
  public ResponseEntity<?> updateSeverity(
      @PathVariable Long id, @RequestBody java.util.Map<String, Object> request) {
    // Integer only: a JSON 3.7 or "3" is rejected rather than silently coerced.
    // Mirrors tickets_severity_range in V1.
    if (!(request.get("severity") instanceof Integer severity) || severity < 1 || severity > 5) {
      return ResponseEntity.badRequest()
          .body(java.util.Map.of("error", "Severity must be a whole number from 1 to 5"));
    }

    boolean isUpdated = priorityQueueService.updateSeverity(id, severity);
    return isUpdated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
  }

  @PatchMapping("/{id}/line-items")
  public ResponseEntity<?> updateLineItems(
      @PathVariable Long id, @Valid @RequestBody LineItemsRequest request) {
    return priorityQueueService.updateLineItems(id, request.items())
        ? ResponseEntity.ok().build()
        : ResponseEntity.notFound().build();
  }

  @PatchMapping("/{id}/comeback")
  public ResponseEntity<?> updateComeback(
      @PathVariable Long id, @RequestBody java.util.Map<String, Object> request) {
    // Boolean only: a JSON "true" or 1 is rejected rather than silently coerced.
    if (!(request.get("isComeback") instanceof Boolean isComeback)) {
      return ResponseEntity.badRequest()
          .body(java.util.Map.of("error", "isComeback must be true or false"));
    }

    boolean isUpdated = priorityQueueService.updateComeback(id, isComeback);
    return isUpdated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteRepair(@PathVariable Long id) {
    // Through the service so the deletion is recorded in the activity feed.
    boolean isDeleted = priorityQueueService.deleteRepair(id);
    return isDeleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
  }

  /**
   * Wrapper rather than a bare List: @Valid does not cascade to the elements of a List request-body
   * parameter, so the per-row constraints on TicketLineItem would never run.
   */
  public record LineItemsRequest(@Valid @NotNull List<TicketLineItem> items) {}
}
