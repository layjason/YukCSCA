package com.yukcsca.support;

import java.time.Duration;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.HttpWaitStrategy;
import org.testcontainers.utility.DockerImageName;

/**
 * Shared MinIO container for S3-backed integration tests (VS-010B). One instance serves the whole
 * suite; credentials and bucket mirror the Compose dev setup.
 */
public final class MinioTestSupport {
  public static final String ACCESS_KEY = "yukcsca-test";
  public static final String SECRET_KEY = "yukcsca-test-secret";
  public static final String BUCKET = "yukcsca-test-media";

  private static final GenericContainer<?> MINIO =
      new GenericContainer<>(DockerImageName.parse("minio/minio:RELEASE.2025-04-22T22-12-26Z"))
          .withCommand("server /data")
          .withExposedPorts(9000)
          .withEnv("MINIO_ROOT_USER", ACCESS_KEY)
          .withEnv("MINIO_ROOT_PASSWORD", SECRET_KEY)
          .waitingFor(
              new HttpWaitStrategy()
                  .forPath("/minio/health/live")
                  .forPort(9000)
                  .withStartupTimeout(Duration.ofMinutes(3)));

  static {
    MINIO.start();
  }

  private MinioTestSupport() {}

  public static String endpoint() {
    startOnce();
    return "http://" + MINIO.getHost() + ":" + MINIO.getMappedPort(9000);
  }

  private static void startOnce() {
    if (!MINIO.isRunning()) MINIO.start();
  }
}
