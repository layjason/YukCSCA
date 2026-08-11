package com.yukcsca.assessment.infrastructure;

import com.yukcsca.assessment.application.AssessmentSessionStore;
import com.yukcsca.assessment.domain.AssessmentSession;
import com.yukcsca.assessment.domain.AssessmentSessionStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentSessionRepository
    extends JpaRepository<AssessmentSession, UUID>, AssessmentSessionStore {
  @Override
  List<AssessmentSession> findByAccountIdAndStatusOrderByUpdatedAtDesc(
      UUID accountId, AssessmentSessionStatus status);

  @Override
  List<AssessmentSession> findByAccountIdAndSubjectAndStatusOrderByUpdatedAtDesc(
      UUID accountId, String subject, AssessmentSessionStatus status);
}
