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
@Table(name = "agent_conversation")
public class AgentConversation {
  @Id private UUID id;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Enumerated(EnumType.STRING)
  @Column(name = "context_type", nullable = false, length = 32)
  private AgentContextType contextType;

  @Column(name = "context_id", nullable = false)
  private UUID contextId;

  @Column(nullable = false, length = 32)
  private String subject;

  @Column(name = "package_id", nullable = false)
  private UUID packageId;

  @Column(name = "package_revision_id", nullable = false)
  private UUID packageRevisionId;

  @Column(name = "session_id")
  private UUID sessionId;

  @Column(name = "item_id")
  private UUID itemId;

  @Column(name = "explanation_language", nullable = false, length = 16)
  private String explanationLanguage;

  @Column(name = "exam_language", nullable = false, length = 16)
  private String examLanguage;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected AgentConversation() {}

  public AgentConversation(
      UUID accountId,
      AgentContextType contextType,
      UUID contextId,
      String subject,
      UUID packageId,
      UUID packageRevisionId,
      UUID sessionId,
      UUID itemId,
      String explanationLanguage,
      String examLanguage,
      Instant now) {
    this.id = UUID.randomUUID();
    this.accountId = accountId;
    this.contextType = contextType;
    this.contextId = contextId;
    this.subject = subject;
    this.packageId = packageId;
    this.packageRevisionId = packageRevisionId;
    this.sessionId = sessionId;
    this.itemId = itemId;
    this.explanationLanguage = explanationLanguage;
    this.examLanguage = examLanguage;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void touch(Instant now) {
    this.updatedAt = now;
  }

  public void updateExplanationLanguage(String language, Instant now) {
    if (language == null || language.isBlank() || language.equals(this.explanationLanguage)) {
      return;
    }
    this.explanationLanguage = language;
    this.updatedAt = now;
  }

  public UUID getId() {
    return id;
  }

  public UUID getAccountId() {
    return accountId;
  }

  public AgentContextType getContextType() {
    return contextType;
  }

  public UUID getContextId() {
    return contextId;
  }

  public String getSubject() {
    return subject;
  }

  public UUID getPackageId() {
    return packageId;
  }

  public UUID getPackageRevisionId() {
    return packageRevisionId;
  }

  public UUID getSessionId() {
    return sessionId;
  }

  public UUID getItemId() {
    return itemId;
  }

  public String getExplanationLanguage() {
    return explanationLanguage;
  }

  public String getExamLanguage() {
    return examLanguage;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
