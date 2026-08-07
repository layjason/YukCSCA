package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicRevision;
import java.util.Optional;
import java.util.UUID;

public interface AcademicRevisionStore {
  Optional<AcademicRevision> findById(UUID id);

  AcademicRevision save(AcademicRevision revision);
}
