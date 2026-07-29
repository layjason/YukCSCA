package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.CredentialAuthenticator;
import java.util.Optional;
import java.util.UUID;

public interface CredentialAuthenticatorStore {
  Optional<CredentialAuthenticator> findByUserId(UUID userId);

  Optional<CredentialAuthenticator> findForUpdateByUserId(UUID userId);

  CredentialAuthenticator save(CredentialAuthenticator authenticator);
}
