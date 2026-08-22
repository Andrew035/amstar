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
    List<VehicleRepair> activeRepairs = repository.findAll();

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

  public boolean updateRepairStatus(Long id, String newStatus) {
    return repository.findById(id).map(repair -> {
      repair.setStatus(newStatus);

      // Automatically stamp the date when completed
      if ("COMPLETED".equals(newStatus)) {
        repair.setActualCompletionDate(LocalDate.now());
      } else {
        // Remove the date if accidently marked complete and reverted
        repair.setActualCompletionDate(null);
      }

      repository.save(repair);
      return true;
    }).orElse(false);
  }

  public boolean assignWorker(Long id, String workerUsername) {
    return repository.findById(id).map(repair -> {
      repair.setAssignedWorker(workerUsername);
      repository.save(repair);
      return true;
    }).orElse(false);
  }

  public boolean updatePricing(Long id, VehicleRepair pricingData) {
    java.util.Optional<VehicleRepair> optionalRepair = repository.findById(id);

    if (optionalRepair.isPresent()) {
      VehicleRepair repair = optionalRepair.get();

      repair.setRetailPrice(pricingData.getRetailPrice());
      repair.setLeasePrice(pricingData.getLeasePrice());
      repair.setLaborPrice(pricingData.getLaborPrice());
      repair.setIncludeRetail(pricingData.getIncludeRetail());
      repair.setIncludeLease(pricingData.getIncludeLease());
      repair.setIncludeLabor(pricingData.getIncludeLabor());

      repository.save(repair);
      return true;
    }
    return false;
  }

  public boolean updateServiceType(Long id, String newServiceType) {
    return repository.findById(id).map(repair -> {
      repair.setServiceType(newServiceType);
      repository.save(repair);
      return true;
    }).orElse(false);
  }
}
