package com.yukcsca.academic.application;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import tools.jackson.databind.JsonNode;

/**
 * Application-facing port for assessment to read published package assessment content without
 * importing academic JPA entities or repositories.
 */
public interface PublishedAssessmentCatalog {

  Optional<PublishedPackageAssessmentView> findActiveBySubject(String subject);

  Optional<PublishedPackageAssessmentView> findByPackageRevision(
      UUID packageId, UUID packageRevisionId);

  record PublishedPackageAssessmentView(
      UUID packageId,
      UUID packageRevisionId,
      String subject,
      List<AssessmentSetView> assessmentSets,
      Map<UUID, QuestionView> questionsById,
      Map<UUID, StudyResourceView> resourcesById) {}

  record AssessmentSetView(
      UUID setId,
      String purpose,
      LocalizedTextView title,
      String examLanguage,
      String difficulty,
      List<UUID> questionIds,
      List<UUID> outlineItemIds,
      List<UUID> objectiveIds,
      UUID lessonResourceId,
      Integer estimatedMinutes,
      String feedbackMode,
      String passPolicy,
      List<UUID> remediationResourceIds) {}

  record QuestionView(
      UUID questionId,
      String examLanguage,
      String difficulty,
      List<JsonNode> stem,
      List<OptionView> options,
      String correctOptionKey,
      List<LocalizedContentView> explanations,
      List<HintTierView> hintTiers,
      List<LocalizedTextView> commonMistakeNotes,
      List<UUID> relatedResourceIds,
      List<AuthoredTermAttachmentView> authoredTermAttachments,
      List<UUID> outlineItemIds,
      List<UUID> objectiveIds) {}

  record AuthoredTermAttachmentView(UUID termId, String surfaceForm) {}

  record OptionView(String key, List<JsonNode> blocks) {}

  record HintTierView(String strength, List<JsonNode> blocks) {}

  record LocalizedContentView(String language, List<JsonNode> blocks) {}

  record LocalizedTextView(String indonesian, String english, String simplifiedChinese) {}

  record StudyResourceView(
      UUID resourceId,
      String kind,
      LocalizedTextView title,
      List<UUID> outlineItemIds,
      List<UUID> objectiveIds,
      Map<String, List<JsonNode>> blocksByLanguage,
      List<String> availableExplanationLanguages) {}
}
