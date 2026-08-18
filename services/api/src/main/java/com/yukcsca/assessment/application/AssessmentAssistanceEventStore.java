package com.yukcsca.assessment.application;

import com.yukcsca.assessment.domain.AssessmentAssistanceEvent;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssessmentAssistanceEventStore {
  AssessmentAssistanceEvent save(AssessmentAssistanceEvent event);

  List<AssessmentAssistanceEvent> findBySessionIdOrderByOccurredAtAsc(UUID sessionId);

  Optional<AssessmentAssistanceEvent> findByItemAttemptIdAndTierIndex(
      UUID itemAttemptId, int tierIndex);

  Optional<AssessmentAssistanceEvent> findByItemAttemptIdAndKindAndTierIndex(
      UUID itemAttemptId, String kind, int tierIndex);

  long countBySessionId(UUID sessionId);

  long countBySessionIdAndKind(UUID sessionId, String kind);
}
