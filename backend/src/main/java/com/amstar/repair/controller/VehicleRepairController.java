package com.amstar.repair.controller;

import com.amstar.repair.model.VehicleRepair;
import com.amstar.repair.repository.VehicleRepairRepository;
import com.amstar.repair.service.PriorityQueueService;
import com.amstar.repair.model.TicketStatus;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/repairs")
public class VehicleRepairController {
  private final PriorityQueueService priorityQueueService;
  private final VehicleRepairRepository repairRepository;

  public VehicleRepairController(PriorityQueueService priorityQueueService, VehicleRepairRepository repairRepository) {
    this.priorityQueueService = priorityQueueService;
    this.repairRepository = repairRepository;
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
  public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody java.util.Map<String, String> request) {
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
  public ResponseEntity<?> assignWorker(@PathVariable Long id, @RequestBody java.util.Map<String, String> request) {
    boolean isAssigned = priorityQueueService.assignWorker(id, request.get("worker"));

    if (isAssigned) {
      return ResponseEntity.ok().build();
    }
    return ResponseEntity.notFound().build();
  }

  @PatchMapping("/{id}/pricing")
  public ResponseEntity<?> updatePricing(@PathVariable Long id, @RequestBody VehicleRepair pricingData) {
    // tickets_price_non_negative rejects these at the database otherwise.
    for (BigDecimal price : java.util.List.of(
        pricingData.getRetailPrice(), pricingData.getLeasePrice(), pricingData.getLaborPrice())) {
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
  public ResponseEntity<?> updateServiceType(@PathVariable Long id,
      @RequestBody java.util.Map<String, String> request) {
    boolean isUpdated = priorityQueueService.updateServiceType(id, request.get("serviceType"));
    if (isUpdated) {
      return ResponseEntity.ok().build();
    }
    return ResponseEntity.notFound().build();
  }

  @PatchMapping("/{id}/notes")
  public ResponseEntity<?> updateNotes(@PathVariable Long id,
      @RequestBody java.util.Map<String, String> request) {
    String notes = request.get("notes");
    // Mirrors tickets_notes_length; without it the DB returns a 409 instead.
    if (notes != null && notes.length() > 5000) {
      return ResponseEntity.badRequest()
          .body(java.util.Map.of("error", "Notes must be 5000 characters or fewer"));
    }

    boolean isUpdated = priorityQueueService.updateNotes(id, notes);
    return isUpdated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteRepair(@PathVariable Long id) {
    // Find the repair ticket
    if (!repairRepository.existsById(id)) {
      return ResponseEntity.notFound().build();
    }

    // Delete it from PostgreSQL
    repairRepository.deleteById(id);

    return ResponseEntity.noContent().build();
  }
}
