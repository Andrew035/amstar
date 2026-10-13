package com.amstar.repair.controller;

import com.amstar.repair.model.ServiceType;
import com.amstar.repair.model.Technician;
import com.amstar.repair.model.User;
import com.amstar.repair.model.UserRole;
import com.amstar.repair.repository.ServiceTypeRepository;
import com.amstar.repair.repository.TechnicianRepository;
import com.amstar.repair.service.AccountService;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ReferenceDataController {

  private final TechnicianRepository technicians;
  private final ServiceTypeRepository serviceTypes;
  private final AccountService accounts;

  public ReferenceDataController(
      TechnicianRepository technicians,
      ServiceTypeRepository serviceTypes,
      AccountService accounts) {
    this.technicians = technicians;
    this.serviceTypes = serviceTypes;
    this.accounts = accounts;
  }

  @GetMapping("/technicians")
  public List<Technician> listTechnicians(
      @RequestParam(defaultValue = "false") boolean includeInactive) {
    return accounts.withRoles(
        includeInactive
            ? technicians.findAllByOrderByFullNameAsc()
            : technicians.findByIsActiveTrueOrderByFullNameAsc());
  }

  @PostMapping("/technicians")
  public ResponseEntity<?> addTechnician(@RequestBody Technician technician) {
    if (technician.getFullName() == null || technician.getFullName().isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Name is required"));
    }
    if (technicians.findByFullNameIgnoreCase(technician.getFullName()).isPresent()) {
      return ResponseEntity.badRequest().body(Map.of("error", "That technician already exists"));
    }
    technician.setId(null);
    technician.setIsActive(true);
    return ResponseEntity.ok(technicians.save(technician));
  }

  /** Deactivates rather than deletes: old tickets must keep pointing at a real now. */
  @PatchMapping("/technicians/{id}")
  public ResponseEntity<?> updateTechnician(
      @PathVariable Long id, @RequestBody Map<String, Object> request) {
    return technicians
        .findById(id)
        .<ResponseEntity<?>>map(
            tech -> {
              if (request.get("fullName") instanceof String name && !name.isBlank()) {
                String trimmed = name.trim();
                // Renaming onto someone else's name violates uq_technicians_name,
                // which would surface as an unhelpful 409.
                boolean taken =
                    technicians
                        .findByFullNameIgnoreCase(trimmed)
                        .filter(other -> !other.getId().equals(tech.getId()))
                        .isPresent();
                if (taken) {
                  return ResponseEntity.badRequest()
                      .body(Map.of("error", "That technician already exists"));
                }
                tech.setFullName(trimmed);
              }
              if (request.get("isActive") instanceof Boolean active) {
                tech.setIsActive(active);
              }
              return ResponseEntity.ok(technicians.save(tech));
            })
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /**
   * Changes the role of the account behind a roster entry.
   *
   * <p>Both halves of the hierarchy are checked here and nowhere else: the UI hides what you cannot
   * do, but SecurityConfig only knows that you are ADMIN or BOOKKEEPER, not who you are allowed to
   * outrank.
   */
  @PatchMapping("/technicians/{id}/role")
  public ResponseEntity<?> updateRole(
      @PathVariable Long id,
      @RequestBody Map<String, String> request,
      java.security.Principal principal) {
    String requested = request.get("role");
    Technician tech = technicians.findById(id).orElse(null);
    if (tech == null) {
      return ResponseEntity.notFound().build();
    }
    if (tech.getUserId() == null) {
      return ResponseEntity.badRequest()
          .body(Map.of("error", "That person does not have an account yet. Invite them first."));
    }

    User actor = accounts.byEmail(principal.getName()).orElseThrow();
    User target = accounts.byId(tech.getUserId()).orElseThrow();

    // Yourself is the one case the hierarchy cannot express: your own rank is
    // never strictly below your own, but the error should say why.
    if (target.getId().equals(actor.getId())) {
      return ResponseEntity.badRequest().body(Map.of("error", "You cannot change your own role."));
    }
    if (!UserRole.mayManage(actor.getRole(), target.getRole())) {
      return ResponseEntity.status(403)
          .body(Map.of("error", "You can only change the role of someone below you."));
    }
    if (!UserRole.mayGrant(actor.getRole(), requested)) {
      return ResponseEntity.badRequest()
          .body(Map.of("error", "You can only grant a role below your own."));
    }

    return ResponseEntity.ok(Map.of("role", accounts.changeRole(target, requested)));
  }

  /**
   * Points a roster entry at an account that already exists.
   *
   * <p>Needed because the roster could not hold an account until V20: everyone who was already
   * signing in - the owners, the bookkeeper - has a users row with nothing joining it to their name
   * on the roster. Inviting them would fail, correctly, because the address is taken.
   *
   * <p>Allowed for yourself, or for anyone ranked strictly below you. The self case is the one the
   * hierarchy cannot express and the one an owner needs first: an owner who also turns a wrench has
   * to be able to put their own name on the roster. An owner still cannot link the <em>other</em>
   * owner, which is the same rule that stops two admins editing each other.
   */
  @PatchMapping("/technicians/{id}/account")
  public ResponseEntity<?> linkAccount(
      @PathVariable Long id,
      @RequestBody Map<String, String> request,
      java.security.Principal principal) {

    Technician tech = technicians.findById(id).orElse(null);
    if (tech == null) {
      return ResponseEntity.notFound().build();
    }
    if (tech.getUserId() != null) {
      return ResponseEntity.badRequest()
          .body(Map.of("error", "That person is already linked to an account."));
    }

    String email = request.get("email");
    if (email == null || email.isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("error", "An email address is required"));
    }
    User target = accounts.byEmail(email.trim().toLowerCase()).orElse(null);
    if (target == null) {
      // Says plainly that no such account exists. This endpoint is already
      // behind a staff login, and the alternative - a vague refusal - makes the
      // one screen that fixes a typo impossible to use.
      return ResponseEntity.badRequest()
          .body(Map.of("error", "No account is registered with that email."));
    }

    User actor = accounts.byEmail(principal.getName()).orElseThrow();
    boolean self = target.getId().equals(actor.getId());
    if (!self && !UserRole.mayManage(actor.getRole(), target.getRole())) {
      return ResponseEntity.status(403)
          .body(Map.of("error", "You can only link your own account, or one below your own."));
    }

    Technician alreadyLinked = accounts.rosterEntryFor(target.getId()).orElse(null);
    if (alreadyLinked != null) {
      return ResponseEntity.badRequest()
          .body(
              Map.of(
                  "error",
                  "That account is already linked to " + alreadyLinked.getFullName() + "."));
    }

    accounts.link(tech, target);
    return ResponseEntity.ok(Map.of("role", target.getRole()));
  }

  /** Breaks the link. The account and the roster entry both survive it. */
  @DeleteMapping("/technicians/{id}/account")
  public ResponseEntity<?> unlinkAccount(
      @PathVariable Long id, java.security.Principal principal) {

    Technician tech = technicians.findById(id).orElse(null);
    if (tech == null) {
      return ResponseEntity.notFound().build();
    }
    if (tech.getUserId() == null) {
      return ResponseEntity.badRequest()
          .body(Map.of("error", "That person has no account linked."));
    }

    User actor = accounts.byEmail(principal.getName()).orElseThrow();
    User target = accounts.byId(tech.getUserId()).orElseThrow();
    boolean self = target.getId().equals(actor.getId());
    if (!self && !UserRole.mayManage(actor.getRole(), target.getRole())) {
      return ResponseEntity.status(403)
          .body(Map.of("error", "You can only unlink your own account, or one below your own."));
    }

    accounts.unlink(tech);
    return ResponseEntity.ok(Map.of("unlinked", true));
  }

  /**
   * Gives a roster entry an account and mails them an invite.
   *
   * <p>Guarded by the same rule as a role change: you may only invite someone at a rank strictly
   * below your own, so a bookkeeper can bring on a technician and only an owner can bring on a
   * bookkeeper. Nobody can invite an admin, which is why a second owner stays a deliberate manual
   * job.
   */
  @PostMapping("/technicians/{id}/invite")
  public ResponseEntity<?> inviteTechnician(
      @PathVariable Long id,
      @RequestBody Map<String, String> request,
      java.security.Principal principal) {

    String email = request.get("email");
    String role = request.getOrDefault("role", UserRole.TECHNICIAN);

    Technician tech = technicians.findById(id).orElse(null);
    if (tech == null) {
      return ResponseEntity.notFound().build();
    }
    if (email == null || !email.contains("@") || email.isBlank()) {
      return ResponseEntity.badRequest()
          .body(Map.of("error", "A valid email address is required"));
    }
    String normalized = email.trim().toLowerCase();

    User actor = accounts.byEmail(principal.getName()).orElseThrow();
    if (!UserRole.mayGrant(actor.getRole(), role)) {
      return ResponseEntity.status(403)
          .body(Map.of("error", "You can only invite someone at a role below your own."));
    }

    // Already linked: re-send rather than create a second account, which is the
    // recovery path when the first email bounced or expired.
    if (tech.getUserId() != null) {
      User existing = accounts.byId(tech.getUserId()).orElseThrow();
      if (Boolean.TRUE.equals(existing.getIsActive())) {
        return ResponseEntity.badRequest()
            .body(
                Map.of(
                    "error",
                    "That person already has an account. Change their role instead of inviting"
                        + " them again."));
      }
      if (!UserRole.mayManage(actor.getRole(), existing.getRole())) {
        return ResponseEntity.status(403)
            .body(Map.of("error", "You can only change the role of someone below you."));
      }
      return ResponseEntity.ok(Map.of("emailed", accounts.reinvite(existing)));
    }

    if (accounts.byEmail(normalized).isPresent()) {
      return ResponseEntity.badRequest()
          .body(Map.of("error", "That email already has an account"));
    }

    AccountService.Invitation invited = accounts.invite(tech, normalized, role);
    return ResponseEntity.ok(Map.of("role", role, "emailed", invited.emailed()));
  }

  @GetMapping("/services")
  public List<ServiceType> listServices() {
    return serviceTypes.findByIsActiveTrueOrderByNameAsc();
  }

  @PatchMapping("/services/{id}")
  public ResponseEntity<?> updateService(
      @PathVariable Long id, @RequestBody Map<String, Object> request) {
    return serviceTypes
        .findById(id)
        .map(
            service -> {
              if (request.get("name") instanceof String name && !name.isBlank()) {
                service.setName(name.trim().toUpperCase()); // service_name_uppercase
              }
              if (request.get("defaultSeverity") instanceof Number severity) {
                int value = severity.intValue();
                if (value < 1 || value > 5) {
                  return ResponseEntity.badRequest()
                      .body(Map.<String, Object>of("error", "Severity must be between 1 and 5"));
                }
                service.setDefaultSeverity(value);
              }
              if (request.get("isActive") instanceof Boolean active) {
                service.setIsActive(active);
              }
              return ResponseEntity.ok(serviceTypes.save(service));
            })
        .orElseGet(() -> ResponseEntity.notFound().build());
  }
}
