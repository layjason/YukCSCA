package com.yukcsca.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "security_event")
public class SecurityEvent {
  @Id private UUID id;

  @Enumerated(EnumType.STRING)
  @Column(name = "event_type", nullable = false, length = 64)
  private SecurityEventType eventType;

  @Column(name = "user_id")
  private UUID userId;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  protected SecurityEvent() {}

  public SecurityEvent(SecurityEventType eventType, UUID userId, Instant occurredAt) {
    this.id = UUID.randomUUID();
    this.eventType = eventType;
    this.userId = userId;
    this.occurredAt = occurredAt;
  }

  public SecurityEventType getEventType() {
    return eventType;
  }
}
