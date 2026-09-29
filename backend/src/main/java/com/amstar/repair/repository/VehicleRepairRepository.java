package com.amstar.repair.repository;

import com.amstar.repair.model.VehicleRepair;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRepairRepository extends JpaRepository<VehicleRepair, Long> {

  /** How many tickets still point at this car. Zero means the vehicle row is an orphan. */
  long countByVehicleId(Long vehicleId);
}
