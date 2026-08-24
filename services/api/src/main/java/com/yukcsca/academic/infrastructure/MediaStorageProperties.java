package com.yukcsca.academic.infrastructure;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * S3-compatible object-storage settings for reviewed-video bytes. MinIO in dev/test Compose; staged
 * environments provide bucket credentials. Unset values leave the adapter unavailable — video
 * absence degrades to the text unit everywhere.
 */
@ConfigurationProperties("yukcsca.media.storage")
public record MediaStorageProperties(
    String endpoint,
    String publicEndpoint,
    String region,
    String bucket,
    String accessKey,
    String secretKey,
    Boolean pathStyleAccess,
    Boolean autoCreateBucket,
    Duration playbackPresignTtl,
    Duration uploadSlotTtl) {
  public MediaStorageProperties {
    if (region == null || region.isBlank()) region = "us-east-1";
    if (pathStyleAccess == null) pathStyleAccess = true;
    if (autoCreateBucket == null) autoCreateBucket = false;
    if (playbackPresignTtl == null
        || playbackPresignTtl.isNegative()
        || playbackPresignTtl.isZero()) playbackPresignTtl = Duration.ofMinutes(10);
    if (uploadSlotTtl == null || uploadSlotTtl.isNegative() || uploadSlotTtl.isZero())
      uploadSlotTtl = Duration.ofMinutes(15);
  }

  public boolean configured() {
    return endpoint != null
        && !endpoint.isBlank()
        && publicEndpoint != null
        && !publicEndpoint.isBlank()
        && bucket != null
        && !bucket.isBlank()
        && accessKey != null
        && !accessKey.isBlank()
        && secretKey != null
        && !secretKey.isBlank();
  }
}
