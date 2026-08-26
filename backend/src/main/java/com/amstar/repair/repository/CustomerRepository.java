package com.amstar.repair.repository;

import com.amstar.repair.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
  Optional<Customer> findFirstByFullNameIgnoreCase(String fullName);
}
