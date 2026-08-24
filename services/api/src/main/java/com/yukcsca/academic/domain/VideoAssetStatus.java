package com.yukcsca.academic.domain;

/**
 * Lifecycle of an optional reviewed-video asset. A failed render creates no asset — the failure
 * lives on the render job. Only REVIEWED assets project into a published revision; RETIRED is
 * system-managed when a replacement publishes.
 */
public enum VideoAssetStatus {
  AWAITING_VALIDATION,
  DRAFT,
  REVIEWED,
  REJECTED,
  RETIRED
}
