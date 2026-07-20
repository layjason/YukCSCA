package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.AuthIdentityStore;
import com.yukcsca.identity.domain.AuthIdentity;
import com.yukcsca.identity.domain.AuthProvider;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthIdentityRepository
    extends JpaRepository<AuthIdentity, UUID>, AuthIdentityStore {
  Optional<AuthIdentity> findByProviderAndProviderSubject(
      AuthProvider provider, String providerSubject);
}
