package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicAudit;

public interface AcademicAuditStore {
  AcademicAudit save(AcademicAudit audit);
}
