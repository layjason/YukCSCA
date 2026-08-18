package com.yukcsca.academic.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_terminology_review")
public class StudentTerminologyReview {
  @Id private UUID id;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Column(name = "term_id", nullable = false)
  private UUID termId;

  @Column(nullable = false, length = 32)
  private String kind;

  @Column(name = "selected_option_key", nullable = false, length = 40)
  private String selectedOptionKey;

  @Column(nullable = false)
  private boolean correct;

  @Column(name = "correct_option_key", nullable = false, length = 40)
  private String correctOptionKey;

  @Column(name = "familiarity_after", nullable = false, length = 16)
  private String familiarityAfter;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  protected StudentTerminologyReview() {}

  public StudentTerminologyReview(
      UUID accountId,
      UUID termId,
      String kind,
      String selectedOptionKey,
      boolean correct,
      String correctOptionKey,
      String familiarityAfter,
      Instant occurredAt) {
    this.id = UUID.randomUUID();
    this.accountId = accountId;
    this.termId = termId;
    this.kind = kind;
    this.selectedOptionKey = selectedOptionKey;
    this.correct = correct;
    this.correctOptionKey = correctOptionKey;
    this.familiarityAfter = familiarityAfter;
    this.occurredAt = occurredAt;
  }

  public UUID getId() {
    return id;
  }

  public UUID getAccountId() {
    return accountId;
  }

  public UUID getTermId() {
    return termId;
  }

  public String getKind() {
    return kind;
  }

  public String getSelectedOptionKey() {
    return selectedOptionKey;
  }

  public boolean isCorrect() {
    return correct;
  }

  public String getCorrectOptionKey() {
    return correctOptionKey;
  }

  public String getFamiliarityAfter() {
    return familiarityAfter;
  }

  public Instant getOccurredAt() {
    return occurredAt;
  }
}
