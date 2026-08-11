package com.yukcsca.assessment.infrastructure;

import com.yukcsca.assessment.application.AssessmentAssistanceEventStore;
import com.yukcsca.assessment.domain.AssessmentAssistanceEvent;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentAssistanceEventRepository
    extends JpaRepository<AssessmentAssistanceEvent, UUID>, AssessmentAssistanceEventStore {
  @Override
  List<AssessmentAssistanceEvent> findBySessionIdOrderByOccurredAtAsc(UUID sessionId);

  @Override
  Optional<AssessmentAssistanceEvent> findByItemAttemptIdAndTierIndex(
      UUID itemAttemptId, int tierIndex);

  @Override
  long countBySessionId(UUID sessionId);
}
