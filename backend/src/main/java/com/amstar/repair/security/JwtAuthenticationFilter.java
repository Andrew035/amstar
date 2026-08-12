package com.amstar.repair.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.Key;
import java.util.ArrayList;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  // For development, I hardcoded a 32+ byte string so the Controller and Filter
  // share the exact same key.
  // (In production, this would be moved to an environment variable!)
  public static final String SECRET = "AMStarTransmissionsSuperSecretKeyThatIsAtLeast32BytesLong!";
  private final Key key = Keys.hmacShaKeyFor(SECRET.getBytes());

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");

    // If there's no token, continue the chain (Spring Security will block it later
    // if the endpoint is secured)
    if (header == null || !header.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    String token = header.replace("Bearer ", "");

    try {
      // Validate the token and extract the claims
      Claims claims = Jwts.parserBuilder()
          .setSigningKey(key)
          .build()
          .parseClaimsJws(token)
          .getBody();

      String username = claims.getSubject();

      // If valid, tell Spring Security this user is officially authenticated
      if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(username, null,
            new ArrayList<>());
        SecurityContextHolder.getContext().setAuthentication(auth);
      }
    } catch (Exception e) {
      // If the token is expired or tampered with, reject the request
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      return;
    }

    filterChain.doFilter(request, response);
  }
}
