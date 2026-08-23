package com.yukcsca.academic.application;

import java.time.Duration;
import java.time.Instant;

/**
 * Object storage for reviewed-video and caption bytes (VS-010B). The S3-compatible adapter presigns
 * a single-PUT upload contract and range-capable playback GETs so no credential ever reaches the
 * browser; Java never streams video bytes through the API.
 */
public interface MediaStoragePort {

  /** Presigns one HTTP PUT of raw bytes; clients send no Content-Type beyond the presign. */
  Presigned presignPut(String key, Duration ttl);

  /** Presigns one range-capable GET assignable to a {@code <video>} element src. */
  Presigned presignGet(String key, Duration ttl);

  boolean objectExists(String key);

  void put(String key, String contentType, byte[] bytes);

  byte[] get(String key);

  record Presigned(String url, Instant expiresAt) {}
}
