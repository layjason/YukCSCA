package com.yukcsca.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.identity.application.PasswordRecoveryEmail;
import com.yukcsca.identity.application.PasswordRecoveryEmailSender;
import com.yukcsca.identity.application.VerificationEmail;
import com.yukcsca.identity.application.VerificationEmailSender;
import com.yukcsca.support.PostgresTestConfiguration;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@ActiveProfiles("test")
@SpringBootTest
@Import(PostgresTestConfiguration.class)
@Testcontainers
class VerificationEmailMailpitIT {
  private static final DockerImageName MAILPIT_IMAGE =
      DockerImageName.parse(
          "axllent/mailpit:v1.30.4@sha256:5a49a77c5bdbe7c5474450b4f46348d09949df3695257729c93a30369382d4f6");

  @Container
  static final GenericContainer<?> MAILPIT =
      new GenericContainer<>(MAILPIT_IMAGE)
          .withExposedPorts(1025, 8025)
          .waitingFor(Wait.forHttp("/readyz").forPort(8025));

  @Autowired VerificationEmailSender sender;
  @Autowired PasswordRecoveryEmailSender recoverySender;

  @DynamicPropertySource
  static void mailProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.mail.host", MAILPIT::getHost);
    registry.add("spring.mail.port", () -> MAILPIT.getMappedPort(1025));
  }

  @Test
  void smtpAdapterDeliversTrilingualVerificationMessageToMailpit() throws Exception {
    sender.send(
        new VerificationEmail(
            "recipient@example.test", "https://app.test/verify-email#token=non-secret-test-token"));

    URI messagesEndpoint =
        URI.create(
            "http://" + MAILPIT.getHost() + ":" + MAILPIT.getMappedPort(8025) + "/api/v1/messages");
    HttpResponse<String> response =
        HttpClient.newHttpClient()
            .send(
                HttpRequest.newBuilder(messagesEndpoint).GET().build(),
                HttpResponse.BodyHandlers.ofString());

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(response.body())
        .contains("recipient@example.test")
        .contains("Verifikasi email YukCSCA");
  }

  @Test
  void smtpAdapterDeliversTrilingualPasswordRecoveryMessageToMailpit() throws Exception {
    recoverySender.send(
        new PasswordRecoveryEmail(
            "recovery@example.test",
            "https://app.test/reset-password#token=non-secret-test-token"));

    URI messagesEndpoint =
        URI.create(
            "http://" + MAILPIT.getHost() + ":" + MAILPIT.getMappedPort(8025) + "/api/v1/messages");
    HttpResponse<String> response =
        HttpClient.newHttpClient()
            .send(
                HttpRequest.newBuilder(messagesEndpoint).GET().build(),
                HttpResponse.BodyHandlers.ofString());

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(response.body())
        .contains("recovery@example.test")
        .contains("Pulihkan kata sandi YukCSCA");
  }
}
