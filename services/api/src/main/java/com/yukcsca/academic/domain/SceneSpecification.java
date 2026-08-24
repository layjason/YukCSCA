package com.yukcsca.academic.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Stored admin script compiled to a template-bound scene specification. {@code segments} is the
 * schema-validated JSON array of {@code {templateActionId, params, narrationText}}; {@code
 * registryVersion} records the reviewed template registry it was last validated against.
 */
@Entity
@Table(name = "scene_specification")
public class SceneSpecification {
  @Id private UUID id;

  @Column(name = "explanation_language", nullable = false, length = 16)
  private String explanationLanguage;

  @Column(name = "registry_version", nullable = false, length = 40)
  private String registryVersion;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private String segments;

  @Column(name = "created_by_user_id", nullable = false)
  private UUID createdByUserId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected SceneSpecification() {}

  public SceneSpecification(
      String explanationLanguage,
      String registryVersion,
      String segmentsJson,
      UUID createdByUserId,
      Instant now) {
    this.id = UUID.randomUUID();
    this.explanationLanguage = explanationLanguage;
    this.registryVersion = registryVersion;
    this.segments = segmentsJson;
    this.createdByUserId = createdByUserId;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void replace(
      String explanationLanguage, String registryVersion, String segmentsJson, Instant now) {
    this.explanationLanguage = explanationLanguage;
    this.registryVersion = registryVersion;
    this.segments = segmentsJson;
    this.updatedAt = now;
  }

  public UUID getId() {
    return id;
  }

  public String getExplanationLanguage() {
    return explanationLanguage;
  }

  public String getRegistryVersion() {
    return registryVersion;
  }

  public String getSegments() {
    return segments;
  }

  public UUID getCreatedByUserId() {
    return createdByUserId;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
