package com.yukcsca.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class RefreshTokenCodecTest {
  private final RefreshTokenCodec codec = new RefreshTokenCodec();

  @Test
  void generatesUniqueTokensWithStableHashes() {
    String first = codec.generate();
    String second = codec.generate();
    assertThat(first).isNotEqualTo(second);
    assertThat(codec.hash(first)).hasSize(64).isEqualTo(codec.hash(first));
  }

  @Test
  void rejectsBlankTokenBeforeHashing() {
    assertThatThrownBy(() -> codec.hash("  ")).isInstanceOf(IllegalArgumentException.class);
  }
}
