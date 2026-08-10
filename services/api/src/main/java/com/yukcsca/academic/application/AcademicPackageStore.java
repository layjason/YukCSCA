package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicPackage;
import com.yukcsca.academic.domain.AcademicPackageStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicPackageStore {
  List<AcademicPackage> findAllByOrderByCreatedAtAsc();

  List<AcademicPackage> findByStatusAndActiveRevisionIdIsNotNullOrderByCreatedAtAsc(
      AcademicPackageStatus status);

  Optional<AcademicPackage> findBySubjectAndStatusAndActiveRevisionIdIsNotNull(
      String subject, AcademicPackageStatus status);

  Optional<AcademicPackage> findById(UUID id);

  Optional<AcademicPackage> findByIdForUpdate(UUID id);

  boolean existsBySubject(String subject);

  AcademicPackage save(AcademicPackage academicPackage);
}
