package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.EmailVerificationClaim;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationClaimStore {
  Optional<EmailVerificationClaim> findPendingForUpdateByCanonicalEmail(String canonicalEmail);

  Optional<EmailVerificationClaim> findForUpdateById(UUID id);

  Optional<EmailVerificationClaim> findById(UUID id);

  EmailVerificationClaim save(EmailVerificationClaim claim);

  void flush();

  int expirePendingBefore(Instant now);

  int deleteCompletedBefore(Instant cutoff);
}
