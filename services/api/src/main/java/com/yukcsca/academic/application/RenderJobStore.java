package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.RenderJob;
import com.yukcsca.academic.domain.RenderJobState;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RenderJobStore {
  Optional<RenderJob> findById(UUID id);

  /** Latest job by creation time for one scene specification, or empty when never enqueued. */
  Optional<RenderJob> findLatestBySceneSpecificationId(UUID sceneSpecificationId);

  /** Latest VALIDATE_UPLOAD job for one confirmed asset, or empty when none exists. */
  Optional<RenderJob> findLatestByVideoAssetId(UUID videoAssetId);

  List<RenderJob> findBySceneSpecificationIdAndStateIn(
      UUID sceneSpecificationId, List<RenderJobState> states);

  RenderJob save(RenderJob job);
}
