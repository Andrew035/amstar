package com.amstar.repair.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity
@Table(name = "vehicles")
public class Vehicle {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "customer_id")
  private Customer customer;

  @Column(name = "license_plate", length = 12)
  @Size(max = 12, message = "License plate must be 12 characters or fewer")
  private String licensePlate;

  @Column(length = 2)
  @Size(min = 2, max = 2, message = "State must be a 2-letter code")
  private String state;

  @Column(length = 17)
  @Size(max = 17, message = "VIN must be 17 characters or fewer")
  private String vin;

  @Column(length = 60)
  @Size(max = 60, message = "Make must be 60 characters or fewer")
  private String make;

  @Column(length = 60)
  @Size(max = 60, message = "Model must be 60 characters or fewer")
  private String model;

  // Column renamed from "year": YEAR is a reserved word in several engines.
  @Column(name = "model_year")
  private Integer year;

  @Column(name = "car_image_url", length = 2000)
  @Pattern(regexp = "^$|^https://.*", message = "Car image URL must be https")
  private String carImageUrl;

  public Vehicle() {}

  // Getters and Setters

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Customer getCustomer() {
    return customer;
  }

  public void setCustomer(Customer customer) {
    this.customer = customer;
  }

  public String getLicensePlate() {
    return licensePlate;
  }

  public void setLicensePlate(String licensePlate) {
    this.licensePlate = licensePlate;
  }

  public String getState() {
    return state;
  }

  public void setState(String state) {
    this.state = state;
  }

  public String getVin() {
    return vin;
  }

  public void setVin(String vin) {
    this.vin = vin;
  }

  public String getMake() {
    return make;
  }

  public void setMake(String make) {
    this.make = make;
  }

  public String getModel() {
    return model;
  }

  public void setModel(String model) {
    this.model = model;
  }

  public Integer getYear() {
    return year;
  }

  public void setYear(Integer year) {
    this.year = year;
  }

  public String getCarImageUrl() {
    return carImageUrl;
  }

  public void setCarImageUrl(String carImageUrl) {
    this.carImageUrl = carImageUrl;
  }
}
