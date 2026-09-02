package com.yukcsca.agent.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_flag")
public class AgentFlag {
  @Id private UUID id;

  @Column(name = "turn_id", nullable = false)
  private UUID turnId;

  @Column(name = "conversation_id", nullable = false)
  private UUID conversationId;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private AgentFlagSource source;

  @Column(nullable = false, length = 16)
  private String status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected AgentFlag() {}

  public AgentFlag(
      UUID turnId, UUID conversationId, UUID accountId, AgentFlagSource source, Instant now) {
    this.id = UUID.randomUUID();
    this.turnId = turnId;
    this.conversationId = conversationId;
    this.accountId = accountId;
    this.source = source;
    this.status = "OPEN";
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

  public AgentFlagSource getSource() {
    return source;
  }

  public String getStatus() {
    return status;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
