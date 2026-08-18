package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.StudentTerminologyPreviewProgress;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentTerminologyPreviewProgressStore {
  Optional<StudentTerminologyPreviewProgress> findByAccountIdAndPackageIdAndResourceId(
      UUID accountId, UUID packageId, UUID resourceId);

  List<StudentTerminologyPreviewProgress> findByAccountIdAndPackageId(
      UUID accountId, UUID packageId);

  StudentTerminologyPreviewProgress save(StudentTerminologyPreviewProgress progress);
}
