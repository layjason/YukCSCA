package com.yukcsca.assessment.application;

import com.yukcsca.assessment.domain.AssessmentSession;
import com.yukcsca.assessment.domain.AssessmentSessionPurpose;
import com.yukcsca.assessment.domain.AssessmentSessionStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssessmentSessionStore {
  AssessmentSession save(AssessmentSession session);

  void flush();

  Optional<AssessmentSession> findById(UUID id);

  Optional<AssessmentSession> lockById(UUID id);

  List<AssessmentSession> findByAccountIdAndStatusOrderByUpdatedAtDesc(
      UUID accountId, AssessmentSessionStatus status);

  List<AssessmentSession> findByAccountIdAndSubjectAndStatusOrderByUpdatedAtDesc(
      UUID accountId, String subject, AssessmentSessionStatus status);

  Optional<AssessmentSession>
      findFirstByAccountIdAndPurposeAndSetIdAndExamLanguageAndStatusOrderByUpdatedAtDesc(
          UUID accountId,
          AssessmentSessionPurpose purpose,
          UUID setId,
          String examLanguage,
          AssessmentSessionStatus status);

  Optional<AssessmentSession>
      findFirstByAccountIdAndPurposeAndMistakeIdAndStatusOrderByUpdatedAtDesc(
          UUID accountId,
          AssessmentSessionPurpose purpose,
          UUID mistakeId,
          AssessmentSessionStatus status);

  List<AssessmentSession> findByAccountIdAndPurposeAndMistakeIdAndStatusOrderByUpdatedAtDesc(
      UUID accountId,
      AssessmentSessionPurpose purpose,
      UUID mistakeId,
      AssessmentSessionStatus status);

  Optional<AssessmentSession>
      findFirstByAccountIdAndPurposeAndLessonResourceIdAndStatusOrderByUpdatedAtDesc(
          UUID accountId,
          AssessmentSessionPurpose purpose,
          UUID lessonResourceId,
          AssessmentSessionStatus status);
}
