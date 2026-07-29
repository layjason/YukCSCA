package com.yukcsca.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.text.Normalizer;
import org.junit.jupiter.api.Test;

class PasswordPolicyTest {
  private final PasswordPolicy policy = new PasswordPolicy();

  @Test
  void normalizesUnicodeBeforeApplyingTheCodePointPolicy() {
    String decomposed = "cafe\u0301 mountain river lantern";

    String normalized = policy.validateAndNormalize(decomposed);

    assertThat(normalized).isEqualTo(Normalizer.normalize(decomposed, Normalizer.Form.NFC));
  }

  @Test
  void rejectsShortAndBlocklistedWholePasswords() {
    assertThatThrownBy(() -> policy.validateAndNormalize("too short"))
        .isInstanceOf(PasswordPolicyException.class);
    assertThatThrownBy(() -> policy.validateAndNormalize("password password"))
        .isInstanceOf(PasswordPolicyException.class);
  }
}
