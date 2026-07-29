package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.CredentialAuthenticatorStore;
import com.yukcsca.identity.domain.CredentialAuthenticator;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CredentialAuthenticatorRepository
    extends JpaRepository<CredentialAuthenticator, UUID>, CredentialAuthenticatorStore {
  @Override
  @Query(
      "select authenticator from CredentialAuthenticator authenticator "
          + "join fetch authenticator.user where authenticator.userId = :userId")
  Optional<CredentialAuthenticator> findByUserId(@Param("userId") UUID userId);
}
