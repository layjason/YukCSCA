package com.yukcsca.assessment.application;

import com.yukcsca.assessment.domain.AssessmentItemAttempt;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssessmentItemAttemptStore {
  AssessmentItemAttempt save(AssessmentItemAttempt attempt);

  List<AssessmentItemAttempt> findBySessionIdOrderByItemOrderAsc(UUID sessionId);

  Optional<AssessmentItemAttempt> findByIdAndSessionId(UUID id, UUID sessionId);
}
