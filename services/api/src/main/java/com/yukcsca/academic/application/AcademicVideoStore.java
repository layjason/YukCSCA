package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicVideoAsset;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicVideoStore {
  Optional<AcademicVideoAsset> findById(UUID id);

  Optional<AcademicVideoAsset> findByIdForUpdate(UUID id);

  List<AcademicVideoAsset> findByIdIn(Collection<UUID> ids);

  AcademicVideoAsset save(AcademicVideoAsset asset);
}
