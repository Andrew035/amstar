package com.amstar.repair.model;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "vehicle_repairs")
public class VehicleRepair {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String customerName;
    private String vehicleDetails; // e.g., "2018 Ford F-150"
    private String serviceType; // e.g., "Full Transmission Rebuild"

    private int severity; // Scale 1 (Low) to 5 (Critical/Hard Rebuild)
    private LocalDate entryDate;
    private LocalDate expectedCompletionDate;
    private String status; // PENDING, IN_PROGRESS, COMPLETED

    @Transient
    private double priorityScore;

    public VehicleRepair() {
    }

    public VehicleRepair(Long id, String customerName, String vehicleDetails, String serviceType, int severity,
            LocalDate entryDate, LocalDate expectedCompletionDate, String status) {
        this.id = id;
        this.customerName = customerName;
        this.vehicleDetails = vehicleDetails;
        this.serviceType = serviceType;
        this.severity = severity;
        this.entryDate = entryDate;
        this.expectedCompletionDate = expectedCompletionDate;
        this.status = status;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getVehicleDetails() {
        return vehicleDetails;
    }

    public void setVehicleDetails(String vehicleDetails) {
        this.vehicleDetails = vehicleDetails;
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
}
