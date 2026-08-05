package com.yukcsca.academic.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "academic_audit")
public class AcademicAudit {
  @Id private UUID id;

  @Column(name = "actor_user_id", nullable = false)
  private UUID actorUserId;

  @Column(nullable = false, length = 64)
  private String action;

  @Column(name = "target_type", nullable = false, length = 32)
  private String targetType;

  @Column(name = "target_id")
  private UUID targetId;

  @Column(nullable = false, length = 32)
  private String result;

  @Column(length = 500)
  private String reason;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  protected AcademicAudit() {}

  public AcademicAudit(
      UUID actorUserId,
      String action,
      String targetType,
      UUID targetId,
      String result,
      String reason,
      Instant occurredAt) {
    this.id = UUID.randomUUID();
    this.actorUserId = actorUserId;
    this.action = action;
    this.targetType = targetType;
    this.targetId = targetId;
    this.result = result;
    this.reason = reason;
    this.occurredAt = occurredAt;
  }
}
