package com.yukcsca.academic.application;

import java.time.Instant;

/** Durable scheduling boundary for deletion of private VS-010B media objects. */
public interface MediaObjectCleanupStore {
  enum Reason {
    STAGING,
    ORPHAN_OUTPUT,
    RETIRED_ASSET
  }

  void schedule(String storageKey, Instant deleteAfter, Reason reason);

  /** Commits cleanup protection before an external write that cannot join the DB transaction. */
  void protectBeforeExternalWrite(String storageKey, Instant deleteAfter, Reason reason);

  void cancel(String storageKey);

  /** Locks the cleanup row and rejects a retry once deletion is due or already claimed. */
  boolean reserveValidationRetry(String storageKey, Instant now);
}
