package com.yukcsca.academic.api.student;

import com.yukcsca.academic.application.PublishedPackageProjector.PublishedPackageSummaryProjection;
import com.yukcsca.academic.application.PublishedPackageProjector.RevisionSummaryProjection;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PublishedPackageSummaryResponse(
    UUID id, String subject, ActiveRevisionResponse activeRevision, List<String> examLanguages) {
  static PublishedPackageSummaryResponse from(PublishedPackageSummaryProjection value) {
    return new PublishedPackageSummaryResponse(
        value.id(),
        value.subject(),
        ActiveRevisionResponse.from(value.activeRevision()),
        value.examLanguages());
  }

  public record ActiveRevisionResponse(UUID id, long revisionNumber, Instant publishedAt) {
    static ActiveRevisionResponse from(RevisionSummaryProjection value) {
      return new ActiveRevisionResponse(value.id(), value.revisionNumber(), value.publishedAt());
    }
  }
}
