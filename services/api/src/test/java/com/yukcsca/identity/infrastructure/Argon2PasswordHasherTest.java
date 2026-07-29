package com.yukcsca.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;

class Argon2PasswordHasherTest {
  @Test
  void producesVersionedArgon2idHashesAndRecognizesWeakerParametersForUpgrade() {
    Argon2PasswordHasher hasher = new Argon2PasswordHasher();
    String password = "violet mountain library compass";

    String currentHash = hasher.hash(password);
    String weakerHash =
        "{argon2id-v1}" + new Argon2PasswordEncoder(16, 32, 1, 4096, 1).encode(password);

    assertThat(currentHash).startsWith("{argon2id-v1}$argon2id$");
    assertThat(currentHash).doesNotContain(password);
    assertThat(hasher.matches(password, currentHash)).isTrue();
    assertThat(hasher.needsUpgrade(currentHash)).isFalse();
    assertThat(hasher.needsUpgrade(weakerHash)).isTrue();
  }
}
