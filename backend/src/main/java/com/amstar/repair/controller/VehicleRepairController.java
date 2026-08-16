package com.amstar.repair.controller;

import com.amstar.repair.model.VehicleRepair;
import com.amstar.repair.service.PriorityQueueService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/repairs")
@CrossOrigin(origins = "*")
public class VehicleRepairController {
  private final PriorityQueueService priorityQueueService;

  public VehicleRepairController(PriorityQueueService priorityQueueService) {
    this.priorityQueueService = priorityQueueService;
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
}
