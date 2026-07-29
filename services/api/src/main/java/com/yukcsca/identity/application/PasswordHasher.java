package com.yukcsca.identity.application;

public interface PasswordHasher {
  String hash(String normalizedPassword);

  boolean matches(String normalizedPassword, String passwordHash);

  boolean needsUpgrade(String passwordHash);

  String dummyHash();
}
