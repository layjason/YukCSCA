package com.yukcsca.identity.application;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yukcsca.identity.domain.SecurityEventType;
import com.yukcsca.identity.infrastructure.security.SessionMaintenanceProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class SessionCleanupJobTest {
  private static final Instant NOW = Instant.parse("2026-07-19T00:00:00Z");
  private static final Duration RETENTION = Duration.ofDays(30);

  @Test
  void removesExpiredAndOldRevokedSessionsAndRecordsAnEvent() {
    AuthSessionStore repository = mock(AuthSessionStore.class);
    SecurityEventService events = mock(SecurityEventService.class);
    SessionCleanupJob job = createJob(repository, events);
    when(repository.deleteExpiredAndOldRevoked(NOW, NOW.minus(RETENTION))).thenReturn(3);

    job.removeExpiredSessions();

    verify(events).record(SecurityEventType.SESSION_CLEANUP, null);
  }

  @Test
  void doesNotRecordAnEventWhenNothingWasRemoved() {
    AuthSessionStore repository = mock(AuthSessionStore.class);
    SecurityEventService events = mock(SecurityEventService.class);
    SessionCleanupJob job = createJob(repository, events);

    job.removeExpiredSessions();

    verify(events, never()).record(SecurityEventType.SESSION_CLEANUP, null);
  }

  private static SessionCleanupJob createJob(
      AuthSessionStore repository, SecurityEventService events) {
    return new SessionCleanupJob(
        repository,
        new SessionMaintenanceProperties(Duration.ofHours(1), RETENTION),
        events,
        Clock.fixed(NOW, ZoneOffset.UTC));
  }
}
