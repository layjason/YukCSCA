package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.StudentContentProgress;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentContentProgressStore {
  Optional<StudentContentProgress> findByAccountIdAndPackageIdAndResourceId(
      UUID accountId, UUID packageId, UUID resourceId);

  List<StudentContentProgress> findByAccountIdAndPackageId(UUID accountId, UUID packageId);

  StudentContentProgress save(StudentContentProgress progress);
}
