package com.yukcsca.academic.application;

import java.util.Optional;
import java.util.UUID;

/**
 * Assessment-owned lookup so academic terminology can resolve ITEM-sourced term lookups without
 * importing assessment JPA.
 */
public interface AssessmentItemContextPort {
  Optional<ItemContext> findOwnedItem(UUID accountId, UUID sessionId, UUID itemId);

  record ItemContext(
      UUID sessionId,
      UUID itemId,
      UUID packageRevisionId,
      UUID questionId,
      String examLanguage,
      String purpose) {}
}
