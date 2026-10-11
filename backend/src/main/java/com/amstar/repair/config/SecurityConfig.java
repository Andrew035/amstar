package com.amstar.repair.config;

import com.amstar.repair.model.UserRole;
import com.amstar.repair.security.JwtAuthenticationFilter;
import java.util.Arrays;
import java.util.List;
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
  private List<String> allowedOrigins;

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
                    // Both roles run the shop floor and have the same authority
                    // over a ticket, the roster and the service catalog. The one
                    // thing the role decides is the Invoices page.
                    //
                    // /invoiced is left to ADMIN because it is that page's
                    // action and the bookkeeper has no UI for it. Be honest
                    // about what that is worth: she also has /status, so she
                    // could reach COMPLETED anyway. The split is organizational,
                    // not a defence. Must precede the rule below - the first
                    // matching rule wins, so the order is the rule.
                    .requestMatchers(HttpMethod.PATCH, "/api/repairs/*/invoiced")
                    .hasRole("ADMIN")
                    .requestMatchers("/api/repairs/**")
                    .hasAnyRole(UserRole.ADMIN, UserRole.BOOKKEEPER)
                    .requestMatchers("/api/technicians/**")
                    .hasAnyRole(UserRole.ADMIN, UserRole.BOOKKEEPER)
                    .requestMatchers("/api/services/**")
                    .hasAnyRole(UserRole.ADMIN, UserRole.BOOKKEEPER)
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
    configuration.setAllowedOrigins(allowedOrigins);
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
