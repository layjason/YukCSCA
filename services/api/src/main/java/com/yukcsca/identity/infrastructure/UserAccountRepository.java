package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.UserAccountStore;
import com.yukcsca.identity.domain.UserAccount;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID>, UserAccountStore {
  Optional<UserAccount> findByEmailIgnoreCase(String email);
}
