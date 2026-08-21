package com.amstar.repair.model;

import jakarta.persistence.*;

@Entity
@Table(name = "vehicles")
public class Vehicle {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String licensePlate;
  private String state;
  private String vin;
  private String make;
  private String model;
  private Integer year;

  @Column(length = 2000)
  private String carImageUrl;

  public Vehicle() {
  }

  // Getters and Setters
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
