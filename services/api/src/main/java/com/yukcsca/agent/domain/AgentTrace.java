package com.yukcsca.agent.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "agent_trace")
public class AgentTrace {
  @Id private UUID id;

  @Column(name = "turn_id", nullable = false, unique = true)
  private UUID turnId;

  @Column(name = "conversation_id", nullable = false)
  private UUID conversationId;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Column(name = "model_version", length = 80)
  private String modelVersion;

  @Column(name = "prompt_version", length = 80)
  private String promptVersion;

  @Column(name = "token_usage")
  private Integer tokenUsage;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private String steps;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected AgentTrace() {}

  public AgentTrace(
      UUID turnId,
      UUID conversationId,
      UUID accountId,
      String modelVersion,
      String promptVersion,
      Integer tokenUsage,
      String steps,
      Instant now) {
    this.id = UUID.randomUUID();
    this.turnId = turnId;
    this.conversationId = conversationId;
    this.accountId = accountId;
    this.modelVersion = modelVersion;
    this.promptVersion = promptVersion;
    this.tokenUsage = tokenUsage;
    this.steps = steps;
    this.createdAt = now;
  }

  public UUID getId() {
    return id;
  }

  public UUID getTurnId() {
    return turnId;
  }

  public UUID getConversationId() {
    return conversationId;
  }

  public UUID getAccountId() {
    return accountId;
  }

  public String getModelVersion() {
    return modelVersion;
  }

  public String getPromptVersion() {
    return promptVersion;
  }

  public Integer getTokenUsage() {
    return tokenUsage;
  }

  public String getSteps() {
    return steps;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
