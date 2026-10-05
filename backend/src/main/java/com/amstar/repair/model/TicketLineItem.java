package com.amstar.repair.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

@Entity
@Table(name = "ticket_line_items")
public class TicketLineItem {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "ticket_id", nullable = false)
  @JsonIgnore
  private VehicleRepair ticket;

  @Column(nullable = false, length = 200)
  @NotBlank(message = "A part needs a description")
  @Size(max = 200, message = "Description must be 200 characters or fewer")
  private String description;

  @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
  @DecimalMin(value = "0.00", message = "Price cannot be negative")
  private BigDecimal unitPrice = BigDecimal.ZERO;

  @Column(nullable = false)
  @Min(value = 1, message = "Quantity must be at least 1")
  private Integer quantity = 1;

  @Column(length = 60)
  @Size(max = 60, message = "Vendor must be 60 characters or fewer")
  private String vendor;

  @Column(nullable = false)
  private Integer position = 0;

  public BigDecimal lineTotal() {
    return unitPrice.multiply(BigDecimal.valueOf(quantity));
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  @JsonIgnore
  public VehicleRepair getTicket() {
    return ticket;
  }

  public void setTicket(VehicleRepair ticket) {
    this.ticket = ticket;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public BigDecimal getUnitPrice() {
    return unitPrice;
  }

  public void setUnitPrice(BigDecimal unitPrice) {
    this.unitPrice = unitPrice;
  }

  public Integer getQuantity() {
    return quantity;
  }

  public void setQuantity(Integer quantity) {
    this.quantity = quantity;
  }

  public String getVendor() {
    return vendor;
  }

  public void setVendor(String vendor) {
    this.vendor = vendor;
  }

  public Integer getPosition() {
    return position;
  }

  public void setPosition(Integer position) {
    this.position = position;
  }
}
