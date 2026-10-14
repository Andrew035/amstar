package com.amstar.repair.model;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "technicians")
public class Technician {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "full_name", nullable = false, length = 120)
  private String fullName;

  @Column(length = 20)
  private String phone;

  @Column(name = "hired_on")
  private LocalDate hiredOn;

  @Column(name = "is_active", nullable = false)
  private Boolean isActive = true;

  /**
   * The account behind this roster entry, or null for someone with no login.
   *
   * <p>A plain id, deliberately not a {@code @ManyToOne User}. A relation here would serialize the
   * whole account - email, password hash, token_version - straight out of GET /api/technicians,
   * which every signed-in role can read.
   */
  @Column(name = "user_id")
  private Long userId;

  /**
   * That account's role, for display on the roster.
   *
   * <p>Not a column: the role lives on `users`, and a roster entry with no account has none. Filled
   * in per request by AccountService.withRoles, the same shape as the comma strings VehicleRepair
   * exposes over the API.
   */
  @Transient private String role;

  /**
   * Whether that account can still sign in.
   *
   * <p>Null when there is no account. Without it the roster cannot tell a working login from a
   * revoked one, and showing them identically is the whole class of bug this field exists to stop.
   */
  @Transient private Boolean accountActive;

  public Technician() {
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getFullName() {
    return fullName;
  }

  public void setFullName(String fullName) {
    this.fullName = fullName;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public LocalDate getHiredOn() {
    return hiredOn;
  }

  public void setHiredOn(LocalDate hiredOn) {
    this.hiredOn = hiredOn;
  }

  public Boolean getIsActive() {
    return isActive;
  }

  public void setIsActive(Boolean isActive) {
    this.isActive = isActive;
  }

  public Long getUserId() {
    return userId;
  }

  public void setUserId(Long userId) {
    this.userId = userId;
  }

  public String getRole() {
    return role;
  }

  public void setRole(String role) {
    this.role = role;
  }

  public Boolean getAccountActive() {
    return accountActive;
  }

  public void setAccountActive(Boolean accountActive) {
    this.accountActive = accountActive;
  }
}
