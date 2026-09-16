package com.amstar.repair.repository;

import com.amstar.repair.model.TicketActivity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketActivityRepository extends JpaRepository<TicketActivity, Long> {
  // Id breaks ties between events recorded in the same instant.
  List<TicketActivity> findTop30ByOrderByCreatedAtDescIdDesc();
}
