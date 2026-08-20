package com.amstar.repair.model;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "service_tickets")
public class VehicleRepair {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(cascade = CascadeType.ALL)
  @JoinColumn(name = "vehicle_id", referencedColumnName = "id")
  private Vehicle vehicle;

  private String customerName;
  private String serviceType; // e.g., "Full Transmission Rebuild"
  private int severity; // Scale 1 (Low) to 5 (Critical/Hard Rebuild)
  private LocalDate entryDate;
  private LocalDate expectedCompletionDate;
  private String status; // PENDING, IN_PROGRESS, COMPLETED

  private String assignedWorker;
  private LocalDate actualCompletionDate;

  private Double retailPrice = 0.0;
  private Double leasePrice = 0.0;
  private Double laborPrice = 0.0;
  private Boolean includeRetail = false;
  private Boolean includeLease = false;
  private Boolean includeLabor = false;

  @Transient
  private double priorityScore;

  public VehicleRepair() {
  }

  // Getters and Setters
  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Vehicle getVehicle() {
    return vehicle;
  }

  public void setVehicle(Vehicle vehicle) {
    this.vehicle = vehicle;
  }

  public String getCustomerName() {
    return customerName;
  }

  public void setCustomerName(String customerName) {
    this.customerName = customerName;
  }

  public String getServiceType() {
    return serviceType;
  }

  public void setServiceType(String serviceType) {
    this.serviceType = serviceType;
  }

  public int getSeverity() {
    return severity;
  }

  public void setSeverity(int severity) {
    this.severity = severity;
  }

  public LocalDate getEntryDate() {
    return entryDate;
  }

  public void setEntryDate(LocalDate entryDate) {
    this.entryDate = entryDate;
  }

  public LocalDate getExpectedCompletionDate() {
    return expectedCompletionDate;
  }

  public void setExpectedCompletionDate(LocalDate expectedCompletionDate) {
    this.expectedCompletionDate = expectedCompletionDate;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public double getPriorityScore() {
    return priorityScore;
  }

  public void setPriorityScore(double priorityScore) {
    this.priorityScore = priorityScore;
  }

  public String getAssignedWorker() {
    return assignedWorker;
  }

  public void setAssignedWorker(String assignedWorker) {
    this.assignedWorker = assignedWorker;
  }

  public LocalDate getActualCompletionDate() {
    return actualCompletionDate;
  }

  public void setActualCompletionDate(LocalDate actualCompletionDate) {
    this.actualCompletionDate = actualCompletionDate;
  }

  public Double getRetailPrice() {
    return retailPrice;
  }

  public void setRetailPrice(Double retailPrice) {
    this.retailPrice = retailPrice;
  }

  public Boolean getIncludeRetail() {
    return includeRetail;
  }

  public void setIncludeRetail(Boolean includeRetail) {
    this.includeRetail = includeRetail;
  }

  public Double getLeasePrice() {
    return leasePrice;
  }

  public void setLeasePrice(Double leasePrice) {
    this.leasePrice = leasePrice;
  }

  public Boolean getIncludeLease() {
    return includeLease;
  }

  public void setIncludeLease(Boolean includeLease) {
    this.includeLease = includeLease;
  }

  public Double getLaborPrice() {
    return laborPrice;
  }

  public void setLaborPrice(Double laborPrice) {
    this.laborPrice = laborPrice;
  }

  public Boolean getIncludeLabor() {
    return includeLabor;
  }

  public void setIncludeLabor(Boolean includeLabor) {
    this.includeLabor = includeLabor;
  }
}
