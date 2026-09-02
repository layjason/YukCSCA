package com.yukcsca.assessment.application;

import com.yukcsca.assessment.domain.AssessmentObjectiveEvidence;
import java.util.List;
import java.util.UUID;

public interface AssessmentObjectiveEvidenceStore {
  AssessmentObjectiveEvidence save(AssessmentObjectiveEvidence evidence);

  List<AssessmentObjectiveEvidence> findBySourceSessionId(UUID sourceSessionId);

  List<AssessmentObjectiveEvidence> findByAccountIdAndObjectiveIdOrderByOccurredAtDesc(
      UUID accountId, UUID objectiveId);

  List<AssessmentObjectiveEvidence> findTop8ByAccountIdOrderByOccurredAtDesc(UUID accountId);

  boolean existsBySourceSessionIdAndObjectiveId(UUID sourceSessionId, UUID objectiveId);
}
