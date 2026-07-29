package com.yukcsca.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class PasswordRecoveryTokenCodecTest {
  @Test
  void bindsPurposeAndClaimIdWithoutStoringTheRawToken() {
    CredentialAuthSettings settings = org.mockito.Mockito.mock(CredentialAuthSettings.class);
    when(settings.verificationSecret()).thenReturn("01234567890123456789012345678901");
    PasswordRecoveryTokenCodec recoveryCodec = new PasswordRecoveryTokenCodec(settings);
    VerificationTokenCodec verificationCodec = new VerificationTokenCodec(settings);
    UUID claimId = UUID.randomUUID();

    String token = recoveryCodec.tokenFor(claimId);

    assertThat(recoveryCodec.claimIdFrom(token)).contains(claimId);
    assertThat(recoveryCodec.hash(token)).hasSize(64).doesNotContain(token);
    assertThat(recoveryCodec.claimIdFrom(token + "x")).isEmpty();
    assertThat(verificationCodec.claimIdFrom(token)).isEmpty();
    assertThat(recoveryCodec.claimIdFrom(verificationCodec.tokenFor(claimId))).isEmpty();
  }
}
