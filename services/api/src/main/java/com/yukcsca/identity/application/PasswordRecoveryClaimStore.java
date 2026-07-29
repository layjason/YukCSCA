package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.PasswordRecoveryClaim;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PasswordRecoveryClaimStore {
  Optional<PasswordRecoveryClaim> findPendingForUpdateByUserId(UUID userId);

  Optional<PasswordRecoveryClaim> findForUpdateById(UUID id);

  Optional<String> findCanonicalEmailById(UUID id);

  Optional<PasswordRecoveryClaim> findById(UUID id);

  PasswordRecoveryClaim save(PasswordRecoveryClaim claim);

  void flush();

  int expirePendingBefore(Instant now);

  int deleteCompletedBefore(Instant cutoff);
}
