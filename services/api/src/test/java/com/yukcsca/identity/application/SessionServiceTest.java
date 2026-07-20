package com.yukcsca.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yukcsca.identity.domain.AuthSession;
import com.yukcsca.identity.domain.UserAccount;
import com.yukcsca.identity.infrastructure.security.AuthProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class SessionServiceTest {
  private static final Instant NOW = Instant.parse("2026-07-19T00:00:00Z");
  private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
  private static final AuthProperties PROPERTIES =
      new AuthProperties(
          "google-client",
          "01234567890123456789012345678901",
          "http://localhost:8080",
          "http://localhost:5173",
          false,
          "Lax",
          Duration.ofMinutes(15),
          Duration.ofDays(30));

  @Test
  void rotatesAnActiveTokenWithinTheSameFamily() {
    AuthSessionStore repository = mock(AuthSessionStore.class);
    RefreshTokenCodec codec = new RefreshTokenCodec();
    SecurityEventService securityEvents = mock(SecurityEventService.class);
    SessionService service =
        new SessionService(repository, codec, PROPERTIES, securityEvents, CLOCK);
    UserAccount user = UserAccount.createGoogleUser("student@example.com", "Student", null, NOW);
    UUID familyId = UUID.randomUUID();
    String rawToken = "existing-refresh-token";
    AuthSession existing =
        new AuthSession(
            user,
            codec.hash(rawToken),
            familyId,
            NOW.plus(Duration.ofDays(1)),
            NOW.minusSeconds(60));
    when(repository.findForUpdateByTokenHash(codec.hash(rawToken)))
        .thenReturn(Optional.of(existing));
    when(repository.save(any(AuthSession.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    SessionService.SessionToken rotated = service.rotate(rawToken);

    assertThat(rotated.rawToken()).isNotBlank().isNotEqualTo(rawToken);
    assertThat(rotated.user()).isSameAs(user);
    ArgumentCaptor<AuthSession> successor = ArgumentCaptor.forClass(AuthSession.class);
    verify(repository).save(successor.capture());
    assertThat(successor.getValue().getFamilyId()).isEqualTo(familyId);
    assertThat(existing.isRevoked()).isTrue();
  }

  @Test
  void revokesTheTokenFamilyWhenARotatedTokenIsReused() {
    AuthSessionStore repository = mock(AuthSessionStore.class);
    RefreshTokenCodec codec = new RefreshTokenCodec();
    SecurityEventService securityEvents = mock(SecurityEventService.class);
    SessionService service =
        new SessionService(repository, codec, PROPERTIES, securityEvents, CLOCK);
    UserAccount user = UserAccount.createGoogleUser("student@example.com", "Student", null, NOW);
    UUID familyId = UUID.randomUUID();
    String rawToken = "replayed-refresh-token";
    AuthSession existing =
        new AuthSession(
            user,
            codec.hash(rawToken),
            familyId,
            NOW.plus(Duration.ofDays(1)),
            NOW.minusSeconds(120));
    existing.rotateAt(NOW.minusSeconds(30), UUID.randomUUID());
    when(repository.findForUpdateByTokenHash(codec.hash(rawToken)))
        .thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> service.rotate(rawToken))
        .isInstanceOf(InvalidCredentialException.class)
        .hasMessageContaining("reused");
    verify(repository).revokeActiveFamily(eq(familyId), eq(NOW));
  }
}
