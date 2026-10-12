package com.amstar.repair;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.amstar.repair.model.UserRole;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Who a registration is allowed to become. No Spring context: this is pure policy. */
class RegistrationRoleTest {

  private static final List<String> ADMINS = List.of("boss@shop.com");
  private static final List<String> BOOKS = List.of("books@shop.com");

  @Test
  void adminEmailGetsAdmin() {
    assertEquals(UserRole.ADMIN, UserRole.forEmail("boss@shop.com", ADMINS, BOOKS));
  }

  @Test
  void bookkeeperEmailGetsBookkeeper() {
    assertEquals(UserRole.BOOKKEEPER, UserRole.forEmail("books@shop.com", ADMINS, BOOKS));
  }

  /** The open door this closes: a stranger with the shared signup code. */
  @Test
  void unlistedEmailGetsNoRole() {
    assertNull(UserRole.forEmail("stranger@gmail.com", ADMINS, BOOKS));
  }

  @Test
  void matchingIgnoresCaseAndSurroundingSpace() {
    assertEquals(UserRole.ADMIN, UserRole.forEmail("  BOSS@shop.com ", ADMINS, BOOKS));
  }

  /** Admin wins if an address is on both lists, so a typo cannot demote an owner. */
  @Test
  void adminWinsOverBookkeeper() {
    assertEquals(
        UserRole.ADMIN, UserRole.forEmail("boss@shop.com", ADMINS, List.of("boss@shop.com")));
  }

  /** A role string from a token issued before the rename is not a valid role. */
  @Test
  void legacyShopViewIsNotAValidRole() {
    assertFalse(UserRole.isValid("SHOP_VIEW"));
  }

  @Test
  void aNullEmailGetsNoRole() {
    assertNull(UserRole.forEmail(null, ADMINS, BOOKS));
  }
}
