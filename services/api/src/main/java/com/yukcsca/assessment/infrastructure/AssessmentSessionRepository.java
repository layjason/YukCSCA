package com.yukcsca.assessment.infrastructure;

import com.yukcsca.assessment.application.AssessmentSessionStore;
import com.yukcsca.assessment.domain.AssessmentSession;
import com.yukcsca.assessment.domain.AssessmentSessionPurpose;
import com.yukcsca.assessment.domain.AssessmentSessionStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssessmentSessionRepository
    extends JpaRepository<AssessmentSession, UUID>, AssessmentSessionStore {
  @Override
  List<AssessmentSession> findByAccountIdAndStatusOrderByUpdatedAtDesc(
      UUID accountId, AssessmentSessionStatus status);

  @Override
  List<AssessmentSession> findByAccountIdAndSubjectAndStatusOrderByUpdatedAtDesc(
      UUID accountId, String subject, AssessmentSessionStatus status);

  @Override
  Optional<AssessmentSession>
      findFirstByAccountIdAndPurposeAndSetIdAndExamLanguageAndStatusOrderByUpdatedAtDesc(
          UUID accountId,
          AssessmentSessionPurpose purpose,
          UUID setId,
          String examLanguage,
          AssessmentSessionStatus status);

  @Override
  Optional<AssessmentSession>
      findFirstByAccountIdAndPurposeAndMistakeIdAndStatusOrderByUpdatedAtDesc(
          UUID accountId,
          AssessmentSessionPurpose purpose,
          UUID mistakeId,
          AssessmentSessionStatus status);

  @Override
  List<AssessmentSession> findByAccountIdAndPurposeAndMistakeIdAndStatusOrderByUpdatedAtDesc(
      UUID accountId,
      AssessmentSessionPurpose purpose,
      UUID mistakeId,
      AssessmentSessionStatus status);

  @Override
  Optional<AssessmentSession>
      findFirstByAccountIdAndPurposeAndLessonResourceIdAndStatusOrderByUpdatedAtDesc(
          UUID accountId,
          AssessmentSessionPurpose purpose,
          UUID lessonResourceId,
          AssessmentSessionStatus status);

  @Override
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from AssessmentSession s where s.id = :id")
  Optional<AssessmentSession> lockById(@Param("id") UUID id);
}
