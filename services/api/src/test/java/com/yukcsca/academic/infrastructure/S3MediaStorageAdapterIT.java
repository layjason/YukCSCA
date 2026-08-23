package com.yukcsca.academic.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.academic.application.MediaStoragePort;
import com.yukcsca.support.MinioTestSupport;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

/**
 * S3-compatible storage adapter against real MinIO (D-02): the single-PUT presign contract,
 * existence checks, byte round-trips, and the range-capable playback presign.
 */
@ActiveProfiles("test")
@TestPropertySource(
    properties = {
      "yukcsca.media.storage.bucket=" + MinioTestSupport.BUCKET,
      "yukcsca.media.storage.auto-create-bucket=true"
    })
class S3MediaStorageAdapterIT {
  private final MediaStoragePort storage =
      new S3MediaStorageAdapter(
          new MediaStorageProperties(
              MinioTestSupport.endpoint(),
              MinioTestSupport.endpoint(),
              "us-east-1",
              MinioTestSupport.BUCKET,
              MinioTestSupport.ACCESS_KEY,
              MinioTestSupport.SECRET_KEY,
              true,
              true,
              Duration.ofMinutes(10),
              Duration.ofMinutes(15)));

  @Test
  void presignedPutUploadsRawBytesWithoutExtraHeaders() throws Exception {
    String key = "video-uploads/" + UUID.randomUUID();
    byte[] payload = new byte[] {0x00, 0x00, 0x00, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'};

    MediaStoragePort.Presigned put = storage.presignPut(key, Duration.ofMinutes(10));
    assertThat(put.url()).contains("X-Amz-Signature");
    HttpResponse<Void> uploaded =
        HttpClient.newHttpClient()
            .send(
                HttpRequest.newBuilder(URI.create(put.url()))
                    .PUT(HttpRequest.BodyPublishers.ofByteArray(payload))
                    .build(),
                HttpResponse.BodyHandlers.discarding());
    assertThat(uploaded.statusCode()).isEqualTo(200);
    assertThat(storage.objectExists(key)).isTrue();
    assertThat(storage.objectExists("video-uploads/missing")).isFalse();
  }

  @Test
  void presignedUrlsUseBrowserReachableEndpointInsteadOfInternalServiceEndpoint() {
    MediaStoragePort splitEndpointStorage =
        new S3MediaStorageAdapter(
            new MediaStorageProperties(
                "http://minio.internal:9000",
                MinioTestSupport.endpoint(),
                "us-east-1",
                MinioTestSupport.BUCKET,
                MinioTestSupport.ACCESS_KEY,
                MinioTestSupport.SECRET_KEY,
                true,
                false,
                Duration.ofMinutes(10),
                Duration.ofMinutes(15)));

    MediaStoragePort.Presigned grant =
        splitEndpointStorage.presignGet("videos/example/video.mp4", Duration.ofMinutes(10));

    assertThat(grant.url()).startsWith(MinioTestSupport.endpoint());
    assertThat(grant.url()).doesNotContain("minio.internal");
  }

  @Test
  void captionBytesRoundTrip() {
    String key = "videos/" + UUID.randomUUID() + "/captions.vtt";
    storage.put(key, "text/vtt", "WEBVTT\n".getBytes(StandardCharsets.UTF_8));
    assertThat(new String(storage.get(key), StandardCharsets.UTF_8)).isEqualTo("WEBVTT\n");
  }

  @Test
  void presignedGetServesStoredBytesAndSupportsRanges() throws Exception {
    String key = "videos/" + UUID.randomUUID() + "/video.mp4";
    byte[] payload = new byte[2048];
    for (int index = 0; index < payload.length; index++) payload[index] = (byte) index;
    storage.put(key, "video/mp4", payload);

    MediaStoragePort.Presigned get = storage.presignGet(key, Duration.ofMinutes(10));
    HttpResponse<byte[]> full =
        HttpClient.newHttpClient()
            .send(
                HttpRequest.newBuilder(URI.create(get.url())).GET().build(),
                HttpResponse.BodyHandlers.ofByteArray());
    assertThat(full.statusCode()).isEqualTo(200);
    assertThat(full.body()).isEqualTo(payload);
    assertThat(full.headers().firstValue("Accept-Ranges")).contains("bytes");

    HttpResponse<byte[]> range =
        HttpClient.newHttpClient()
            .send(
                HttpRequest.newBuilder(URI.create(get.url()))
                    .header("Range", "bytes=0-1023")
                    .GET()
                    .build(),
                HttpResponse.BodyHandlers.ofByteArray());
    assertThat(range.statusCode()).isEqualTo(206);
    assertThat(range.body()).hasSize(1024);
  }
}
