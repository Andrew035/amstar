package com.amstar.repair.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "service_tickets")
public class VehicleRepair {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "vehicle_id", nullable = false)
  @NotNull(message = "A vehicle is required")
  @Valid
  private Vehicle vehicle;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "customer_id")
  private Customer customer;

  @Column(nullable = false)
  @Min(value = 1, message = "Severity must be between 1 and 5")
  @Max(value = 5, message = "Severity must be between 1 and 5")
  private int severity;

  @Column(nullable = false, length = 20)
  private String status = "PENDING";

  @Column(name = "entry_date", nullable = false)
  private LocalDate entryDate;

  @Column(name = "expected_completion_date", nullable = false)
  @NotNull(message = "An expected completion date is required")
  private LocalDate expectedCompletionDate;

  @Column(name = "actual_completion_date")
  private LocalDate actualCompletionDate;

  @Column(name = "retail_price", nullable = false, precision = 10, scale = 2)
  private BigDecimal retailPrice = BigDecimal.ZERO;

  @Column(name = "lease_price", nullable = false, precision = 10, scale = 2)
  private BigDecimal leasePrice = BigDecimal.ZERO;

  @Column(name = "labor_price", nullable = false, precision = 10, scale = 2)
  private BigDecimal laborPrice = BigDecimal.ZERO;

  @Column(name = "include_retail", nullable = false)
  private Boolean includeRetail = false;

  @Column(name = "include_lease", nullable = false)
  private Boolean includeLease = false;

  @Column(name = "include_labor", nullable = false)
  private Boolean includeLabor = false;

  @Column(columnDefinition = "TEXT")
  private String notes;

  @ManyToMany(fetch = FetchType.EAGER)
  @OrderBy("name")
  @JoinTable(name = "ticket_services", joinColumns = @JoinColumn(name = "ticket_id"), inverseJoinColumns = @JoinColumn(name = "service_id"))
  private Set<ServiceType> services = new LinkedHashSet<>();

  @ManyToMany(fetch = FetchType.EAGER)
  @OrderBy("fullName")
  @JoinTable(name = "ticket_technicians", joinColumns = @JoinColumn(name = "ticket_id"), inverseJoinColumns = @JoinColumn(name = "technician_id"))
  private Set<Technician> technicians = new LinkedHashSet<>();

  @Transient
  private double priorityScore;

  // Inbound comma strings, parked here until the service layer resolves
  // them into rows. Never persisted; see PriorityQueueService.
  @Transient
  private String serviceTypeInput;

  @Transient
  private String assignedWorkerInput;

  @Transient
  @Size(max = 120, message = "Customer name must be 120 characters or fewer")
  private String customerNameInput;

  public VehicleRepair() {
  }

  // Legacy JSON compatibility
  // The frontend still reads serviceType/assignedWorker/customerName as
  // comma-joined strings. These getters rebuild them from the join tables
  // so no page has to change yet. Hibernate uses field access (@Id is on a
  // field), so it ignores these getters entirely.

  @JsonProperty("serviceType")
  public String getServiceType() {
    return services.stream()
        .map(ServiceType::getName)
        .collect(Collectors.joining(", "));
  }

  @JsonProperty("serviceType")
  public void setServiceType(String serviceType) {
    this.serviceTypeInput = serviceType;
  }

  @JsonProperty("assignedWorker")
  public String getAssignedWorker() {
    return technicians.stream()
        .map(Technician::getFullName)
        .collect(Collectors.joining(", "));
  }

  @JsonProperty("assignedWorker")
  public void setAssignedWorker(String assignedWorker) {
    this.assignedWorkerInput = assignedWorker;
  }

  @JsonProperty("customerName")
  public String getCustomerName() {
    return customer == null ? null : customer.getFullName();
  }

  @JsonProperty("customerName")
  public void setCustomerName(String customerName) {
    this.customerNameInput = customerName;
  }

  @JsonIgnore
  public String getServiceTypeInput() {
    return serviceTypeInput;
  }

  @JsonIgnore
  public String getAssignedWorkerInput() {
    return assignedWorkerInput;
  }

  @JsonIgnore
  public String getCustomerNameInput() {
    return customerNameInput;
  }

  // Standard accessors

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

  public Customer getCustomer() {
    return customer;
  }

  public void setCustomer(Customer customer) {
    this.customer = customer;
  }

  public int getSeverity() {
    return severity;
  }

  public void setSeverity(int severity) {
    this.severity = severity;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
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

  public LocalDate getActualCompletionDate() {
    return actualCompletionDate;
  }

  public void setActualCompletionDate(LocalDate actualCompletionDate) {
    this.actualCompletionDate = actualCompletionDate;
  }

  public BigDecimal getRetailPrice() {
    return retailPrice;
  }

  public void setRetailPrice(BigDecimal retailPrice) {
    this.retailPrice = retailPrice;
  }

  public BigDecimal getLeasePrice() {
    return leasePrice;
  }

  public void setLeasePrice(BigDecimal leasePrice) {
    this.leasePrice = leasePrice;
  }

  public BigDecimal getLaborPrice() {
    return laborPrice;
  }

  public void setLaborPrice(BigDecimal laborPrice) {
    this.laborPrice = laborPrice;
  }

  public Boolean getIncludeRetail() {
    return includeRetail;
  }

  public void setIncludeRetail(Boolean includeRetail) {
    this.includeRetail = includeRetail;
  }

  public Boolean getIncludeLease() {
    return includeLease;
  }

  public void setIncludeLease(Boolean includeLease) {
    this.includeLease = includeLease;
  }

  public Boolean getIncludeLabor() {
    return includeLabor;
  }

  public void setIncludeLabor(Boolean includeLabor) {
    this.includeLabor = includeLabor;
  }

  public Set<ServiceType> getServices() {
    return services;
  }

  public void setServices(Set<ServiceType> services) {
    this.services = services;
  }

  public Set<Technician> getTechnicians() {
    return technicians;
  }

  public void setTechnicians(Set<Technician> technicians) {
    this.technicians = technicians;
  }

  public double getPriorityScore() {
    return priorityScore;
  }

  public void setPriorityScore(double priorityScore) {
    this.priorityScore = priorityScore;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }
}
