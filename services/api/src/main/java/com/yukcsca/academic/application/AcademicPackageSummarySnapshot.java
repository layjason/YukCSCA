package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicPackageStatus;
import java.time.Instant;
import java.util.UUID;

public record AcademicPackageSummarySnapshot(
    UUID id,
    String subject,
    AcademicPackageStatus status,
    long draftRevision,
    AcademicPackageSnapshot.PublishedRevisionSnapshot activeRevision,
    boolean hasUnpublishedChanges,
    Instant updatedAt) {}
