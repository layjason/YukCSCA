package com.yukcsca.assessment.application;

import com.yukcsca.assessment.domain.AssessmentSession;
import com.yukcsca.assessment.domain.AssessmentSessionStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssessmentSessionStore {
  AssessmentSession save(AssessmentSession session);

  Optional<AssessmentSession> findById(UUID id);

  List<AssessmentSession> findByAccountIdAndStatusOrderByUpdatedAtDesc(
      UUID accountId, AssessmentSessionStatus status);

  List<AssessmentSession> findByAccountIdAndSubjectAndStatusOrderByUpdatedAtDesc(
      UUID accountId, String subject, AssessmentSessionStatus status);
}
