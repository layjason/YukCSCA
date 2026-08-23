package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.SceneSpecificationStore;
import com.yukcsca.academic.domain.SceneSpecification;
import jakarta.persistence.LockModeType;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SceneSpecificationRepository
    extends JpaRepository<SceneSpecification, UUID>, SceneSpecificationStore {
  @Override
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select specification from SceneSpecification specification where specification.id = :id")
  java.util.Optional<SceneSpecification> findByIdForUpdate(@Param("id") UUID id);
}
