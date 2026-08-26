package com.amstar.repair.model;

import jakarta.persistence.*;

@Entity
@Table(name = "services")
public class ServiceType {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 80)
  private String name;

  @Column(name = "default_severity", nullable = false)
  private int defaultSeverity = 3;

  @Column(name = "is_active", nullable = false)
  private Boolean isActive = true;

  public ServiceType() {
  }

  public ServiceType(String name, int defaultSeverity) {
    // services_name_uppercase CHECK will reject anything else
    this.name = name == null ? null : name.trim().toUpperCase();
    this.defaultSeverity = defaultSeverity;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public int getDefaultSeverity() {
    return defaultSeverity;
  }

  public void setDefaultSeverity(int defaultSeverity) {
    this.defaultSeverity = defaultSeverity;
  }

  public Boolean getIsActive() {
    return isActive;
  }

  public void setIsActive(Boolean isActive) {
    this.isActive = isActive;
  }
}
