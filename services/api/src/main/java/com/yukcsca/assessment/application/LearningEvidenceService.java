package com.yukcsca.assessment.application;

import com.yukcsca.assessment.domain.AssessmentObjectiveEvidence;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningEvidenceService implements LearningEvidencePort {
  private final AssessmentObjectiveEvidenceStore evidenceStore;

  public LearningEvidenceService(AssessmentObjectiveEvidenceStore evidenceStore) {
    this.evidenceStore = evidenceStore;
  }

  @Override
  @Transactional(readOnly = true)
  public List<EvidenceSnapshot> listByAccountAndObjective(UUID accountId, UUID objectiveId) {
    return evidenceStore
        .findByAccountIdAndObjectiveIdOrderByOccurredAtDesc(accountId, objectiveId)
        .stream()
        .map(LearningEvidenceService::toSnapshot)
        .toList();
  }

  @Override
  @Transactional(readOnly = true)
  public List<EvidenceSnapshot> listRecentByAccount(UUID accountId, int limit) {
    int capped = Math.max(1, Math.min(limit, 8));
    return evidenceStore.findTop8ByAccountIdOrderByOccurredAtDesc(accountId).stream()
        .limit(capped)
        .map(LearningEvidenceService::toSnapshot)
        .toList();
  }

  private static EvidenceSnapshot toSnapshot(AssessmentObjectiveEvidence evidence) {
    return new EvidenceSnapshot(
        evidence.getObjectiveId(),
        evidence.getSignal(),
        evidence.getSourceSessionId(),
        evidence.getOccurredAt());
  }
}
