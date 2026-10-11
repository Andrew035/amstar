package com.amstar.repair.model;

import java.util.Set;

/** Mirrors the tickets_status_valid CHECK constraint in V15__ready_for_invoice_status.sql. */
public final class TicketStatus {
  public static final String PENDING = "PENDING";
  public static final String IN_PROGRESS = "IN_PROGRESS";

  /** The work is done and the invoice can be written. Deliberately not COMPLETED. */
  public static final String READY_FOR_INVOICE = "READY_FOR_INVOICE";

  public static final String COMPLETED = "COMPLETED";

  public static final Set<String> ALL = Set.of(PENDING, IN_PROGRESS, READY_FOR_INVOICE, COMPLETED);

  private TicketStatus() {}

  public static boolean isValid(String status) {
    return status != null && ALL.contains(status);
  }
}
