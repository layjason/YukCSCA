package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.StudentContentProgress;
import com.yukcsca.academic.domain.StudentContentProgressStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentContentProgressQueryService implements StudentContentProgressQuery {
  private final StudentContentProgressStore progressStore;

  public StudentContentProgressQueryService(StudentContentProgressStore progressStore) {
    this.progressStore = progressStore;
  }

  @Override
  @Transactional(readOnly = true)
  public boolean isContentComplete(UUID accountId, UUID packageId, UUID resourceId) {
    return progressStore
        .findByAccountIdAndPackageIdAndResourceId(accountId, packageId, resourceId)
        .map(row -> row.getStatus() == StudentContentProgressStatus.CONTENT_COMPLETE)
        .orElse(false);
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<ContentProgressStatusView> find(UUID accountId, UUID packageId, UUID resourceId) {
    return progressStore
        .findByAccountIdAndPackageIdAndResourceId(accountId, packageId, resourceId)
        .map(
            (StudentContentProgress row) ->
                new ContentProgressStatusView(row.getStatus().name(), row.getLastRevisionId()));
  }
}
