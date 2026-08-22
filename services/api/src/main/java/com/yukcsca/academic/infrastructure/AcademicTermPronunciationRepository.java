package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.AcademicTermPronunciationStore;
import com.yukcsca.academic.domain.AcademicTermPronunciation;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AcademicTermPronunciationRepository
    extends JpaRepository<AcademicTermPronunciation, UUID>, AcademicTermPronunciationStore {}
