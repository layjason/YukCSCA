package com.yukcsca.assessment.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Assessment-owned Ask context and AGENT_QA write. Agent must not import assessment JPA. */
public interface AgentAssessmentContextPort {
  Optional<AuthorisedItemContext> findOwnedItem(UUID accountId, UUID sessionId, UUID itemId);

  Optional<AuthorisedMistakeContext> findOwnedMistake(UUID accountId, UUID mistakeId);

  /**
   * Records {@code AGENT_QA} STRONG assistance on the first OPEN Ask for this item. Returns true
   * when a new row was inserted. LOCKED items are a no-op.
   */
  boolean recordAgentQaIfOpen(UUID accountId, UUID sessionId, UUID itemId);

  record AuthorisedItemContext(
      UUID sessionId,
      UUID itemId,
      UUID packageId,
      UUID packageRevisionId,
      String subject,
      String examLanguage,
      String purpose,
      boolean open,
      String stemText,
      String reviewedExplanation) {}

  record AuthorisedMistakeContext(
      UUID mistakeId,
      UUID packageId,
      UUID packageRevisionId,
      String subject,
      String examLanguage,
      String stemText,
      String reviewedExplanation,
      List<UUID> objectiveIds) {}
}
