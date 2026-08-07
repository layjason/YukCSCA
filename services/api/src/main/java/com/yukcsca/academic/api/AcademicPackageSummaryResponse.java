package com.yukcsca.academic.api;

import com.yukcsca.academic.application.AcademicPackageSummarySnapshot;
import com.yukcsca.academic.domain.AcademicPackageStatus;
import java.time.Instant;
import java.util.UUID;

public record AcademicPackageSummaryResponse(
    UUID id,
    String subject,
    AcademicPackageStatus status,
    long draftRevision,
    AcademicPackageResponse.PublishedRevisionResponse activeRevision,
    boolean hasUnpublishedChanges,
    Instant updatedAt) {
  static AcademicPackageSummaryResponse from(AcademicPackageSummarySnapshot value) {
    return new AcademicPackageSummaryResponse(
        value.id(),
        value.subject(),
        value.status(),
        value.draftRevision(),
        AcademicPackageResponse.PublishedRevisionResponse.from(value.activeRevision()),
        value.hasUnpublishedChanges(),
        value.updatedAt());
  }
}
