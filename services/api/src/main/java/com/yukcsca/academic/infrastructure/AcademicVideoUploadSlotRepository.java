package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.AcademicVideoUploadSlotStore;
import com.yukcsca.academic.domain.AcademicVideoUploadSlot;
import jakarta.persistence.LockModeType;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AcademicVideoUploadSlotRepository
    extends JpaRepository<AcademicVideoUploadSlot, UUID>, AcademicVideoUploadSlotStore {
  @Override
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select slot from AcademicVideoUploadSlot slot where slot.id = :id")
  java.util.Optional<AcademicVideoUploadSlot> findByIdForUpdate(@Param("id") UUID id);
}
