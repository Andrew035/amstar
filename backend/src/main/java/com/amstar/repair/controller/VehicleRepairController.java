package com.amstar.repair.controller;

import com.amstar.repair.model.VehicleRepair;
import com.amstar.repair.repository.VehicleRepairRepository;
import com.amstar.repair.service.PriorityQueueService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
  public VehicleRepair addRepair(@RequestBody VehicleRepair repair) {
    return priorityQueueService.createRepair(repair);
  }

  @PatchMapping("/{id}/status")
  public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody java.util.Map<String, String> request) {
    // Hand the job off to the service layer
    boolean isUpdated = priorityQueueService.updateRepairStatus(id, request.get("status"));

    if (isUpdated) {
      return ResponseEntity.ok().build();
    } else {
      return ResponseEntity.notFound().build();
    }
  };

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
