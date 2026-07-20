package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.SecurityEventType;
import java.time.Clock;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SessionCleanupJob {
  private static final Logger log = LoggerFactory.getLogger(SessionCleanupJob.class);

  private final AuthSessionStore repository;
  private final SessionMaintenanceSettings properties;
  private final SecurityEventService securityEvents;
  private final Clock clock;

  public SessionCleanupJob(
      AuthSessionStore repository,
      SessionMaintenanceSettings properties,
      SecurityEventService securityEvents,
      Clock clock) {
    this.repository = repository;
    this.properties = properties;
    this.securityEvents = securityEvents;
    this.clock = clock;
  }

  @Scheduled(
      fixedDelayString = "${yukcsca.auth.session-maintenance.cleanup-interval}",
      initialDelayString = "${yukcsca.auth.session-maintenance.cleanup-interval}")
  @Transactional
  public void removeExpiredSessions() {
    Instant now = clock.instant();
    int deleted = repository.deleteExpiredAndOldRevoked(now, now.minus(properties.retention()));
    if (deleted > 0) {
      securityEvents.record(SecurityEventType.SESSION_CLEANUP, null);
      log.info("Removed {} expired or old revoked authentication sessions", deleted);
    }
  }
}
