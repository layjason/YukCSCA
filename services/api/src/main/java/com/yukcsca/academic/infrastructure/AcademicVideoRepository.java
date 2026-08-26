package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.AcademicVideoStore;
import com.yukcsca.academic.domain.AcademicVideoAsset;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AcademicVideoRepository
    extends JpaRepository<AcademicVideoAsset, UUID>, AcademicVideoStore {
  @Override
  List<AcademicVideoAsset> findByIdIn(Collection<UUID> ids);

  @Override
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select asset from AcademicVideoAsset asset where asset.id = :id")
  java.util.Optional<AcademicVideoAsset> findByIdForUpdate(@Param("id") UUID id);
}
