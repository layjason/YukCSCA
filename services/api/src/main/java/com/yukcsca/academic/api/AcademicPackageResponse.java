package com.yukcsca.academic.api;

import com.yukcsca.academic.application.AcademicPackageSnapshot;
import com.yukcsca.academic.domain.AcademicPackageStatus;
import java.time.Instant;
import java.util.UUID;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

public record AcademicPackageResponse(
    UUID id,
    String subject,
    AcademicPackageStatus status,
    long draftRevision,
    PublishedRevisionResponse activeRevision,
    boolean hasUnpublishedChanges,
    JsonNode draft,
    Instant createdAt,
    Instant updatedAt) {
  static AcademicPackageResponse from(AcademicPackageSnapshot value, JsonMapper json) {
    try {
      return new AcademicPackageResponse(
          value.id(),
          value.subject(),
          value.status(),
          value.draftRevision(),
          PublishedRevisionResponse.from(value.activeRevision()),
          value.hasUnpublishedChanges(),
          json.readTree(value.draftJson()),
          value.createdAt(),
          value.updatedAt());
    } catch (Exception exception) {
      throw new IllegalStateException("Stored academic draft is unreadable.", exception);
    }
  }

  public record PublishedRevisionResponse(
      UUID id, long revisionNumber, Instant publishedAt, UUID publishedByUserId) {
    static PublishedRevisionResponse from(AcademicPackageSnapshot.PublishedRevisionSnapshot value) {
      return value == null
          ? null
          : new PublishedRevisionResponse(
              value.id(), value.revisionNumber(), value.publishedAt(), value.publishedByUserId());
    }
  }
}
