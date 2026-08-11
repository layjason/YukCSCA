package com.yukcsca.assessment.domain;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Deterministic remediation candidate ordering: explicit set remediation ids, then shared
 * objective, then shared outline, then LESSON fallback.
 */
public final class RemediationResolutionPolicy {
  private RemediationResolutionPolicy() {}

  public record Candidate(UUID resourceId, String kind, boolean preferred) {}

  public record ResourceRef(
      UUID resourceId, String kind, Set<UUID> objectiveIds, Set<UUID> outlineItemIds) {}

  public static List<Candidate> resolve(
      List<UUID> explicitRemediationIds,
      Set<UUID> questionObjectiveIds,
      Set<UUID> questionOutlineIds,
      List<ResourceRef> packageResources) {
    Map<UUID, Candidate> ordered = new LinkedHashMap<>();
    if (explicitRemediationIds != null) {
      for (UUID id : explicitRemediationIds) {
        packageResources.stream()
            .filter(r -> r.resourceId().equals(id) && "REMEDIATION".equals(r.kind()))
            .findFirst()
            .ifPresent(
                r ->
                    ordered.putIfAbsent(
                        r.resourceId(), new Candidate(r.resourceId(), r.kind(), true)));
      }
    }
    for (ResourceRef resource : packageResources) {
      if (!"REMEDIATION".equals(resource.kind())) continue;
      if (intersects(resource.objectiveIds(), questionObjectiveIds)) {
        ordered.putIfAbsent(
            resource.resourceId(), new Candidate(resource.resourceId(), resource.kind(), false));
      }
    }
    for (ResourceRef resource : packageResources) {
      if (!"REMEDIATION".equals(resource.kind())) continue;
      if (intersects(resource.outlineItemIds(), questionOutlineIds)) {
        ordered.putIfAbsent(
            resource.resourceId(), new Candidate(resource.resourceId(), resource.kind(), false));
      }
    }
    if (ordered.isEmpty()) {
      for (ResourceRef resource : packageResources) {
        if ("LESSON".equals(resource.kind())
            && (intersects(resource.objectiveIds(), questionObjectiveIds)
                || intersects(resource.outlineItemIds(), questionOutlineIds))) {
          ordered.putIfAbsent(
              resource.resourceId(), new Candidate(resource.resourceId(), resource.kind(), false));
        }
      }
    }
    return List.copyOf(new ArrayList<>(ordered.values()));
  }

  private static boolean intersects(Set<UUID> left, Set<UUID> right) {
    if (left == null || right == null || left.isEmpty() || right.isEmpty()) return false;
    for (UUID id : left) {
      if (right.contains(id)) return true;
    }
    return false;
  }

  public static UUID preferAlternateQuestion(
      UUID originalQuestionId,
      String examLanguage,
      Set<UUID> objectiveIds,
      List<QuestionCandidate> candidates) {
    Objects.requireNonNull(originalQuestionId, "originalQuestionId");
    for (QuestionCandidate candidate : candidates) {
      if (candidate.questionId().equals(originalQuestionId)) continue;
      if (!examLanguage.equals(candidate.examLanguage())) continue;
      if (!intersects(candidate.objectiveIds(), objectiveIds)) continue;
      return candidate.questionId();
    }
    return originalQuestionId;
  }

  public record QuestionCandidate(UUID questionId, String examLanguage, Set<UUID> objectiveIds) {}
}
