package com.amstar.repair.controller;

import com.amstar.repair.model.User;
import com.amstar.repair.repository.UserRepository;
import com.amstar.repair.security.JwtKeyProvider;
import com.amstar.repair.service.PasswordResetService;
import io.jsonwebtoken.Jwts;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private static final String EMAIL_PATTERN = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  /** Emails granted ADMIN at registration. Not secret, so they live in properties. */
  private final List<String> adminEmails;

  /** Shared shop signup code. From the environment - never committed. */
  private final String signupCode;

  // In production, store this securely in an environment variable!
  private final JwtKeyProvider jwtKeyProvider;

  private final PasswordResetService passwordResets;

  public AuthController(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      JwtKeyProvider jwtKeyProvider,
      PasswordResetService passwordResets,
      @Value("${amstar.auth.admin-emails:}") List<String> adminEmails,
      @Value("${amstar.auth.signup-code}") String signupCode) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtKeyProvider = jwtKeyProvider;
    this.passwordResets = passwordResets;
    this.adminEmails =
        adminEmails.stream().map(e -> e.trim().toLowerCase()).filter(e -> !e.isEmpty()).toList();
    this.signupCode = signupCode;
  }

  // REGISTER ENDPOINT
  @PostMapping("/register")
  public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
    String email = normalizeEmail(request.get("email"));
    String password = request.get("password");

    // Gate first: a stranger who can't produce the code learns nothing else.
    if (!MessageDigest.isEqual(
        signupCode.getBytes(StandardCharsets.UTF_8),
        String.valueOf(request.get("signupCode")).getBytes(StandardCharsets.UTF_8))) {
      return ResponseEntity.badRequest().body(Map.of("error", "Invalid signup code"));
    }
    if (email == null || !email.matches(EMAIL_PATTERN)) {
      return ResponseEntity.badRequest().body(Map.of("error", "A valid email address is required"));
    }
    if (password == null || password.length() < 8) {
      return ResponseEntity.badRequest()
          .body(Map.of("error", "Password must be at least 8 characters"));
    }
    if (userRepository.findByEmail(email).isPresent()) {
      return ResponseEntity.badRequest().body(Map.of("error", "That email is already registered"));
    }

    User user = new User();
    user.setEmail(email);
    user.setUsername(usernameFromEmail(email));
    user.setPasswordHash(passwordEncoder.encode(password));
    // The whole point: managers are recognized by their email at signup.
    user.setRole(adminEmails.contains(email) ? "ADMIN" : "SHOP_VIEW");

    userRepository.save(user);
    return ResponseEntity.ok(Map.of("message", "User registered successfully"));
  }

  // LOGIN ENDPOINT (Generates JWT)
  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
    Optional<User> userOpt = userRepository.findByEmail(normalizeEmail(request.get("email")));

    // Check if user exists and password matches the hash
    if (userOpt.isPresent()
        && Boolean.TRUE.equals(userOpt.get().getIsActive())
        && passwordEncoder.matches(request.get("password"), userOpt.get().getPasswordHash())) {
      User user = userOpt.get();

      // Generate a 10-hour JWT token. Subject is the display name; role carries
      // authority.
      String token =
          Jwts.builder()
              .setSubject(user.getUsername())
              .claim("role", user.getRole())
              .claim("email", user.getEmail())
              .claim("tv", user.getTokenVersion())
              .setIssuedAt(new Date())
              .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 10))
              .signWith(jwtKeyProvider.getKey())
              .compact();

      return ResponseEntity.ok(Map.of("token", token));
    }

    return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
  }

  /**
   * Invalidates every token already issued to this account. Use after a suspected leak, or when
   * someone leaves.
   */
  @PostMapping("/sign-out-everywhere")
  public ResponseEntity<?> signOutEverywhere(java.security.Principal principal) {
    if (principal == null) {
      return ResponseEntity.status(401).body(Map.of("error", "Sign in first."));
    }

    userRepository
        .findByEmail(normalizeEmail(principal.getName()))
        .ifPresent(
            u -> {
              u.setTokenVersion(u.getTokenVersion() + 1);
              userRepository.save(u);
            });
    return ResponseEntity.ok(Map.of("message", "Signed out on all devices."));
  }

  /** "mike@amstar.com" -> "mike". Truncated to the column width. */
  private static String usernameFromEmail(String email) {
    String local = email.substring(0, email.indexOf('@'));
    return local.length() > 50 ? local.substring(0, 50) : local;
  }

  private static String normalizeEmail(String raw) {
    return raw == null ? null : raw.trim().toLowerCase();
  }

  /** Always 200: never reveal whether an address is registered. */
  @PostMapping("/forgot-password")
  public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
    passwordResets.requestReset(normalizeEmail(request.get("email")));
    return ResponseEntity.ok(
        Map.of("message", "If that address has an account, a reset link is on its way."));
  }

  @PostMapping("/reset-password")
  public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
    boolean ok = passwordResets.resetPassword(request.get("token"), request.get("password"));
    if (ok) {
      return ResponseEntity.ok(Map.of("message", "Password updated. You can sign in now."));
    }
    return ResponseEntity.badRequest()
        .body(Map.of("error", "That reset link is invalid or has expired. Request a new one."));
  }
}
