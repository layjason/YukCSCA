package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.RenderJobStore;
import com.yukcsca.academic.domain.RenderJob;
import com.yukcsca.academic.domain.RenderJobKind;
import com.yukcsca.academic.domain.RenderJobState;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RenderJobRepository extends JpaRepository<RenderJob, UUID>, RenderJobStore {
  @Query(
      "select j from RenderJob j where j.sceneSpecificationId = :specId order by j.createdAt desc")
  List<RenderJob> latestForSpecification(@Param("specId") UUID specId, Pageable pageable);

  @Query(
      "select j from RenderJob j where j.videoAssetId = :assetId and j.kind = :kind order by j.createdAt desc")
  List<RenderJob> latestForVideoAsset(
      @Param("assetId") UUID assetId, @Param("kind") RenderJobKind kind, Pageable pageable);

  @Override
  List<RenderJob> findBySceneSpecificationIdAndStateIn(
      UUID sceneSpecificationId, List<RenderJobState> states);

  @Override
  default Optional<RenderJob> findLatestBySceneSpecificationId(UUID sceneSpecificationId) {
    List<RenderJob> latest = latestForSpecification(sceneSpecificationId, Pageable.ofSize(1));
    return latest.isEmpty() ? Optional.empty() : Optional.of(latest.get(0));
  }

  @Override
  default Optional<RenderJob> findLatestByVideoAssetId(UUID videoAssetId) {
    List<RenderJob> latest =
        latestForVideoAsset(videoAssetId, RenderJobKind.VALIDATE_UPLOAD, Pageable.ofSize(1));
    return latest.isEmpty() ? Optional.empty() : Optional.of(latest.get(0));
  }
}
