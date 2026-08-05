package com.yukcsca.academic.application;

import java.time.Instant;
import java.util.UUID;

public record AcademicImageSnapshot(
    UUID id,
    String mediaType,
    long byteSize,
    int width,
    int height,
    String sha256,
    String origin,
    String provider,
    String sourceLocator,
    String permissionReference,
    UUID authorUserId,
    UUID reviewedByUserId,
    Instant reviewedAt,
    Instant createdAt) {}
