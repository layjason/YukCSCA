package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.CredentialEmailOutbox;
import java.time.Instant;
import java.util.List;

public interface CredentialEmailOutboxStore {
  CredentialEmailOutbox save(CredentialEmailOutbox delivery);

  List<CredentialEmailOutbox> findDueForUpdate(Instant now, int limit);
}
