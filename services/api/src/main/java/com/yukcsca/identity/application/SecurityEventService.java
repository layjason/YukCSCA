package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.SecurityEvent;
import com.yukcsca.identity.domain.SecurityEventType;
import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SecurityEventService {
  private final SecurityEventStore repository;
  private final Clock clock;

  public SecurityEventService(SecurityEventStore repository, Clock clock) {
    this.repository = repository;
    this.clock = clock;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void record(SecurityEventType type, UUID userId) {
    repository.save(new SecurityEvent(type, userId, clock.instant()));
  }

  @Transactional
  public void recordWithinTransaction(SecurityEventType type, UUID userId) {
    repository.save(new SecurityEvent(type, userId, clock.instant()));
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void recordStudentActivation(UUID userId) {
    repository.save(
        new SecurityEvent(SecurityEventType.STUDENT_ACTIVATION_SUCCEEDED, userId, clock.instant()));
  }

  @Transactional
  public void recordStudentProfileUpdate(UUID userId) {
    repository.save(
        new SecurityEvent(SecurityEventType.STUDENT_PROFILE_UPDATED, userId, clock.instant()));
  }
}
