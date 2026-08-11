package com.yukcsca.assessment.application;

import com.yukcsca.assessment.domain.AssessmentMistake;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssessmentMistakeStore {
  AssessmentMistake save(AssessmentMistake mistake);

  Optional<AssessmentMistake> findById(UUID id);

  Optional<AssessmentMistake> findByAccountIdAndPackageIdAndQuestionId(
      UUID accountId, UUID packageId, UUID questionId);

  List<AssessmentMistake> findByAccountIdOrderByUpdatedAtDesc(UUID accountId, int limit);

  List<AssessmentMistake> findByAccountIdAndSubjectOrderByUpdatedAtDesc(
      UUID accountId, String subject, int limit);

  /**
   * Keyset page after the row identified by (updatedAt, id), ordered by updatedAt desc, id desc.
   * First page uses {@link #findByAccountIdOrderByUpdatedAtDesc}.
   */
  List<AssessmentMistake> findByAccountIdAfterCursor(
      UUID accountId, Instant cursorUpdatedAt, UUID cursorId, int limit);

  List<AssessmentMistake> findByAccountIdAndSubjectAfterCursor(
      UUID accountId, String subject, Instant cursorUpdatedAt, UUID cursorId, int limit);
}
