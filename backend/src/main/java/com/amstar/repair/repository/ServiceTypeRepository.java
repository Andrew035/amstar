package com.amstar.repair.repository;

import com.amstar.repair.model.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServiceTypeRepository extends JpaRepository<ServiceType, Long> {
  Optional<ServiceType> findByName(String name); // names are always uppercase

  List<ServiceType> findByIsActiveTrueOrderByNameAsc();
}
