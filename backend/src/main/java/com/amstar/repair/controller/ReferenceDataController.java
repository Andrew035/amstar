package com.amstar.repair.controller;

import com.amstar.repair.model.ServiceType;
import com.amstar.repair.model.Technician;
import com.amstar.repair.repository.ServiceTypeRepository;
import com.amstar.repair.repository.TechnicianRepository;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ReferenceDataController {

  private final TechnicianRepository technicians;
  private final ServiceTypeRepository serviceTypes;

  public ReferenceDataController(
      TechnicianRepository technicians, ServiceTypeRepository serviceTypes) {
    this.technicians = technicians;
    this.serviceTypes = serviceTypes;
  }

  @GetMapping("/technicians")
  public List<Technician> listTechnicians(
      @RequestParam(defaultValue = "false") boolean includeInactive) {
    return includeInactive
        ? technicians.findAllByOrderByFullNameAsc()
        : technicians.findByIsActiveTrueOrderByFullNameAsc();
  }

  @PostMapping("/technicians")
  public ResponseEntity<?> addTechnician(@RequestBody Technician technician) {
    if (technician.getFullName() == null || technician.getFullName().isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Name is required"));
    }
    if (technicians.findByFullNameIgnoreCase(technician.getFullName()).isPresent()) {
      return ResponseEntity.badRequest().body(Map.of("error", "That technician already exists"));
    }
    technician.setId(null);
    technician.setIsActive(true);
    return ResponseEntity.ok(technicians.save(technician));
  }

  /** Deactivates rather than deletes: old tickets must keep pointing at a real now. */
  @PatchMapping("/technicians/{id}")
  public ResponseEntity<?> updateTechnician(
      @PathVariable Long id, @RequestBody Map<String, Object> request) {
    return technicians
        .findById(id)
        .<ResponseEntity<?>>map(
            tech -> {
              if (request.get("fullName") instanceof String name && !name.isBlank()) {
                String trimmed = name.trim();
                // Renaming onto someone else's name violates uq_technicians_name,
                // which would surface as an unhelpful 409.
                boolean taken =
                    technicians
                        .findByFullNameIgnoreCase(trimmed)
                        .filter(other -> !other.getId().equals(tech.getId()))
                        .isPresent();
                if (taken) {
                  return ResponseEntity.badRequest()
                      .body(Map.of("error", "That technician already exists"));
                }
                tech.setFullName(trimmed);
              }
              if (request.get("isActive") instanceof Boolean active) {
                tech.setIsActive(active);
              }
              return ResponseEntity.ok(technicians.save(tech));
            })
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @GetMapping("/services")
  public List<ServiceType> listServices() {
    return serviceTypes.findByIsActiveTrueOrderByNameAsc();
  }

  @PatchMapping("/services/{id}")
  public ResponseEntity<?> updateService(
      @PathVariable Long id, @RequestBody Map<String, Object> request) {
    return serviceTypes
        .findById(id)
        .map(
            service -> {
              if (request.get("name") instanceof String name && !name.isBlank()) {
                service.setName(name.trim().toUpperCase()); // service_name_uppercase
              }
              if (request.get("defaultSeverity") instanceof Number severity) {
                int value = severity.intValue();
                if (value < 1 || value > 5) {
                  return ResponseEntity.badRequest()
                      .body(Map.<String, Object>of("error", "Severity must be between 1 and 5"));
                }
                service.setDefaultSeverity(value);
              }
              if (request.get("isActive") instanceof Boolean active) {
                service.setIsActive(active);
              }
              return ResponseEntity.ok(serviceTypes.save(service));
            })
        .orElseGet(() -> ResponseEntity.notFound().build());
  }
}
