package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicTermPronunciation;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicTermPronunciationStore {
  Optional<AcademicTermPronunciation> findByPackageRevisionIdAndTermIdAndSurfaceForm(
      UUID packageRevisionId, UUID termId, String surfaceForm);

  List<AcademicTermPronunciation> findByPackageRevisionId(UUID packageRevisionId);

  List<AcademicTermPronunciation> findByPackageRevisionIdAndTermIdIn(
      UUID packageRevisionId, Collection<UUID> termIds);

  AcademicTermPronunciation save(AcademicTermPronunciation pronunciation);
}
