package com.amstar.repair.security;

import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;

/**
 * Single source of the HS256 siging key. Both the filter that validates tokens
 * and the controller that issues them depend on this bean, so they cannot
 * drift.
 */
@Component
public class JwtKeyProvider {

  private final Key key;

  public JwtKeyProvider(@Value("${amstar.auth.jwt-secret}") String secret) {
    byte[] bytes = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
    if (bytes.length < 32) {
      throw new IllegalStateException("amstar.auth.jwt-secret must be at least 32 bytes (got " + bytes.length + ")");
    }
    this.key = Keys.hmacShaKeyFor(bytes);
  }

  public Key getKey() {
    return key;
  }
}
