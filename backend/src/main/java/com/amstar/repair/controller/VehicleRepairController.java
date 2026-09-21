package com.amstar.repair.controller;

import com.amstar.repair.model.TicketStatus;
import com.amstar.repair.model.VehicleRepair;
// import com.amstar.repair.repository.VehicleRepairRepository;
import com.amstar.repair.service.PriorityQueueService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/repairs")
public class VehicleRepairController {
  private final PriorityQueueService priorityQueueService;

  // private final VehicleRepairRepository repairRepository;

  public VehicleRepairController(PriorityQueueService priorityQueueService) {
    this.priorityQueueService = priorityQueueService;
    // this.repairRepository = repairRepository;
  }

  @GetMapping("/queue")
  public List<VehicleRepair> getPriorityQueue() {
    return priorityQueueService.getPrioritizedQueue();
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
        java.util.List.of(
            pricingData.getRetailPrice(),
            pricingData.getLeasePrice(),
            pricingData.getLaborPrice())) {
      if (price != null && price.signum() < 0) {
        return ResponseEntity.badRequest()
            .body(java.util.Map.of("error", "Prices cannot be negative"));
      }
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

    boolean isUpdated = priorityQueueService.updateCustomerName(id, name);
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

  @PatchMapping("/{id}/parts")
  public ResponseEntity<?> updateParts(
      @PathVariable Long id, @RequestBody java.util.Map<String, String> request) {
    String parts = request.get("parts");
    // Mirrors tickets_parts_length; without it the DB returns a 409 instead.
    if (parts != null && parts.length() > 5000) {
      return ResponseEntity.badRequest()
          .body(java.util.Map.of("error", "Parts must be 5000 characters or fewer"));
    }

    boolean isUpdated = priorityQueueService.updateParts(id, parts);
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

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteRepair(@PathVariable Long id) {
    // Through the service so the deletion is recorded in the activity feed.
    boolean isDeleted = priorityQueueService.deleteRepair(id);
    return isDeleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
  }
}
