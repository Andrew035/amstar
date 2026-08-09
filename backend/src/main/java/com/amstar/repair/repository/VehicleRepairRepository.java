package com.amstar.repair.repository;

import com.amstar.repair.model.VehicleRepair;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VehicleRepairRepository extends JpaRepository<VehicleRepair, Long> {
    List<VehicleRepair> findByStatusNot(String status);
}
