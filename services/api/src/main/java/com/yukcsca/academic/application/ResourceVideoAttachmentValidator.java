package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicVideoAsset;
import com.yukcsca.academic.domain.SceneSpecification;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/**
 * Draft-save validation for optional reviewed-video attachments on study resources. Enforces the
 * reload-safe handle invariant (at least one of videoAssetId/sceneSpecificationId, CR-03), one
 * attachment per explanation language, LESSON/REMEDIATION projection only, and language equality
 * with the referenced asset and scene specification (INCOMPATIBLE on mismatch, CR-07c). Lookup
 * failures never block the rest of the draft's own validation.
 */
@Component
public class ResourceVideoAttachmentValidator {
  static final int MAX_ATTACHMENTS_PER_RESOURCE = 3;
  private static final Set<String> EXPLANATION_LANGUAGES = Set.of("id", "en", "zh-CN");

  private final AcademicVideoStore videos;
  private final SceneSpecificationStore specifications;

  public ResourceVideoAttachmentValidator(
      AcademicVideoStore videos, SceneSpecificationStore specifications) {
    this.videos = videos;
    this.specifications = specifications;
  }

  /**
   * @return all distinct video asset ids referenced by the draft's attachments.
   */
  public Set<UUID> validate(JsonNode draft) {
    List<AcademicViolation> violations = new ArrayList<>();
    Set<UUID> assetIds = new HashSet<>();
    JsonNode resources = draft.path("resources");
    for (int index = 0; resources.isArray() && index < resources.size(); index++) {
      JsonNode resource = resources.get(index);
      String basePath = "draft.resources[" + index + "]";
      JsonNode attachments = resource.path("videos");
      if (attachments.isMissingNode() || attachments.isNull()) continue;
      if (!attachments.isArray()) {
        violations.add(new AcademicViolation(basePath + ".videos", AcademicViolationCode.INVALID));
        continue;
      }
      if (attachments.size() > MAX_ATTACHMENTS_PER_RESOURCE) {
        violations.add(
            new AcademicViolation(basePath + ".videos", AcademicViolationCode.OUT_OF_RANGE));
      }
      if ("TERMINOLOGY".equals(resource.path("kind").asText(null)) && !attachments.isEmpty()) {
        violations.add(
            new AcademicViolation(basePath + ".videos", AcademicViolationCode.UNSUPPORTED));
      }
      Set<String> languages = new HashSet<>();
      for (int j = 0; j < attachments.size(); j++) {
        JsonNode attachment = attachments.get(j);
        String path = basePath + ".videos[" + j + "]";
        if (!attachment.isObject()) {
          violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
          continue;
        }
        String language = attachment.path("language").asText(null);
        if (language == null || !EXPLANATION_LANGUAGES.contains(language)) {
          violations.add(
              new AcademicViolation(path + ".language", AcademicViolationCode.UNSUPPORTED));
        } else if (!languages.add(language)) {
          violations.add(
              new AcademicViolation(path + ".language", AcademicViolationCode.DUPLICATE));
        }
        String videoAssetId = attachment.path("videoAssetId").asText(null);
        String sceneSpecificationId = attachment.path("sceneSpecificationId").asText(null);
        UUID assetId = parseUuid(videoAssetId);
        UUID specId = parseUuid(sceneSpecificationId);
        if (assetId == null && specId == null) {
          violations.add(new AcademicViolation(path, AcademicViolationCode.REQUIRED));
        }
        if (videoAssetId != null && !videoAssetId.isBlank() && assetId == null) {
          violations.add(
              new AcademicViolation(path + ".videoAssetId", AcademicViolationCode.INVALID));
        }
        if (sceneSpecificationId != null && !sceneSpecificationId.isBlank() && specId == null) {
          violations.add(
              new AcademicViolation(path + ".sceneSpecificationId", AcademicViolationCode.INVALID));
        }
        if (assetId != null) {
          AcademicVideoAsset asset = videos.findById(assetId).orElse(null);
          if (asset == null) {
            violations.add(
                new AcademicViolation(path + ".videoAssetId", AcademicViolationCode.INVALID));
          } else {
            assetIds.add(assetId);
            if (language != null && !asset.getExplanationLanguage().equals(language)) {
              violations.add(
                  new AcademicViolation(path + ".language", AcademicViolationCode.INCOMPATIBLE));
            }
          }
        }
        if (specId != null) {
          SceneSpecification specification = specifications.findById(specId).orElse(null);
          if (specification == null) {
            violations.add(
                new AcademicViolation(
                    path + ".sceneSpecificationId", AcademicViolationCode.INVALID));
          } else if (language != null && !specification.getExplanationLanguage().equals(language)) {
            violations.add(
                new AcademicViolation(path + ".language", AcademicViolationCode.INCOMPATIBLE));
          }
        }
      }
    }
    if (!violations.isEmpty()) throw new AcademicValidationException(violations);
    return assetIds;
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
