package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicVideoUploadSlot;
import java.util.Optional;
import java.util.UUID;

public interface AcademicVideoUploadSlotStore {
  Optional<AcademicVideoUploadSlot> findById(UUID id);

  Optional<AcademicVideoUploadSlot> findByIdForUpdate(UUID id);

  AcademicVideoUploadSlot save(AcademicVideoUploadSlot slot);
}
