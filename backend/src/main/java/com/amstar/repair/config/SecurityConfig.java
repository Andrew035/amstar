package com.amstar.repair.config;

import com.amstar.repair.security.JwtAuthenticationFilter;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  private final JwtAuthenticationFilter jwtFilter;

  @Value("${amstar.cors.allowed-origin}")
  private String allowedOrigin;

  // Inject custom JWT filter
  public SecurityConfig(JwtAuthenticationFilter jwtFilter) {
    this.jwtFilter = jwtFilter;
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(); // Industry standard for hashing
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        // Tell Spring Security to enable CORS using our configuration
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(csrf -> csrf.disable()) // Disable CSRF for stateless REST APIs
        .authorizeHttpRequests(
            auth ->
                auth
                    // Explicitly allow browser preflight requests
                    .requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()
                    // Revocation acts on the caller's own account, so it needs a
                    // valid token. Must precede the /api/auth/** permitAll below:
                    // the first matching rule wins, so the order is the rule.
                    .requestMatchers(HttpMethod.POST, "/api/auth/sign-out-everywhere")
                    .authenticated()
                    // Allow open access to auth endpoints
                    .requestMatchers("/api/auth/**")
                    .permitAll() // Open login/register
                    // Unmask backend errors (prevents 500 error from turning into 403s)
                    .requestMatchers("/error")
                    .permitAll()
                    // Any signed-in user may read the queue; writes below are ADMIN only.
                    .requestMatchers(HttpMethod.GET, "/api/repairs/**")
                    .authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/technicians", "/api/services")
                    .authenticated()
                    // Writes: managers only. Enforced here, not just in the UI.
                    .requestMatchers("/api/repairs/**")
                    .hasRole("ADMIN")
                    .requestMatchers("/api/technicians/**")
                    .hasRole("ADMIN")
                    .requestMatchers("/api/services/**")
                    .hasRole("ADMIN")
                    .anyRequest()
                    .authenticated())
        .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    // Allow the React frontend
    configuration.setAllowedOrigins(Arrays.asList(allowedOrigin));
    // Allow the standard HTTP methods
    configuration.setAllowedMethods(
        Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    // Allow headers like Content-Type and our Authorization token
    configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    // Apply these rules to all endpoints (/**)
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }
}
