package com.yukcsca.assessment.infrastructure;

import com.yukcsca.assessment.application.AssessmentMistakeStore;
import com.yukcsca.assessment.domain.AssessmentMistake;
import com.yukcsca.assessment.domain.MistakeStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssessmentMistakeRepository
    extends JpaRepository<AssessmentMistake, UUID>, AssessmentMistakeStore {
  @Override
  Optional<AssessmentMistake> findByAccountIdAndPackageIdAndQuestionId(
      UUID accountId, UUID packageId, UUID questionId);

  @Query(
      "select m from AssessmentMistake m where m.accountId = :accountId order by m.updatedAt desc, m.id desc")
  List<AssessmentMistake> findPageByAccount(@Param("accountId") UUID accountId, Pageable pageable);

  @Query(
      "select m from AssessmentMistake m where m.accountId = :accountId and m.subject = :subject order by m.updatedAt desc, m.id desc")
  List<AssessmentMistake> findPageByAccountAndSubject(
      @Param("accountId") UUID accountId, @Param("subject") String subject, Pageable pageable);

  @Query(
      """
      select m from AssessmentMistake m
      where m.accountId = :accountId
        and (m.updatedAt < :cursorUpdatedAt
          or (m.updatedAt = :cursorUpdatedAt and m.id < :cursorId))
      order by m.updatedAt desc, m.id desc
      """)
  List<AssessmentMistake> findPageByAccountAfter(
      @Param("accountId") UUID accountId,
      @Param("cursorUpdatedAt") Instant cursorUpdatedAt,
      @Param("cursorId") UUID cursorId,
      Pageable pageable);

  @Query(
      """
      select m from AssessmentMistake m
      where m.accountId = :accountId
        and m.subject = :subject
        and (m.updatedAt < :cursorUpdatedAt
          or (m.updatedAt = :cursorUpdatedAt and m.id < :cursorId))
      order by m.updatedAt desc, m.id desc
      """)
  List<AssessmentMistake> findPageByAccountAndSubjectAfter(
      @Param("accountId") UUID accountId,
      @Param("subject") String subject,
      @Param("cursorUpdatedAt") Instant cursorUpdatedAt,
      @Param("cursorId") UUID cursorId,
      Pageable pageable);

  @Override
  default List<AssessmentMistake> findByAccountIdOrderByUpdatedAtDesc(UUID accountId, int limit) {
    return findPageByAccount(accountId, Pageable.ofSize(Math.max(1, limit)));
  }

  @Override
  default List<AssessmentMistake> findByAccountIdAndSubjectOrderByUpdatedAtDesc(
      UUID accountId, String subject, int limit) {
    return findPageByAccountAndSubject(accountId, subject, Pageable.ofSize(Math.max(1, limit)));
  }

  @Override
  default List<AssessmentMistake> findByAccountIdAfterCursor(
      UUID accountId, Instant cursorUpdatedAt, UUID cursorId, int limit) {
    return findPageByAccountAfter(
        accountId, cursorUpdatedAt, cursorId, Pageable.ofSize(Math.max(1, limit)));
  }

  @Override
  default List<AssessmentMistake> findByAccountIdAndSubjectAfterCursor(
      UUID accountId, String subject, Instant cursorUpdatedAt, UUID cursorId, int limit) {
    return findPageByAccountAndSubjectAfter(
        accountId, subject, cursorUpdatedAt, cursorId, Pageable.ofSize(Math.max(1, limit)));
  }

  @Query(
      """
      select m from AssessmentMistake m
      where m.accountId = :accountId and m.status = :status
      order by m.updatedAt desc, m.id desc
      """)
  List<AssessmentMistake> findPageByAccountAndStatus(
      @Param("accountId") UUID accountId, @Param("status") MistakeStatus status, Pageable pageable);

  @Query(
      """
      select m from AssessmentMistake m
      where m.accountId = :accountId and m.subject = :subject and m.status = :status
      order by m.updatedAt desc, m.id desc
      """)
  List<AssessmentMistake> findPageByAccountAndSubjectAndStatus(
      @Param("accountId") UUID accountId,
      @Param("subject") String subject,
      @Param("status") MistakeStatus status,
      Pageable pageable);

  @Query(
      """
      select m from AssessmentMistake m
      where m.accountId = :accountId
        and m.status = :status
        and (m.updatedAt < :cursorUpdatedAt
          or (m.updatedAt = :cursorUpdatedAt and m.id < :cursorId))
      order by m.updatedAt desc, m.id desc
      """)
  List<AssessmentMistake> findPageByAccountAndStatusAfter(
      @Param("accountId") UUID accountId,
      @Param("status") MistakeStatus status,
      @Param("cursorUpdatedAt") Instant cursorUpdatedAt,
      @Param("cursorId") UUID cursorId,
      Pageable pageable);

  @Query(
      """
      select m from AssessmentMistake m
      where m.accountId = :accountId
        and m.subject = :subject
        and m.status = :status
        and (m.updatedAt < :cursorUpdatedAt
          or (m.updatedAt = :cursorUpdatedAt and m.id < :cursorId))
      order by m.updatedAt desc, m.id desc
      """)
  List<AssessmentMistake> findPageByAccountAndSubjectAndStatusAfter(
      @Param("accountId") UUID accountId,
      @Param("subject") String subject,
      @Param("status") MistakeStatus status,
      @Param("cursorUpdatedAt") Instant cursorUpdatedAt,
      @Param("cursorId") UUID cursorId,
      Pageable pageable);

  @Override
  default List<AssessmentMistake> findPage(
      UUID accountId, String subject, MistakeStatus status, int limit) {
    Pageable pageable = Pageable.ofSize(Math.max(1, limit));
    if (status == null && subject == null) {
      return findPageByAccount(accountId, pageable);
    }
    if (status == null) {
      return findPageByAccountAndSubject(accountId, subject, pageable);
    }
    if (subject == null) {
      return findPageByAccountAndStatus(accountId, status, pageable);
    }
    return findPageByAccountAndSubjectAndStatus(accountId, subject, status, pageable);
  }

  @Override
  default List<AssessmentMistake> findPageAfterCursor(
      UUID accountId,
      String subject,
      MistakeStatus status,
      Instant cursorUpdatedAt,
      UUID cursorId,
      int limit) {
    Pageable pageable = Pageable.ofSize(Math.max(1, limit));
    if (status == null && subject == null) {
      return findPageByAccountAfter(accountId, cursorUpdatedAt, cursorId, pageable);
    }
    if (status == null) {
      return findPageByAccountAndSubjectAfter(
          accountId, subject, cursorUpdatedAt, cursorId, pageable);
    }
    if (subject == null) {
      return findPageByAccountAndStatusAfter(
          accountId, status, cursorUpdatedAt, cursorId, pageable);
    }
    return findPageByAccountAndSubjectAndStatusAfter(
        accountId, subject, status, cursorUpdatedAt, cursorId, pageable);
  }
}
