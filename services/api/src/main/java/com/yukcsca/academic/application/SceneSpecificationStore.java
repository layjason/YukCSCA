package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.SceneSpecification;
import java.util.Optional;
import java.util.UUID;

public interface SceneSpecificationStore {
  Optional<SceneSpecification> findById(UUID id);

  Optional<SceneSpecification> findByIdForUpdate(UUID id);

  SceneSpecification save(SceneSpecification specification);
}
