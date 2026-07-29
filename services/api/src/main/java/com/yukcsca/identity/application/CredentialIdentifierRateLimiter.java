package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.SecurityEventType;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class CredentialIdentifierRateLimiter {
  private static final String OVERFLOW_KEY = "__overflow__";

  private final ConcurrentHashMap<String, Window> identifiers = new ConcurrentHashMap<>();
  private final CredentialAuthSettings settings;
  private final SecurityEventService securityEvents;
  private final Clock clock;

  public CredentialIdentifierRateLimiter(
      CredentialAuthSettings settings, SecurityEventService securityEvents, Clock clock) {
    this.settings = settings;
    this.securityEvents = securityEvents;
    this.clock = clock;
  }

  /**
   * Bounds repeated work without retaining the raw email or verification token in limiter state.
   */
  public void check(String route, String identifier) {
    long now = clock.millis();
    String requestedKey = route + '|' + digest(identifier);
    String key = boundedKey(requestedKey, now);
    long retryAfterMillis =
        identifiers.computeIfAbsent(key, ignored -> new Window()).record(now, settings);
    if (retryAfterMillis > 0) {
      securityEvents.record(SecurityEventType.AUTH_RATE_LIMITED, null);
      throw new CredentialRateLimitException((retryAfterMillis + 999) / 1000);
    }
  }

  private String boundedKey(String requestedKey, long now) {
    if (identifiers.containsKey(requestedKey) || identifiers.size() < settings.maxIdentifiers()) {
      return requestedKey;
    }
    identifiers.entrySet().removeIf(entry -> entry.getValue().isExpiredAt(now));
    return identifiers.size() < settings.maxIdentifiers() ? requestedKey : OVERFLOW_KEY;
  }

  private static String digest(String value) {
    try {
      byte[] digest =
          MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException impossible) {
      throw new IllegalStateException("SHA-256 is unavailable.", impossible);
    }
  }

  private static final class Window {
    private long endsAt;
    private int requests;

    synchronized long record(long now, CredentialAuthSettings settings) {
      if (isExpiredAt(now)) {
        endsAt = now + settings.identifierWindow().toMillis();
        requests = 0;
      }
      requests += 1;
      return requests <= settings.identifierRequests() ? 0 : endsAt - now;
    }

    synchronized boolean isExpiredAt(long now) {
      return endsAt <= now;
    }
  }
}
