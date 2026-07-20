package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.AuthIdentity;
import com.yukcsca.identity.domain.AuthProvider;
import java.util.Optional;

public interface AuthIdentityStore {
  Optional<AuthIdentity> findByProviderAndProviderSubject(
      AuthProvider provider, String providerSubject);

  AuthIdentity save(AuthIdentity identity);
}
