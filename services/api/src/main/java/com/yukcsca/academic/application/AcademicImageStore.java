package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicImage;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicImageStore {
  Optional<AcademicImage> findById(UUID id);

  List<AcademicImage> findByIdIn(Collection<UUID> ids);

  AcademicImage save(AcademicImage image);
}
