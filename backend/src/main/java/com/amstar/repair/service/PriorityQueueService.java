package com.amstar.repair.service;

import com.amstar.repair.model.VehicleRepair;
import com.amstar.repair.repository.VehicleRepairRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

@Service
public class PriorityQueueService {
  private final VehicleRepairRepository repository;
  private final VehicleLookupService lookupService;

  public PriorityQueueService(VehicleRepairRepository repository, VehicleLookupService lookupService) {
    this.repository = repository;
    this.lookupService = lookupService;
  }

  public double calculatePriorityScore(VehicleRepair repair) {
    LocalDate today = LocalDate.now();

    Long daysInSystem = ChronoUnit.DAYS.between(repair.getEntryDate(), today);
    Long daysUntilDue = ChronoUnit.DAYS.between(today, repair.getExpectedCompletionDate());

    // Dynamic Priority Calculation Formula
    double severityWeight = repair.getSeverity() * 20.0;
    double ageWeight = daysInSystem * 2.0;
    double urgencyWeight = Math.max(0, 50.0 - (daysUntilDue * 5.0));

    return severityWeight + ageWeight + urgencyWeight;
  }

  public List<VehicleRepair> getPrioritizedQueue() {
    List<VehicleRepair> activeRepairs = repository.findByStatusNot("COMPLETED");

    for (VehicleRepair repair : activeRepairs) {
      repair.setPriorityScore(calculatePriorityScore(repair));
    }

    // Sort descending by priority score (Highest score = Highest priority)
    activeRepairs.sort(Comparator.comparingDouble(VehicleRepair::getPriorityScore).reversed());

    return activeRepairs;
  }

  public VehicleRepair createRepair(VehicleRepair repair) {
    if (repair.getEntryDate() == null) {
      repair.setEntryDate(LocalDate.now());
    }
    if (repair.getStatus() == null) {
      repair.setStatus("PENDING");
    }

    // Intercept the repair to fetch the car image and details before saving
    lookupService.enrichVehicleData(repair);

    return repository.save(repair);
  }
}
