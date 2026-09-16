package com.amstar.repair.service;

import com.amstar.repair.model.VehicleRepair;
import com.amstar.repair.repository.VehicleRepairRepository;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PriorityQueueService {
  private final VehicleRepairRepository repository;
  private final VehicleLookupService lookupService;
  private final TicketAssemblyService assembly;
  private final ActivityService activity;

  public PriorityQueueService(
      VehicleRepairRepository repository,
      VehicleLookupService lookupService,
      TicketAssemblyService assembly,
      ActivityService activity) {
    this.repository = repository;
    this.lookupService = lookupService;
    this.assembly = assembly;
    this.activity = activity;
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

  @Transactional
  public VehicleRepair createRepair(VehicleRepair repair) {
    if (repair.getEntryDate() == null) {
      repair.setEntryDate(LocalDate.now());
    }
    if (repair.getStatus() == null) {
      repair.setStatus("PENDING");
    }

    // Intercept the repair to fetch the car image and details before saving
    lookupService.enrichVehicleData(repair);

    // Resolve the inbound comma strings into customer / vehicle / join rows
    assembly.assemble(repair);

    VehicleRepair saved = repository.save(repair);
    activity.record(saved, "CREATED", saved.getServiceType());
    return saved;
  }

  @Transactional
  public boolean updateRepairStatus(Long id, String newStatus) {
    return repository
        .findById(id)
        .map(
            repair -> {
              String oldStatus = repair.getStatus();
              repair.setStatus(newStatus);

              // Automatically stamp the date when completed
              if ("COMPLETED".equals(newStatus)) {
                repair.setActualCompletionDate(LocalDate.now());
              } else {
                // Remove the date if accidently marked complete and reverted
                repair.setActualCompletionDate(null);
              }

              repository.save(repair);
              if (!Objects.equals(oldStatus, newStatus)) {
                activity.record(
                    repair, "STATUS", readable(oldStatus) + " → " + readable(newStatus));
              }
              return true;
            })
        .orElse(false);
  }

  @Transactional
  public boolean assignWorker(Long id, String workerNames) {
    return repository
        .findById(id)
        .map(
            repair -> {
              String before = repair.getAssignedWorker();
              assembly.applyTechnicians(repair, workerNames);
              repository.save(repair);
              String after = repair.getAssignedWorker();
              if (!Objects.equals(before, after)) {
                activity.record(
                    repair, "ASSIGNED", after == null || after.isBlank() ? "Unassigned" : after);
              }
              return true;
            })
        .orElse(false);
  }

  @Transactional
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
      // No amount in the detail: shop-view users can read the feed.
      activity.record(repair, "PRICING", null);
      return true;
    }
    return false;
  }

  @Transactional
  public boolean updateServiceType(Long id, String newServiceType) {
    return repository
        .findById(id)
        .map(
            repair -> {
              String before = repair.getServiceType();
              assembly.applyServices(repair, newServiceType);
              repository.save(repair);
              String after = repair.getServiceType();
              if (!Objects.equals(before, after)) {
                activity.record(repair, "SERVICES", after);
              }
              return true;
            })
        .orElse(false);
  }

  @Transactional
  public boolean updateNotes(Long id, String notes) {
    return repository
        .findById(id)
        .map(
            repair -> {
              String before = repair.getNotes();
              // Blank and null both mean "no notes" - store one of them, not both.
              repair.setNotes(notes == null || notes.isBlank() ? null : notes);
              repository.save(repair);
              if (!Objects.equals(before, repair.getNotes())) {
                activity.record(repair, "NOTES", null);
              }
              return true;
            })
        .orElse(false);
  }

  @Transactional
  public boolean updateSeverity(Long id, int severity) {
    return repository
        .findById(id)
        .map(
            repair -> {
              int before = repair.getSeverity();
              repair.setSeverity(severity);
              repository.save(repair);
              if (before != severity) {
                activity.record(repair, "SEVERITY", "Level " + before + " → Level " + severity);
              }
              return true;
            })
        .orElse(false);
  }

  /** Records the deletion before the row is gone, so the feed can still name the car. */
  @Transactional
  public boolean deleteRepair(Long id) {
    return repository
        .findById(id)
        .map(
            repair -> {
              activity.record(repair, "DELETED", null);
              repository.delete(repair);
              return true;
            })
        .orElse(false);
  }

  private static String readable(String status) {
    return status == null ? "—" : status.replace('_', ' ');
  }
}
