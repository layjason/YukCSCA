package com.yukcsca.profile.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "student_profile")
public class StudentProfile {
  @Id private UUID id;

  @Column(name = "account_id", nullable = false, unique = true)
  private UUID accountId;

  @Column(name = "preferred_name", nullable = false, length = 160)
  private String preferredName;

  @Column(name = "birth_year", nullable = false)
  private int birthYear;

  @Enumerated(EnumType.STRING)
  @Column(name = "current_grade", nullable = false, length = 32)
  private StudentGrade currentGrade;

  @Column(nullable = false, length = 120)
  private String city;

  @Enumerated(EnumType.STRING)
  @Column(name = "default_explanation_language", nullable = false, length = 32)
  private ExplanationLanguage defaultExplanationLanguage;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected StudentProfile() {}

  private StudentProfile(
      UUID id,
      UUID accountId,
      String preferredName,
      int birthYear,
      StudentGrade currentGrade,
      String city,
      ExplanationLanguage defaultExplanationLanguage,
      Instant now) {
    this.id = id;
    this.accountId = accountId;
    this.preferredName = preferredName;
    this.birthYear = birthYear;
    this.currentGrade = currentGrade;
    this.city = city;
    this.defaultExplanationLanguage = defaultExplanationLanguage;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public static StudentProfile create(
      UUID accountId,
      String preferredName,
      int birthYear,
      StudentGrade currentGrade,
      String city,
      ExplanationLanguage defaultExplanationLanguage,
      Instant now) {
    return new StudentProfile(
        UUID.randomUUID(),
        accountId,
        preferredName,
        birthYear,
        currentGrade,
        city,
        defaultExplanationLanguage,
        now);
  }

  /**
   * Applies a validated partial update and advances the modification time only when persisted
   * profile data changes. Null arguments mean that the corresponding field was omitted.
   */
  public boolean update(
      String preferredName,
      Integer birthYear,
      StudentGrade currentGrade,
      String city,
      ExplanationLanguage defaultExplanationLanguage,
      Instant now) {
    boolean changed = false;
    if (preferredName != null && !Objects.equals(this.preferredName, preferredName)) {
      this.preferredName = preferredName;
      changed = true;
    }
    if (birthYear != null && this.birthYear != birthYear) {
      this.birthYear = birthYear;
      changed = true;
    }
    if (currentGrade != null && this.currentGrade != currentGrade) {
      this.currentGrade = currentGrade;
      changed = true;
    }
    if (city != null && !Objects.equals(this.city, city)) {
      this.city = city;
      changed = true;
    }
    if (defaultExplanationLanguage != null
        && this.defaultExplanationLanguage != defaultExplanationLanguage) {
      this.defaultExplanationLanguage = defaultExplanationLanguage;
      changed = true;
    }
    if (changed) {
      this.updatedAt = now;
    }
    return changed;
  }

  public UUID getId() {
    return id;
  }

  public UUID getAccountId() {
    return accountId;
  }

  public String getPreferredName() {
    return preferredName;
  }

  public int getBirthYear() {
    return birthYear;
  }

  public StudentGrade getCurrentGrade() {
    return currentGrade;
  }

  public String getCity() {
    return city;
  }

  public ExplanationLanguage getDefaultExplanationLanguage() {
    return defaultExplanationLanguage;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
