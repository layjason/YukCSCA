package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.UserAccountStore;
import com.yukcsca.identity.domain.UserAccount;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID>, UserAccountStore {
  Optional<UserAccount> findByEmailIgnoreCase(String email);

  @Override
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select account from UserAccount account where account.email = :canonicalEmail")
  Optional<UserAccount> findByCanonicalEmailForUpdate(
      @Param("canonicalEmail") String canonicalEmail);

  @Override
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select account from UserAccount account where account.id = :id")
  Optional<UserAccount> findByIdForUpdate(@Param("id") UUID id);
}
