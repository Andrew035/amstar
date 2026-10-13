package com.amstar.repair.model;

import java.util.List;
import java.util.Map;
import java.util.Set;

/** Mirrors the users_role_valid CHECK constraint in V14__bookkeeper_role.sql */
public final class UserRole {
  public static final String ADMIN = "ADMIN";
  public static final String BOOKKEEPER = "BOOKKEEPER";
  public static final String TECHNICIAN = "TECHNICIAN";

  public static final Set<String> ALL = Set.of(ADMIN, BOOKKEEPER, TECHNICIAN);
  public static final Map<String, Integer> RANK = Map.of(TECHNICIAN, 1, BOOKKEEPER, 2, ADMIN, 3);

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

  /**
   * Rank, for the "only below yourself" rules. An unknown role ranks 0, so a token carrying a role
   * this build does not know grants nothing.
   */
  public static int rank(String role) {
    return role == null ? 0 : RANK.getOrDefault(role, 0);
  }

  /**
   * Whether {@code actor} may hand out {@code target}.
   *
   * <p>Strictly below, never equal: an admin cannot mint another admin, and a bookkeeper cannot
   * mint another bookkeeper. A second owner is deliberately a manual job - the email allowlist plus
   * the documented SQL update - so that no single compromised account can multiply itself.
   */
  public static boolean mayGrant(String actor, String target) {
    return isValid(target) && rank(target) < rank(actor);
  }

  /**
   * Whether {@code actor} may touch someone who is currently {@code target}.
   *
   * <p>Also strictly below, which is what stops two admins demoting each other.
   */
  public static boolean mayManage(String actor, String targetCurrent) {
    return rank(targetCurrent) > 0 && rank(targetCurrent) < rank(actor);
  }
}
