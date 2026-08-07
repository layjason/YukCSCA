package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.AcademicAuditStore;
import com.yukcsca.academic.domain.AcademicAudit;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AcademicAuditRepository
    extends JpaRepository<AcademicAudit, UUID>, AcademicAuditStore {}
