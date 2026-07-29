package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.PasswordHasher;
import java.util.Map;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class Argon2PasswordHasher implements PasswordHasher {
  private static final String ALGORITHM = "argon2id-v1";

  private final PasswordEncoder encoder;
  private final String dummyHash;

  public Argon2PasswordHasher() {
    Argon2PasswordEncoder argon2 = new Argon2PasswordEncoder(16, 32, 1, 19 * 1024, 2);
    this.encoder = new DelegatingPasswordEncoder(ALGORITHM, Map.of(ALGORITHM, argon2));
    this.dummyHash = encoder.encode("yukcsca-dummy-password-verification-value");
  }

  @Override
  public String hash(String normalizedPassword) {
    return encoder.encode(normalizedPassword);
  }

  @Override
  public boolean matches(String normalizedPassword, String passwordHash) {
    return encoder.matches(normalizedPassword, passwordHash);
  }

  @Override
  public boolean needsUpgrade(String passwordHash) {
    return encoder.upgradeEncoding(passwordHash);
  }

  @Override
  public String dummyHash() {
    return dummyHash;
  }
}
