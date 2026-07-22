package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.AuthIdentityStore;
import com.yukcsca.identity.domain.AuthIdentity;
import com.yukcsca.identity.domain.AuthProvider;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuthIdentityRepository
    extends JpaRepository<AuthIdentity, UUID>, AuthIdentityStore {
  @Query(
      "select identity from AuthIdentity identity join fetch identity.user "
          + "where identity.provider = :provider and identity.providerSubject = :providerSubject")
  Optional<AuthIdentity> findByProviderAndProviderSubject(
      @Param("provider") AuthProvider provider, @Param("providerSubject") String providerSubject);
}
