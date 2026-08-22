package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicPackage;
import com.yukcsca.academic.domain.AcademicPackageStatus;
import com.yukcsca.academic.domain.AcademicRevision;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

@Service
public class PublishedAssessmentCatalogService implements PublishedAssessmentCatalog {
  private final AcademicPackageStore packages;
  private final AcademicRevisionStore revisions;
  private final PublishedPackageProjector projector;

  public PublishedAssessmentCatalogService(
      AcademicPackageStore packages,
      AcademicRevisionStore revisions,
      PublishedPackageProjector projector) {
    this.packages = packages;
    this.revisions = revisions;
    this.projector = projector;
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<PublishedPackageAssessmentView> findActiveBySubject(String subject) {
    if (subject == null || subject.isBlank()) {
      return Optional.empty();
    }
    return packages
        .findBySubjectAndStatusAndActiveRevisionIdIsNotNull(
            subject, AcademicPackageStatus.PUBLISHED)
        .flatMap(
            academicPackage -> {
              UUID revisionId = academicPackage.getActiveRevisionId();
              if (revisionId == null) return Optional.empty();
              return revisions
                  .findById(revisionId)
                  .map(revision -> project(academicPackage, revision));
            });
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<PublishedPackageAssessmentView> findByPackageRevision(
      UUID packageId, UUID packageRevisionId) {
    if (packageId == null || packageRevisionId == null) {
      return Optional.empty();
    }
    return packages
        .findById(packageId)
        .flatMap(
            academicPackage ->
                revisions
                    .findById(packageRevisionId)
                    .filter(revision -> packageId.equals(revision.getPackageId()))
                    .map(revision -> project(academicPackage, revision)));
  }

  private PublishedPackageAssessmentView project(
      AcademicPackage academicPackage, AcademicRevision revision) {
    JsonNode content = projector.parseContent(revision.getContent());
    Map<UUID, QuestionView> questions = parseQuestions(content);
    Map<UUID, StudyResourceView> resources = parseResources(content);
    List<AssessmentSetView> sets = parseAssessmentSets(content);
    return new PublishedPackageAssessmentView(
        academicPackage.getId(),
        revision.getId(),
        academicPackage.getSubject(),
        sets,
        questions,
        resources);
  }

  private List<AssessmentSetView> parseAssessmentSets(JsonNode content) {
    List<AssessmentSetView> sets = new ArrayList<>();
    JsonNode nodes = content.path("assessmentSets");
    if (!nodes.isArray()) return List.of();
    for (JsonNode set : nodes) {
      UUID setId = uuid(set.path("id"));
      if (setId == null) continue;
      String feedbackMode = text(set, "feedbackMode");
      if (feedbackMode == null || feedbackMode.isBlank()) {
        feedbackMode = "IMMEDIATE";
      }
      Integer estimated =
          set.path("estimatedMinutes").canConvertToInt()
              ? set.path("estimatedMinutes").asInt()
              : null;
      sets.add(
          new AssessmentSetView(
              setId,
              text(set, "purpose"),
              localized(set.path("title")),
              text(set, "examLanguage"),
              text(set, "difficulty"),
              uuidList(set.path("questionIds")),
              uuidList(set.path("outlineItemIds")),
              uuidList(set.path("objectiveIds")),
              uuid(set.path("lessonResourceId")),
              estimated,
              feedbackMode,
              text(set, "passPolicy"),
              uuidList(set.path("remediationResourceIds"))));
    }
    return List.copyOf(sets);
  }

  private Map<UUID, QuestionView> parseQuestions(JsonNode content) {
    Map<UUID, QuestionView> questions = new HashMap<>();
    JsonNode nodes = content.path("questions");
    if (!nodes.isArray()) return Map.of();
    for (JsonNode question : nodes) {
      UUID id = uuid(question.path("id"));
      if (id == null) continue;
      List<OptionView> options = new ArrayList<>();
      JsonNode optionNodes = question.path("options");
      if (optionNodes.isArray()) {
        for (JsonNode option : optionNodes) {
          options.add(new OptionView(text(option, "key"), projectBlocks(option.path("blocks"))));
        }
      }
      List<HintTierView> hints = new ArrayList<>();
      JsonNode hintNodes = question.path("hintTiers");
      if (hintNodes.isArray()) {
        for (JsonNode hint : hintNodes) {
          hints.add(new HintTierView(text(hint, "strength"), projectBlocks(hint.path("blocks"))));
        }
      }
      List<LocalizedContentView> explanations = new ArrayList<>();
      JsonNode explanationNodes = question.path("explanations");
      if (explanationNodes.isArray()) {
        for (JsonNode explanation : explanationNodes) {
          explanations.add(
              new LocalizedContentView(
                  text(explanation, "language"), projectBlocks(explanation.path("blocks"))));
        }
      }
      List<LocalizedTextView> notes = new ArrayList<>();
      JsonNode noteNodes = question.path("commonMistakeNotes");
      if (noteNodes.isArray()) {
        for (JsonNode note : noteNodes) {
          notes.add(localized(note));
        }
      }
      questions.put(
          id,
          new QuestionView(
              id,
              text(question, "examLanguage"),
              text(question, "difficulty"),
              projectBlocks(question.path("stem")),
              List.copyOf(options),
              text(question, "correctOptionKey"),
              List.copyOf(explanations),
              List.copyOf(hints),
              List.copyOf(notes),
              uuidList(question.path("relatedResourceIds")),
              authoredAttachments(question.path("authoredTermAttachments")),
              uuidList(question.path("outlineItemIds")),
              uuidList(question.path("objectiveIds"))));
    }
    return Map.copyOf(questions);
  }

  private Map<UUID, StudyResourceView> parseResources(JsonNode content) {
    Map<UUID, StudyResourceView> resources = new HashMap<>();
    JsonNode nodes = content.path("resources");
    if (!nodes.isArray()) return Map.of();
    for (JsonNode resource : nodes) {
      UUID id = uuid(resource.path("id"));
      String kind = text(resource, "kind");
      if (id == null || kind == null) continue;
      List<String> languages = new ArrayList<>();
      Map<String, List<JsonNode>> blocksByLanguage = new LinkedHashMap<>();
      JsonNode versions = resource.path("versions");
      if (versions.isArray()) {
        for (JsonNode version : versions) {
          String language = text(version, "language");
          if (language == null) continue;
          languages.add(language);
          blocksByLanguage.put(language, projectBlocks(version.path("blocks")));
        }
      }
      resources.put(
          id,
          new StudyResourceView(
              id,
              kind,
              localized(resource.path("title")),
              uuidList(resource.path("outlineItemIds")),
              uuidList(resource.path("objectiveIds")),
              Map.copyOf(blocksByLanguage),
              List.copyOf(languages)));
    }
    return Map.copyOf(resources);
  }

  private List<JsonNode> projectBlocks(JsonNode blocks) {
    List<JsonNode> projected = new ArrayList<>();
    if (!blocks.isArray()) return List.of();
    for (JsonNode block : blocks) {
      JsonNode copy = projector.projectBlockPublic(block);
      if (copy != null) projected.add(copy);
    }
    return List.copyOf(projected);
  }

  private static List<AuthoredTermAttachmentView> authoredAttachments(JsonNode values) {
    if (values == null || !values.isArray()) return List.of();
    List<AuthoredTermAttachmentView> attachments = new ArrayList<>();
    for (JsonNode value : values) {
      UUID termId = uuid(value.path("termId"));
      if (termId == null) continue;
      String surface = text(value, "surfaceForm");
      attachments.add(new AuthoredTermAttachmentView(termId, surface));
    }
    return List.copyOf(attachments);
  }

  private static LocalizedTextView localized(JsonNode node) {
    return new LocalizedTextView(
        text(node, "indonesian"), text(node, "english"), text(node, "simplifiedChinese"));
  }

  private static List<UUID> uuidList(JsonNode values) {
    List<UUID> ids = new ArrayList<>();
    if (!values.isArray()) return List.of();
    for (JsonNode value : values) {
      UUID id = uuid(value);
      if (id != null) ids.add(id);
    }
    return List.copyOf(ids);
  }

  private static UUID uuid(JsonNode node) {
    if (node == null || node.isNull() || node.isMissingNode()) return null;
    try {
      return UUID.fromString(node.asText());
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  private static String text(JsonNode parent, String field) {
    if (parent == null || !parent.isObject()) return null;
    JsonNode value = parent.get(field);
    return value == null || value.isNull() || !value.isTextual() ? null : value.asText();
  }
}
