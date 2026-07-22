package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.UserAccount;
import java.util.Optional;
import java.util.UUID;

public interface UserAccountStore {
  Optional<UserAccount> findById(UUID id);

  Optional<UserAccount> findByIdForUpdate(UUID id);

  Optional<UserAccount> findByEmailIgnoreCase(String email);

  UserAccount save(UserAccount user);
}
