package com.amstar.repair.service;

import com.amstar.repair.model.*;
import com.amstar.repair.repository.*;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Turns the inbound comma-delimited strings the frontend still sends
 * ("OIL CHANGE, TIRE ROTATION") into real customer / vehicle / service /
 * technician rows. Everything that writes a ticket goes through here.
 */
@Service
public class TicketAssemblyService {

  private final VehicleRepository vehicles;
  private final CustomerRepository customers;
  private final ServiceTypeRepository serviceTypes;
  private final TechnicianRepository technicians;

  public TicketAssemblyService(VehicleRepository vehicles,
      CustomerRepository customers,
      ServiceTypeRepository serviceTypes,
      TechnicianRepository technicians) {
    this.vehicles = vehicles;
    this.customers = customers;
    this.serviceTypes = serviceTypes;
    this.technicians = technicians;
  }

  /** Full assembly for a newly POSTed ticket. */
  public void assemble(VehicleRepair repair) {
    repair.setVehicle(resolveVehicle(repair.getVehicle()));
    repair.setCustomer(resolveCustomer(repair.getCustomerNameInput()));

    // A car with no recorded owner adopts this ticket's customer.
    Vehicle vehicle = repair.getVehicle();
    if (vehicle != null && vehicle.getCustomer() == null && repair.getCustomer() != null) {
      vehicle.setCustomer(repair.getCustomer());
      vehicles.save(vehicle);
    }

    applyServices(repair, repair.getServiceTypeInput());
    applyTechnicians(repair, repair.getAssignedWorkerInput());
  }

  // Vehicles: reuse a known car instead of inserting a duplicate
  private Vehicle resolveVehicle(Vehicle incoming) {
    if (incoming == null) {
      return null;
    }
    if (incoming.getId() != null) {
      return vehicles.findById(incoming.getId()).orElse(incoming);
    }

    // A full 17-char VIN is the strongest identity we have.
    String vin = trimToNull(incoming.getVin());
    if (vin != null && vin.length() == 17) {
      Optional<Vehicle> match = vehicles.findFirstByVinIgnoreCase(vin);
      if (match.isPresent()) {
        return refresh(match.get(), incoming);
      }
    }

    // Otherwise fall back to plate + state, which the unique index also enforces.
    String plate = trimToNull(incoming.getLicensePlate());
    String state = trimToNull(incoming.getState());
    if (plate != null && state != null) {
      Optional<Vehicle> match = vehicles.findFirstByLicensePlateIgnoreCaseAndStateIgnoreCase(plate, state);
      if (match.isPresent()) {
        return refresh(match.get(), incoming);
      }
    }

    return vehicles.save(incoming);
  }

  /**
   * Let a later NHTSA/Wikipedia lookup fill in blanks on a car we already know.
   */
  private Vehicle refresh(Vehicle existing, Vehicle incoming) {
    if (isBlank(existing.getMake())) {
      existing.setMake(incoming.getMake());
    }
    if (isBlank(existing.getModel())) {
      existing.setModel(incoming.getModel());
    }
    if (existing.getYear() == null) {
      existing.setYear(incoming.getYear());
    }
    if (isBlank(existing.getCarImageUrl())) {
      existing.setCarImageUrl(incoming.getCarImageUrl());
    }
    if (isBlank(existing.getVin())) {
      existing.setVin(trimToNull(incoming.getVin()));
    }
    return vehicles.save(existing);
  }

  // Customers

  private Customer resolveCustomer(String fullName) {
    String name = trimToNull(fullName);
    if (name == null) {
      return null;
    }
    return customers.findFirstByFullNameIgnoreCase(name).orElseGet(() -> customers.save(new Customer(name)));
  }

  // Services

  /** Replaces the ticket's services with the ones name in {@code csv}. */
  public void applyServices(VehicleRepair repair, String csv) {
    if (csv == null) {
      return; // field abset from the request: leave existing links alone
    }
    Set<ServiceType> resolved = new LinkedHashSet<>();
    for (String name : splitCsv(csv)) {
      String normalized = name.toUpperCase();
      // services.name is varchar(80); without this the DB rejects it as a 500.
      if (normalized.length() > 80) {
        throw new IllegalArgumentException(
            "Service name must be 80 characters or fewer: " + normalized.substring(0, 40) + "...");
      }
      resolved.add(serviceTypes.findByName(normalized)
          // A service typed into the form for the first time joines the catalog,
          // seeded with this ticket's severity - what historicalServiceMap did.
          .orElseGet(() -> serviceTypes.save(new ServiceType(normalized, repair.getSeverity()))));
    }
    repair.getServices().clear();
    repair.getServices().addAll(resolved);
  }

  // Technicians

  /** Replaces the ticket's technicians with the ones named in {@code csv}. */
  public void applyTechnicians(VehicleRepair repair, String csv) {
    if (csv == null) {
      return;
    }
    Set<Technician> resolved = new LinkedHashSet<>();
    for (String name : splitCsv(csv)) {
      // Unknown names are ignored on purpose: the roster is managed data,
      // not something a ticket write is allowed to invent.
      technicians.findByFullNameIgnoreCase(name).ifPresent(resolved::add);
    }
    repair.getTechnicians().clear();
    repair.getTechnicians().addAll(resolved);
  }

  // Helpers

  private static List<String> splitCsv(String raw) {
    if (raw == null || raw.isBlank()) {
      return List.of();
    }
    return Arrays.stream(raw.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .toList();
  }

  private static String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
