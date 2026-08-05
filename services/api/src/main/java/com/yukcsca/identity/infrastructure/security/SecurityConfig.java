package com.yukcsca.identity.infrastructure.security;

import com.yukcsca.identity.application.SecurityEventService;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class SecurityConfig {
  @Bean
  Clock clock() {
    return Clock.systemUTC();
  }

  @Bean
  SecretKey jwtSecretKey(AuthProperties properties) {
    byte[] bytes = properties.jwtSecret().getBytes(StandardCharsets.UTF_8);
    if (bytes.length < 32) {
      throw new IllegalStateException("YUKCSCA_JWT_SECRET must contain at least 32 bytes.");
    }
    return new SecretKeySpec(bytes, "HmacSHA256");
  }

  @Bean
  JwtEncoder jwtEncoder(SecretKey secretKey) {
    return NimbusJwtEncoder.withSecretKey(secretKey).build();
  }

  @Bean
  JwtDecoder jwtDecoder(SecretKey secretKey, AuthProperties properties) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(secretKey).build();
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(properties.issuer())));
    return decoder;
  }

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      JwtAuthenticationConverter converter,
      AuthRateLimitFilter rateLimitFilter,
      AuthenticationEntryPoint problemAuthenticationEntryPoint,
      AccessDeniedHandler problemAccessDeniedHandler)
      throws Exception {
    return http.csrf(csrf -> csrf.disable())
        .cors(Customizer.withDefaults())
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()
                    .requestMatchers("/actuator/health/**", "/actuator/info")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.POST,
                        "/api/v1/auth/google",
                        "/api/v1/auth/credential-registrations",
                        "/api/v1/auth/credential-verifications/resend",
                        "/api/v1/auth/credential-verifications/complete",
                        "/api/v1/auth/credentials/login",
                        "/api/v1/auth/password-recovery-requests",
                        "/api/v1/auth/password-recoveries/complete",
                        "/api/v1/auth/refresh",
                        "/api/v1/auth/logout")
                    .permitAll()
                    .requestMatchers("/api/v1/admin/**")
                    .hasRole("ADMIN")
                    .anyRequest()
                    .authenticated())
        .exceptionHandling(
            exceptions ->
                exceptions
                    .authenticationEntryPoint(problemAuthenticationEntryPoint)
                    .accessDeniedHandler(problemAccessDeniedHandler))
        .oauth2ResourceServer(
            oauth ->
                oauth
                    .authenticationEntryPoint(problemAuthenticationEntryPoint)
                    .accessDeniedHandler(problemAccessDeniedHandler)
                    .jwt(jwt -> jwt.jwtAuthenticationConverter(converter)))
        .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  @Bean
  AuthRateLimitFilter authRateLimitFilter(
      AuthRateLimitProperties properties,
      SecurityEventService securityEvents,
      SecurityProblemResponseWriter problemWriter,
      Clock clock) {
    return new AuthRateLimitFilter(properties, securityEvents, problemWriter, clock);
  }

  @Bean
  SecurityProblemResponseWriter securityProblemResponseWriter(JsonMapper json) {
    return new SecurityProblemResponseWriter(json);
  }

  @Bean
  AuthenticationEntryPoint problemAuthenticationEntryPoint(
      SecurityProblemResponseWriter problemWriter) {
    BearerTokenAuthenticationEntryPoint delegate = new BearerTokenAuthenticationEntryPoint();
    return (request, response, exception) -> {
      delegate.commence(request, response, exception);
      problemWriter.write(
          response,
          HttpStatus.UNAUTHORIZED,
          "AUTHENTICATION_REQUIRED",
          "Authentication is required to access this resource.");
    };
  }

  @Bean
  AccessDeniedHandler problemAccessDeniedHandler(SecurityProblemResponseWriter problemWriter) {
    BearerTokenAccessDeniedHandler delegate = new BearerTokenAccessDeniedHandler();
    return (request, response, exception) -> {
      delegate.handle(request, response, exception);
      problemWriter.write(
          response,
          HttpStatus.FORBIDDEN,
          "ACCESS_DENIED",
          "The authenticated account cannot access this resource.");
    };
  }

  @Bean
  JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
    authorities.setAuthoritiesClaimName("roles");
    authorities.setAuthorityPrefix("ROLE_");
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(authorities);
    return converter;
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(AuthProperties properties) {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(List.of(properties.webOrigin()));
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(
        List.of(HttpHeaders.AUTHORIZATION, HttpHeaders.CONTENT_TYPE, "X-Request-Id"));
    configuration.setExposedHeaders(List.of("X-Request-Id", HttpHeaders.RETRY_AFTER));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }
}
