package com.amstar.repair.repository;

import com.amstar.repair.model.Technician;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TechnicianRepository extends JpaRepository<Technician, Long> {
  Optional<Technician> findByFullNameIgnoreCase(String fullName);

  List<Technician> findByIsActiveTrueOrderByFullNameAsc();
}
