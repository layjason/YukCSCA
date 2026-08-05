package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.AcademicPackageStore;
import com.yukcsca.academic.domain.AcademicPackage;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AcademicPackageRepository
    extends JpaRepository<AcademicPackage, UUID>, AcademicPackageStore {
  @Override
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select academicPackage from AcademicPackage academicPackage where academicPackage.id = :id")
  Optional<AcademicPackage> findByIdForUpdate(@Param("id") UUID id);
}
