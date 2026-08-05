package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.AcademicImageStore;
import com.yukcsca.academic.domain.AcademicImage;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AcademicImageRepository
    extends JpaRepository<AcademicImage, UUID>, AcademicImageStore {}
