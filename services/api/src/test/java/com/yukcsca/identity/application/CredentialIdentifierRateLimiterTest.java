package com.yukcsca.identity.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yukcsca.identity.domain.SecurityEventType;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class CredentialIdentifierRateLimiterTest {
  @Test
  void rejectsWorkBeyondTheIdentifierBudgetWithRetryAndAnAuditEvent() {
    CredentialAuthSettings settings = mock(CredentialAuthSettings.class);
    when(settings.maxIdentifiers()).thenReturn(100);
    when(settings.identifierRequests()).thenReturn(1);
    when(settings.identifierWindow()).thenReturn(Duration.ofMinutes(1));
    SecurityEventService events = mock(SecurityEventService.class);
    CredentialIdentifierRateLimiter limiter =
        new CredentialIdentifierRateLimiter(
            settings, events, Clock.fixed(Instant.parse("2026-07-28T00:00:00Z"), ZoneOffset.UTC));

    limiter.check("login", "learner@example.test");

    assertThatThrownBy(() -> limiter.check("login", "learner@example.test"))
        .isInstanceOf(CredentialRateLimitException.class)
        .satisfies(
            exception ->
                org.assertj.core.api.Assertions.assertThat(
                        ((CredentialRateLimitException) exception).retryAfterSeconds())
                    .isEqualTo(60));
    verify(events).record(SecurityEventType.AUTH_RATE_LIMITED, null);
  }
}
