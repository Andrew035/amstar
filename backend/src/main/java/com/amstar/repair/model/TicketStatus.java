package com.amstar.repair.model;

import java.util.Set;

/**
 * Mirrors the tickets_status_valid CHECK contraint in V1__initial_schema.sql.
 */
public final class TicketStatus {
  public static final Set<String> ALL = Set.of("PENDING", "IN_PROGRESS", "COMPLETED");

  private TicketStatus() {
  }

  public static boolean isValid(String status) {
    return status != null && ALL.contains(status);
  }
}
