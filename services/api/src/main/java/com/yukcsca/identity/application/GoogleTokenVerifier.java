package com.yukcsca.identity.application;

public interface GoogleTokenVerifier {
  GoogleIdentity verify(String credential);
}
