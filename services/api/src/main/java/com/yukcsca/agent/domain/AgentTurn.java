package com.yukcsca.agent.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "agent_turn")
public class AgentTurn {
  @Id private UUID id;

  @Column(name = "conversation_id", nullable = false)
  private UUID conversationId;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Column(name = "idempotency_key", nullable = false)
  private UUID idempotencyKey;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private AgentTurnStatus status;

  @Column(name = "question_text", nullable = false, length = 2000)
  private String questionText;

  @Column(length = 4000)
  private String quote;

  @Enumerated(EnumType.STRING)
  @Column(length = 32)
  private AgentAnswerKind kind;

  @Column(length = 12000)
  private String body;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private String locators;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private String steps;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "suggested_follow_ups", columnDefinition = "jsonb")
  private String suggestedFollowUps;

  @Column(name = "latency_ms")
  private Integer latencyMs;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "completed_at")
  private Instant completedAt;

  protected AgentTurn() {}

  public static AgentTurn pending(
      UUID conversationId,
      UUID accountId,
      UUID idempotencyKey,
      String questionText,
      String quote,
      Instant now) {
    AgentTurn turn = new AgentTurn();
    turn.id = UUID.randomUUID();
    turn.conversationId = conversationId;
    turn.accountId = accountId;
    turn.idempotencyKey = idempotencyKey;
    turn.status = AgentTurnStatus.PENDING;
    turn.questionText = questionText;
    turn.quote = quote;
    turn.createdAt = now;
    return turn;
  }

  public boolean complete(
      AgentAnswerKind kind,
      String body,
      String locators,
      String steps,
      String suggestedFollowUps,
      int latencyMs,
      Instant now) {
    if (status != AgentTurnStatus.PENDING) {
      return false;
    }
    this.status = AgentTurnStatus.COMPLETED;
    this.kind = kind;
    this.body = body;
    this.locators = locators;
    this.steps = steps;
    this.suggestedFollowUps = suggestedFollowUps;
    this.latencyMs = latencyMs;
    this.completedAt = now;
    return true;
  }

  public boolean fail(int latencyMs, Instant now) {
    if (status != AgentTurnStatus.PENDING) {
      return false;
    }
    this.status = AgentTurnStatus.FAILED;
    this.kind = null;
    this.body = null;
    this.locators = null;
    this.steps = null;
    this.suggestedFollowUps = null;
    this.latencyMs = latencyMs;
    this.completedAt = now;
    return true;
  }

  public UUID getId() {
    return id;
  }

  public UUID getConversationId() {
    return conversationId;
  }

  public UUID getAccountId() {
    return accountId;
  }

  public UUID getIdempotencyKey() {
    return idempotencyKey;
  }

  public AgentTurnStatus getStatus() {
    return status;
  }

  public String getQuestionText() {
    return questionText;
  }

  public String getQuote() {
    return quote;
  }

  public AgentAnswerKind getKind() {
    return kind;
  }

  public String getBody() {
    return body;
  }

  public String getLocators() {
    return locators;
  }

  public String getSteps() {
    return steps;
  }

  public String getSuggestedFollowUps() {
    return suggestedFollowUps;
  }

  public Integer getLatencyMs() {
    return latencyMs;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getCompletedAt() {
    return completedAt;
  }
}
