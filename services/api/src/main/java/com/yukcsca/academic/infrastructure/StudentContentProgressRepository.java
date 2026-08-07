package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.StudentContentProgressStore;
import com.yukcsca.academic.domain.StudentContentProgress;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentContentProgressRepository
    extends JpaRepository<StudentContentProgress, UUID>, StudentContentProgressStore {
  @Override
  Optional<StudentContentProgress> findByAccountIdAndPackageIdAndResourceId(
      UUID accountId, UUID packageId, UUID resourceId);

  @Override
  List<StudentContentProgress> findByAccountIdAndPackageId(UUID accountId, UUID packageId);
}
