package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicPackageStatus;
import java.time.Instant;
import java.util.UUID;

public record AcademicPackageSnapshot(
    UUID id,
    String subject,
    AcademicPackageStatus status,
    long draftRevision,
    PublishedRevisionSnapshot activeRevision,
    boolean hasUnpublishedChanges,
    String draftJson,
    Instant createdAt,
    Instant updatedAt) {
  public record PublishedRevisionSnapshot(
      UUID id, long revisionNumber, Instant publishedAt, UUID publishedByUserId) {}
}
