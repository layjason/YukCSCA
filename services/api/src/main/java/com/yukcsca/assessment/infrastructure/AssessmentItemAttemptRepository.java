package com.yukcsca.assessment.infrastructure;

import com.yukcsca.assessment.application.AssessmentItemAttemptStore;
import com.yukcsca.assessment.domain.AssessmentItemAttempt;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentItemAttemptRepository
    extends JpaRepository<AssessmentItemAttempt, UUID>, AssessmentItemAttemptStore {
  @Override
  List<AssessmentItemAttempt> findBySessionIdOrderByItemOrderAsc(UUID sessionId);

  @Override
  Optional<AssessmentItemAttempt> findByIdAndSessionId(UUID id, UUID sessionId);
}
