package com.yukcsca.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class VerificationTokenCodecTest {
  @Test
  void bindsTheRandomClaimIdAndRejectsTampering() {
    CredentialAuthSettings settings = org.mockito.Mockito.mock(CredentialAuthSettings.class);
    when(settings.verificationSecret()).thenReturn("01234567890123456789012345678901");
    VerificationTokenCodec codec = new VerificationTokenCodec(settings);
    UUID claimId = UUID.randomUUID();

    String token = codec.tokenFor(claimId);

    assertThat(codec.claimIdFrom(token)).contains(claimId);
    assertThat(codec.hash(token)).hasSize(64).doesNotContain(token);
    assertThat(codec.claimIdFrom(token + "x")).isEmpty();
  }
}
