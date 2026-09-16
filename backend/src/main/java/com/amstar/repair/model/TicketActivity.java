package com.amstar.repair.model;

import jakarta.persistence.*;
import java.time.Instant;

/** One change to a repair ticket, for the dashboard activity feed. */
@Entity
@Table(name = "ticket_activity")
public class TicketActivity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  // A plain id rather than a relation: the ticket may since have been deleted.
  @Column(name = "ticket_id")
  private Long ticketId;

  @Column(name = "ticket_label", nullable = false, length = 200)
  private String ticketLabel;

  @Column(nullable = false, length = 160)
  private String actor;

  @Column(nullable = false, length = 20)
  private String action;

  @Column(length = 500)
  private String detail;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public TicketActivity() {}

  public TicketActivity(
      Long ticketId, String ticketLabel, String actor, String action, String detail) {
    this.ticketId = ticketId;
    this.ticketLabel = ticketLabel;
    this.actor = actor;
    this.action = action;
    this.detail = detail;
    this.createdAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public Long getTicketId() {
    return ticketId;
  }

  public String getTicketLabel() {
    return ticketLabel;
  }

  public String getActor() {
    return actor;
  }

  public String getAction() {
    return action;
  }

  public String getDetail() {
    return detail;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
