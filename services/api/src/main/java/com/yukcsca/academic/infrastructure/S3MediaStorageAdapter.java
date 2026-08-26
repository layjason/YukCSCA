package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.MediaStoragePort;
import com.yukcsca.academic.application.MediaStorageUnavailableException;
import java.net.URI;
import java.time.Duration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.BucketAlreadyExistsException;
import software.amazon.awssdk.services.s3.model.BucketAlreadyOwnedByYouException;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

/**
 * S3-compatible adapter (MinIO in dev/test) for reviewed-video bytes. Presigned PUTs implement the
 * single-PUT upload contract; presigned GETs are inherently range-capable because a plain signed
 * GET honors the Range header, so native {@code <video>} streaming and resume work without any
 * credential reaching the browser.
 */
@org.springframework.stereotype.Component
public class S3MediaStorageAdapter implements MediaStoragePort {
  private final MediaStorageProperties properties;
  private final S3Client client;
  private final S3Presigner presigner;

  public S3MediaStorageAdapter(MediaStorageProperties properties) {
    this.properties = properties;
    if (!properties.configured()) {
      this.client = null;
      this.presigner = null;
      return;
    }
    StaticCredentialsProvider credentials =
        StaticCredentialsProvider.create(
            AwsBasicCredentials.create(properties.accessKey(), properties.secretKey()));
    this.client =
        S3Client.builder()
            .region(Region.of(properties.region()))
            .endpointOverride(URI.create(properties.endpoint()))
            .forcePathStyle(properties.pathStyleAccess())
            .credentialsProvider(credentials)
            // AWS SDK 2.30+ default CRC32 checksums are 501 on this MinIO release.
            .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
            .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
            .build();
    this.presigner =
        S3Presigner.builder()
            .region(Region.of(properties.region()))
            // The API talks to the service endpoint, while URLs returned to browsers must use
            // a browser-reachable origin (for example minio:9000 vs localhost:9000 in Compose).
            .endpointOverride(URI.create(properties.publicEndpoint()))
            .credentialsProvider(credentials)
            .serviceConfiguration(
                software.amazon.awssdk.services.s3.S3Configuration.builder()
                    .pathStyleAccessEnabled(properties.pathStyleAccess())
                    .build())
            .build();
    if (properties.autoCreateBucket()) {
      ensureBucket();
    }
  }

  @Override
  public Presigned presignPut(String key, Duration ttl) {
    requireConfigured();
    PutObjectRequest request =
        PutObjectRequest.builder().bucket(properties.bucket()).key(key).build();
    PresignedPutObjectRequest presigned =
        presigner.presignPutObject(
            PutObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .putObjectRequest(request)
                .build());
    return new Presigned(presigned.url().toString(), expiry(ttl));
  }

  @Override
  public Presigned presignGet(String key, Duration ttl) {
    requireConfigured();
    GetObjectRequest request =
        GetObjectRequest.builder().bucket(properties.bucket()).key(key).build();
    PresignedGetObjectRequest presigned =
        presigner.presignGetObject(
            GetObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .getObjectRequest(request)
                .build());
    return new Presigned(presigned.url().toString(), expiry(ttl));
  }

  @Override
  public boolean objectExists(String key) {
    requireConfigured();
    try {
      client.headObject(HeadObjectRequest.builder().bucket(properties.bucket()).key(key).build());
      return true;
    } catch (NoSuchKeyException exception) {
      return false;
    } catch (S3Exception exception) {
      if (exception.statusCode() == 404) return false;
      throw exception;
    }
  }

  @Override
  public void put(String key, String contentType, byte[] bytes) {
    requireConfigured();
    client.putObject(
        PutObjectRequest.builder()
            .bucket(properties.bucket())
            .key(key)
            .contentType(contentType)
            .build(),
        RequestBody.fromBytes(bytes));
  }

  @Override
  public byte[] get(String key) {
    requireConfigured();
    return client
        .getObjectAsBytes(GetObjectRequest.builder().bucket(properties.bucket()).key(key).build())
        .asByteArray();
  }

  private void ensureBucket() {
    try {
      client.headBucket(
          software.amazon.awssdk.services.s3.model.HeadBucketRequest.builder()
              .bucket(properties.bucket())
              .build());
    } catch (S3Exception exception) {
      // MinIO may answer HeadBucket on a missing bucket with 404 or 403.
      if (exception.statusCode() != 404 && exception.statusCode() != 403) {
        throw exception;
      }
      try {
        client.createBucket(CreateBucketRequest.builder().bucket(properties.bucket()).build());
      } catch (BucketAlreadyOwnedByYouException | BucketAlreadyExistsException ignored) {
        // Concurrent first-start against the same Compose bucket.
      }
    }
  }

  private void requireConfigured() {
    if (!properties.configured()) {
      throw new MediaStorageUnavailableException(
          "Object storage is not configured; reviewed-video operations are unavailable.");
    }
  }

  private java.time.Instant expiry(Duration ttl) {
    return java.time.Instant.now().plus(ttl);
  }
}
