package com.amstar.repair.model;

import java.util.List;
import java.util.Set;

/** Mirrors the users_role_valid CHECK constraint in V14__bookkeeper_role.sql */
public final class UserRole {
  public static final String ADMIN = "ADMIN";
  public static final String BOOKKEEPER = "BOOKKEEPER";

  public static final Set<String> ALL = Set.of(ADMIN, BOOKKEEPER);

  private UserRole() {}

  public static boolean isValid(String role) {
    return role != null && ALL.contains(role);
  }

  /**
   * The role an email is entitled to at registration, or null if it is on neither allowlist. Null
   * means refuse the registration: a shared signup code plus a default role is how a stranger gets
   * a working account.
   *
   * <p>Admin is checked first so an address on both lists keeps its manager rights - a typo in the
   * bookkeeper list must not be able to demote an owner.
   */
  public static String forEmail(
      String email, List<String> adminEmails, List<String> bookkeeperEmails) {
    if (email == null) {
      return null;
    }
    String normalized = email.trim().toLowerCase();
    if (adminEmails.contains(normalized)) {
      return ADMIN;
    }
    if (bookkeeperEmails.contains(normalized)) {
      return BOOKKEEPER;
    }
    return null;
  }
}
