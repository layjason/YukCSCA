package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.StudentTerminologyReviewStore;
import com.yukcsca.academic.domain.StudentTerminologyReview;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentTerminologyReviewRepository
    extends JpaRepository<StudentTerminologyReview, UUID>, StudentTerminologyReviewStore {}
