package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicAudit;
import com.yukcsca.academic.domain.AcademicPackageStatus;
import com.yukcsca.academic.domain.AcademicVideoAsset;
import com.yukcsca.academic.domain.VideoAssetStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Publish-time video projection and retirement. Only REVIEWED attachments enter a published
 * revision (each keeps its scene-specification handle so the script stays reopenable); everything
 * else is excluded without blocking publication of the complete text unit. Assets referenced by the
 * superseded revision but not by the new one transition REVIEWED -> RETIRED (system-managed
 * replacement semantics, AC-09).
 */
@Component
public class PublishedVideoProjector {
  private static final Logger LOGGER = LoggerFactory.getLogger(PublishedVideoProjector.class);

  private final AcademicVideoStore videos;
  private final AcademicAuditStore audits;
  private final MediaObjectCleanupStore cleanup;
  private final AcademicPackageStore packages;
  private final AcademicRevisionStore revisions;
  private final tools.jackson.databind.json.JsonMapper json;

  public PublishedVideoProjector(
      AcademicVideoStore videos,
      AcademicAuditStore audits,
      MediaObjectCleanupStore cleanup,
      AcademicPackageStore packages,
      AcademicRevisionStore revisions,
      tools.jackson.databind.json.JsonMapper json) {
    this.videos = videos;
    this.audits = audits;
    this.cleanup = cleanup;
    this.packages = packages;
    this.revisions = revisions;
    this.json = json;
  }

  /**
   * Rewrites the reviewed draft so each LESSON/REMEDIATION resource keeps only attachments whose
   * videoAssetId resolves to a REVIEWED asset with a matching explanation language. TERMINOLOGY
   * resources never keep attachments.
   */
  public void projectInto(ObjectNode reviewedDraft) {
    JsonNode resources = reviewedDraft.path("resources");
    if (!resources.isArray()) return;
    for (JsonNode resource : resources) {
      if (!(resource instanceof ObjectNode resourceObject)) continue;
      JsonNode attachments = resourceObject.path("videos");
      if (!attachments.isArray()) continue;
      String kind = resourceObject.path("kind").asText(null);
      ArrayNode projected = resourceObject.arrayNode();
      if (!"TERMINOLOGY".equals(kind)) {
        for (JsonNode attachment : attachments) {
          String language = attachment.path("language").asText(null);
          UUID assetId = parseUuid(attachment.path("videoAssetId").asText(null));
          if (assetId == null) continue; // Incomplete produced-path handle: excluded, not blocking.
          AcademicVideoAsset asset = videos.findById(assetId).orElse(null);
          if (asset == null
              || asset.getStatus() != VideoAssetStatus.REVIEWED
              || !asset.getExplanationLanguage().equals(language)) {
            continue;
          }
          projected.add(((ObjectNode) attachment).deepCopy());
        }
      }
      if (projected.isEmpty()) {
        resourceObject.remove("videos");
      } else {
        resourceObject.set("videos", projected);
      }
    }
  }

  /** Video asset ids referenced by a revision content's attachments. */
  public Set<UUID> referencedAssetIds(JsonNode content) {
    Set<UUID> ids = new HashSet<>();
    JsonNode resources = content.path("resources");
    if (!resources.isArray()) return ids;
    for (JsonNode resource : resources) {
      JsonNode attachments = resource.path("videos");
      if (!attachments.isArray()) continue;
      for (JsonNode attachment : attachments) {
        UUID assetId = parseUuid(attachment.path("videoAssetId").asText(null));
        if (assetId != null) ids.add(assetId);
      }
    }
    return ids;
  }

  /** Retires REVIEWED assets that the superseded revision referenced but the new one does not. */
  public void retireReplaced(
      UUID actorId, Set<UUID> supersededIds, Set<UUID> publishedIds, Instant now) {
    Set<UUID> replaced = new HashSet<>(supersededIds);
    replaced.removeAll(publishedIds);
    if (replaced.isEmpty()) return;
    for (UUID assetId : replaced) {
      // Assets are reusable references. Removing one package/resource must not retire an asset
      // that another active published revision still serves.
      if (referencedByAnyActiveRevision(assetId)) continue;
      AcademicVideoAsset asset = videos.findById(assetId).orElse(null);
      if (asset == null || asset.getStatus() != VideoAssetStatus.REVIEWED) continue;
      asset.retire(now);
      videos.save(asset);
      cleanup.schedule(asset.getStorageKey(), now, MediaObjectCleanupStore.Reason.RETIRED_ASSET);
      if (asset.getCaptionsKey() != null) {
        cleanup.schedule(asset.getCaptionsKey(), now, MediaObjectCleanupStore.Reason.RETIRED_ASSET);
      }
      audits.save(
          new AcademicAudit(
              actorId, "VIDEO_RETIRED", "ACADEMIC_VIDEO", assetId, "SUCCEEDED", null, now));
      LOGGER.info(
          "video.retired assetId={} language={} source={}",
          assetId,
          asset.getExplanationLanguage(),
          asset.getSource());
    }
  }

  private boolean referencedByAnyActiveRevision(UUID assetId) {
    return packages
        .findByStatusAndActiveRevisionIdIsNotNullOrderByCreatedAtAsc(
            AcademicPackageStatus.PUBLISHED)
        .stream()
        .anyMatch(
            academicPackage ->
                revisions
                    .findById(academicPackage.getActiveRevisionId())
                    .map(
                        revision -> {
                          try {
                            return referencedAssetIds(json.readTree(revision.getContent()))
                                .contains(assetId);
                          } catch (RuntimeException exception) {
                            throw new IllegalStateException(
                                "Published academic revision is unreadable.", exception);
                          }
                        })
                    .orElse(false));
  }

  /** Value-free publication observability: asset id, language, and source kind only. */
  public void logPublished(Collection<UUID> publishedIds) {
    if (publishedIds.isEmpty()) return;
    for (AcademicVideoAsset asset : videos.findByIdIn(publishedIds)) {
      LOGGER.info(
          "video.published assetId={} language={} source={}",
          asset.getId(),
          asset.getExplanationLanguage(),
          asset.getSource());
    }
  }

  private static UUID parseUuid(String value) {
    if (value == null || value.isBlank()) return null;
    try {
      return UUID.fromString(value);
    } catch (RuntimeException exception) {
      return null;
    }
  }
}
