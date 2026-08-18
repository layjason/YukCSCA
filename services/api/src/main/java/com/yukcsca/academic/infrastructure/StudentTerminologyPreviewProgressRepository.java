package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.StudentTerminologyPreviewProgressStore;
import com.yukcsca.academic.domain.StudentTerminologyPreviewProgress;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentTerminologyPreviewProgressRepository
    extends JpaRepository<StudentTerminologyPreviewProgress, UUID>,
        StudentTerminologyPreviewProgressStore {}
