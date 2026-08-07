package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.AcademicRevisionStore;
import com.yukcsca.academic.domain.AcademicRevision;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AcademicRevisionRepository
    extends JpaRepository<AcademicRevision, UUID>, AcademicRevisionStore {}
