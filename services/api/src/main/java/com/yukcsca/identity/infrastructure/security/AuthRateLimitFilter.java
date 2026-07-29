package com.yukcsca.identity.infrastructure.security;

import com.yukcsca.identity.application.SecurityEventService;
import com.yukcsca.identity.domain.SecurityEventType;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

public final class AuthRateLimitFilter extends OncePerRequestFilter {
  private static final Set<String> LIMITED_PATHS =
      Set.of(
          "/api/v1/auth/google",
          "/api/v1/auth/credential-registrations",
          "/api/v1/auth/credential-verifications/resend",
          "/api/v1/auth/credential-verifications/complete",
          "/api/v1/auth/credentials/login",
          "/api/v1/auth/password-recovery-requests",
          "/api/v1/auth/password-recoveries/complete",
          "/api/v1/auth/refresh");
  private static final String OVERFLOW_CLIENT = "__overflow__";

  private final ConcurrentHashMap<String, Window> clients = new ConcurrentHashMap<>();
  private final AuthRateLimitProperties properties;
  private final SecurityEventService securityEvents;
  private final SecurityProblemResponseWriter problemWriter;
  private final Clock clock;

  public AuthRateLimitFilter(
      AuthRateLimitProperties properties,
      SecurityEventService securityEvents,
      SecurityProblemResponseWriter problemWriter,
      Clock clock) {
    this.properties = properties;
    this.securityEvents = securityEvents;
    this.problemWriter = problemWriter;
    this.clock = clock;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return !"POST".equals(request.getMethod()) || !LIMITED_PATHS.contains(request.getRequestURI());
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    long now = clock.millis();
    String key = clientKey(request, now);
    if (clients.computeIfAbsent(key, ignored -> new Window()).allow(now, properties)) {
      filterChain.doFilter(request, response);
      return;
    }

    securityEvents.record(SecurityEventType.AUTH_RATE_LIMITED, null);
    response.setHeader(
        HttpHeaders.RETRY_AFTER, Long.toString(Math.max(1, properties.window().toSeconds())));
    problemWriter.write(
        response,
        HttpStatus.TOO_MANY_REQUESTS,
        "AUTH_RATE_LIMITED",
        "Authentication request limit exceeded.");
  }

  private String clientKey(HttpServletRequest request, long now) {
    String requestedKey = request.getRemoteAddr() + '|' + request.getRequestURI();
    if (clients.containsKey(requestedKey) || clients.size() < properties.maxClients()) {
      return requestedKey;
    }
    clients.entrySet().removeIf(entry -> entry.getValue().isExpiredAt(now));
    return clients.size() < properties.maxClients() ? requestedKey : OVERFLOW_CLIENT;
  }

  private static final class Window {
    private long endsAt;
    private int requests;

    synchronized boolean allow(long now, AuthRateLimitProperties properties) {
      if (isExpiredAt(now)) {
        endsAt = now + properties.window().toMillis();
        requests = 0;
      }
      requests += 1;
      return requests <= properties.requests();
    }

    synchronized boolean isExpiredAt(long now) {
      return endsAt <= now;
    }
  }
}
