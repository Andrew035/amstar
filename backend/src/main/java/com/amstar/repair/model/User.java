package com.amstar.repair.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 160)
  private String email;

  @Column(nullable = false)
  private String username;

  @Column(nullable = false)
  private String passwordHash;

  @Column(name = "is_active", nullable = false)
  private Boolean isActive = true;

  private String role; // e.g., "ADMIN", "SHOP_VIEW"

  @Column(name = "token_version", nullable = false)
  private Integer tokenVersion = 0;

  // Getters and Setters
  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public Boolean getIsActive() {
    return isActive;
  }

  public void setIsActive(Boolean isActive) {
    this.isActive = isActive;
  }

  public String getRole() {
    return role;
  }

  public void setRole(String role) {
    this.role = role;
  }

  public Integer getTokenVersion() {
    return tokenVersion;
  }

  public void setTokenVersion(Integer tokenVersion) {
    this.tokenVersion = tokenVersion;
  }
}
