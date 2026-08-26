package com.amstar.repair.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtKeyProvider keyProvider;

  public JwtAuthenticationFilter(JwtKeyProvider keyProvider) {
    this.keyProvider = keyProvider;
  }

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
      Claims claims = Jwts.parserBuilder()
          .setSigningKey(keyProvider.getKey())
          .build()
          .parseClaimsJws(token)
          .getBody();

      String username = claims.getSubject();
      String role = claims.get("role", String.class);

      if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
        // The "ROLE_" prefix is the convention hasRole("ADMIN") looks for.
        // The role comes from the signed token, so a client cannot forge it
        // without the key.
        List<GrantedAuthority> authorities = role == null
            ? List.<GrantedAuthority>of()
            : List.<GrantedAuthority>of(new SimpleGrantedAuthority("ROLE_" + role));

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(username, null, authorities);
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
