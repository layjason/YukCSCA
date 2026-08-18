package com.yukcsca.academic.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class FormalAssistancePolicyTest {
  @Test
  void reservedPolicyIsNeverDisabled() {
    assertThat(new ReservedFormalAssistancePolicy().isDisabled(UUID.randomUUID())).isFalse();
  }

  @Test
  void disabledPolicyThrowsDedicatedException() {
    FormalAssistanceDisabledException exception = new FormalAssistanceDisabledException();
    assertThat(exception.getMessage()).contains("formal");
    assertThatThrownBy(
            () -> {
              if (true) throw exception;
            })
        .isInstanceOf(FormalAssistanceDisabledException.class);
  }
}
