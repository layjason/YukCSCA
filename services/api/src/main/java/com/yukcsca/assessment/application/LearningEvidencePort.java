package com.yukcsca.assessment.application;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Read-oriented evidence port for later modules (diagnostics, plans, agents). Does not expose JPA.
 */
public interface LearningEvidencePort {
  List<EvidenceSnapshot> listByAccountAndObjective(UUID accountId, UUID objectiveId);

  record EvidenceSnapshot(UUID objectiveId, String signal, UUID sourceSessionId, Instant at) {}
}
