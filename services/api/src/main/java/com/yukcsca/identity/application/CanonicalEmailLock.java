package com.yukcsca.identity.application;

public interface CanonicalEmailLock {
  void lock(String canonicalEmail);
}
