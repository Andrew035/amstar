package com.amstar.repair.controller;

import com.amstar.repair.model.User;
import com.amstar.repair.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.Key;
import java.util.Date;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  // In production, store this securely in an environment variable!
  private final Key jwtSecretKey = Keys.secretKeyFor(SignatureAlgorithm.HS256);

  public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  // REGISTER ENDPOINT
  @PostMapping("/register")
  public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
    if (userRepository.findByUsername(request.get("username")).isPresent()) {
      return ResponseEntity.badRequest().body("Username already exists");
    }

    User user = new User();
    user.setUsername(request.get("username"));
    // Hash the password before saving to the db
    user.setPasswordHash(passwordEncoder.encode(request.get("password")));
    user.setRole("TECHNICIAN");

    userRepository.save(user);
    return ResponseEntity.ok("User registered successfully");
  }

  // LOGIN ENDPOINT (Generates JWT)
  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
    Optional<User> userOpt = userRepository.findByUsername(request.get("username"));

    // Check if user exists and password matches the hash
    if (userOpt.isPresent() && passwordEncoder.matches(request.get("password"), userOpt.get().getPasswordHash())) {

      // Generate a 10-hour JWT token
      String token = Jwts.builder()
          .setSubject(userOpt.get().getUsername())
          .claim("role", userOpt.get().getRole())
          .setIssuedAt(new Date())
          .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 10))
          .signWith(jwtSecretKey)
          .compact();

      return ResponseEntity.ok(Map.of("token", token));
    }

    return ResponseEntity.status(401).body("Invalid credentials");
  }
}
