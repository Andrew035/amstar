package com.amstar.repair.repository;

import com.amstar.repair.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
  Optional<Vehicle> findFirstByVinIgnoreCase(String vin);

  Optional<Vehicle> findFirstByLicensePlateIgnoreCaseAndStateIgnoreCase(String plate, String state);
}
