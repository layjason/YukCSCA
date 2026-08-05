package com.yukcsca.academic.api;

import com.yukcsca.academic.application.AcademicImageSnapshot;
import java.time.Instant;
import java.util.UUID;

public record AcademicImageResponse(
    UUID id,
    String mediaType,
    long byteSize,
    int width,
    int height,
    String sha256,
    ProvenanceResponse provenance,
    Instant createdAt) {
  static AcademicImageResponse from(AcademicImageSnapshot value) {
    return new AcademicImageResponse(
        value.id(),
        value.mediaType(),
        value.byteSize(),
        value.width(),
        value.height(),
        value.sha256(),
        new ProvenanceResponse(
            value.origin(),
            value.provider(),
            value.sourceLocator(),
            value.permissionReference(),
            value.authorUserId(),
            value.reviewedByUserId(),
            value.reviewedAt()),
        value.createdAt());
  }

  public record ProvenanceResponse(
      String origin,
      String provider,
      String sourceLocator,
      String permissionReference,
      UUID authorUserId,
      UUID reviewedByUserId,
      Instant reviewedAt) {}
}
