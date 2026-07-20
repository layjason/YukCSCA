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
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

public final class AuthRateLimitFilter extends OncePerRequestFilter {
  private static final Set<String> LIMITED_PATHS =
      Set.of("/api/v1/auth/google", "/api/v1/auth/refresh");
  private static final String OVERFLOW_CLIENT = "__overflow__";

  private final ConcurrentHashMap<String, Window> clients = new ConcurrentHashMap<>();
  private final AuthRateLimitProperties properties;
  private final SecurityEventService securityEvents;
  private final Clock clock;

  public AuthRateLimitFilter(
      AuthRateLimitProperties properties, SecurityEventService securityEvents, Clock clock) {
    this.properties = properties;
    this.securityEvents = securityEvents;
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
    response.setStatus(429);
    response.setHeader(
        HttpHeaders.RETRY_AFTER, Long.toString(Math.max(1, properties.window().toSeconds())));
    response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    response
        .getWriter()
        .write(
            "{\"status\":429,\"title\":\"Too Many Requests\","
                + "\"detail\":\"Authentication request limit exceeded.\","
                + "\"code\":\"AUTH_RATE_LIMITED\"}");
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
