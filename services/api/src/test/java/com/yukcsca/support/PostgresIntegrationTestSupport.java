package com.yukcsca.support;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@Testcontainers
public abstract class PostgresIntegrationTestSupport {
  @Container @ServiceConnection
  protected static final PostgreSQLContainer POSTGRES =
      new PostgreSQLContainer("postgres:18-alpine");
}
