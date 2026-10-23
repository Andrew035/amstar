package com.amstar.repair.repository;

import com.amstar.repair.model.Customer;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
  // All of them, not the first: two people really can share a name, and
  // picking one arbitrarily is how they get merged.
  List<Customer> findByFullNameIgnoreCase(String fullName);
}
