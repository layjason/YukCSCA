package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.StudentTerminologyNotebookStore;
import com.yukcsca.academic.domain.StudentTerminologyNotebook;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentTerminologyNotebookRepository
    extends JpaRepository<StudentTerminologyNotebook, UUID>, StudentTerminologyNotebookStore {}
