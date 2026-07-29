package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.PasswordRecoveryEmailOutbox;
import java.time.Instant;
import java.util.List;

public interface PasswordRecoveryEmailOutboxStore {
  PasswordRecoveryEmailOutbox save(PasswordRecoveryEmailOutbox delivery);

  List<PasswordRecoveryEmailOutbox> findDueForUpdate(Instant now, int limit);
}
