package com.yukcsca.assessment.infrastructure;

import com.yukcsca.assessment.application.AssessmentObjectiveEvidenceStore;
import com.yukcsca.assessment.domain.AssessmentObjectiveEvidence;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentObjectiveEvidenceRepository
    extends JpaRepository<AssessmentObjectiveEvidence, UUID>, AssessmentObjectiveEvidenceStore {
  @Override
  List<AssessmentObjectiveEvidence> findBySourceSessionId(UUID sourceSessionId);

  @Override
  List<AssessmentObjectiveEvidence> findByAccountIdAndObjectiveIdOrderByOccurredAtDesc(
      UUID accountId, UUID objectiveId);
}
