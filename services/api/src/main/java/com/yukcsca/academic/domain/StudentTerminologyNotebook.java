package com.yukcsca.academic.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "student_terminology_notebook")
public class StudentTerminologyNotebook {
  public static final String FAMILIARITY_NEW = "NEW";
  public static final String FAMILIARITY_LEARNING = "LEARNING";
  public static final String FAMILIARITY_FAMILIAR = "FAMILIAR";
  public static final String SOURCE_REQUIRED_COURSE = "REQUIRED_COURSE";
  public static final String SOURCE_CLICKED = "CLICKED";
  public static final String SOURCE_LANGUAGE_MISTAKE = "LANGUAGE_MISTAKE";

  @Id private UUID id;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Column(name = "term_id", nullable = false)
  private UUID termId;

  @Column(name = "package_id", nullable = false)
  private UUID packageId;

  @Column(nullable = false, length = 32)
  private String subject;

  @Column(name = "term_class", nullable = false, length = 32)
  private String termClass;

  @Column(nullable = false, length = 16)
  private String familiarity;

  @Column(nullable = false)
  private boolean due;

  @Column(name = "last_review_at")
  private Instant lastReviewAt;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private List<String> sources = new ArrayList<>();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "met_in", nullable = false, columnDefinition = "jsonb")
  private String metInJson;

  @Column(name = "encounter_snippet", length = 400)
  private String encounterSnippet;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected StudentTerminologyNotebook() {}

  public StudentTerminologyNotebook(
      UUID accountId,
      UUID termId,
      UUID packageId,
      String subject,
      String termClass,
      String source,
      String metInJson,
      String encounterSnippet,
      Instant now) {
    this.id = UUID.randomUUID();
    this.accountId = accountId;
    this.termId = termId;
    this.packageId = packageId;
    this.subject = subject;
    this.termClass = termClass;
    this.familiarity = FAMILIARITY_NEW;
    this.due = true;
    this.sources = new ArrayList<>();
    this.sources.add(source);
    this.metInJson = metInJson;
    this.encounterSnippet = encounterSnippet;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public boolean alreadyCollected() {
    return true;
  }

  public void refreshEncounter(
      String source, String metInJson, String encounterSnippet, Instant now) {
    accumulateSource(source);
    this.metInJson = metInJson;
    if (encounterSnippet != null && !encounterSnippet.isBlank()) {
      this.encounterSnippet = encounterSnippet;
    }
    this.updatedAt = now;
  }

  public void applyReview(boolean correct, Instant now) {
    this.lastReviewAt = now;
    this.updatedAt = now;
    if (correct) {
      this.familiarity = FAMILIARITY_FAMILIAR;
      this.due = false;
    } else {
      this.familiarity = FAMILIARITY_LEARNING;
      this.due = true;
    }
  }

  public void markLanguageMistake(Instant now) {
    accumulateSource(SOURCE_LANGUAGE_MISTAKE);
    this.familiarity = FAMILIARITY_LEARNING;
    this.due = true;
    this.updatedAt = now;
  }

  private void accumulateSource(String source) {
    Set<String> unique = new LinkedHashSet<>(this.sources == null ? List.of() : this.sources);
    unique.add(source);
    List<String> next = new ArrayList<>(unique);
    if (next.size() > 3) {
      this.sources = new ArrayList<>(next.subList(0, 3));
    } else {
      this.sources = next;
    }
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

  public UUID getPackageId() {
    return packageId;
  }

  public String getSubject() {
    return subject;
  }

  public String getTermClass() {
    return termClass;
  }

  public String getFamiliarity() {
    return familiarity;
  }

  public boolean isDue() {
    return due;
  }

  public Instant getLastReviewAt() {
    return lastReviewAt;
  }

  public List<String> getSources() {
    return sources == null ? List.of() : List.copyOf(sources);
  }

  public String getMetInJson() {
    return metInJson;
  }

  public String getEncounterSnippet() {
    return encounterSnippet;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
