package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicSubjectProfile;
import com.yukcsca.academic.domain.AcademicSubjectProfile.ExamStructureDefaults;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

@Service
public class AcademicDraftProcessor {
  private static final int MAX_DRAFT_BYTES = 5 * 1024 * 1024;
  private static final Set<String> EXAM_LANGUAGES = Set.of("en", "zh-CN");
  private static final Set<String> EXPLANATION_LANGUAGES = Set.of("id", "en", "zh-CN");
  private static final Set<String> RESOURCE_KINDS = Set.of("LESSON", "TERMINOLOGY", "REMEDIATION");
  private static final Set<String> DIFFICULTIES = Set.of("FOUNDATION", "STANDARD", "ADVANCED");
  private static final Set<String> ORIGINS = Set.of("YUKCSCA_ORIGINAL", "LICENSED", "OPEN_LICENSE");
  private static final Set<String> QUESTION_TYPES = Set.of("SINGLE_ANSWER");
  private static final Set<String> HINT_STRENGTHS = Set.of("STANDARD", "STRONG");
  private static final Set<String> ASSESSMENT_SET_PURPOSES = Set.of("CHECKPOINT", "TOPIC_PRACTICE");
  private static final Set<String> FEEDBACK_MODES = Set.of("IMMEDIATE", "SET_END");
  private static final Set<String> PASS_POLICIES = Set.of("ALL_CORRECT_NO_STRONG_ASSISTANCE");
  private static final Set<String> TERM_CLASSES =
      Set.of("EXAM_INSTRUCTION", "LOGICAL_EXPRESSION", "TOPIC_TERM");

  private final JsonMapper json;

  public AcademicDraftProcessor(JsonMapper json) {
    this.json = json;
  }

  /**
   * Empty draft for a supported subject, seeded with that subject's default exam structure. Seed
   * content (outline, questions, mock bank) remains an authoring concern.
   */
  public String emptyDraft(String subject) {
    ExamStructureDefaults defaults = AcademicSubjectProfile.require(subject);
    ObjectNode draft = json.createObjectNode();
    ObjectNode syllabus = draft.putObject("officialSyllabus");
    syllabus.put("subject", subject);
    ObjectNode structure = syllabus.putObject("examStructure");
    structure.put("durationMinutes", defaults.durationMinutes());
    structure.put("totalPoints", defaults.totalPoints());
    structure.put("questionCount", defaults.questionCount());
    structure.put("questionType", defaults.questionType());
    ArrayNode languages = structure.putArray("examLanguages");
    defaults.examLanguages().forEach(languages::add);
    draft.putArray("outlineItems");
    draft.putArray("learningObjectives");
    draft.putArray("resources");
    draft.putArray("questions");
    draft.putArray("assessmentSets");
    draft.putArray("terms");
    draft.putArray("mocks");
    return serialize(draft);
  }

  public ObjectNode parseObject(String value) {
    try {
      JsonNode parsed = json.readTree(value);
      if (parsed instanceof ObjectNode object) return object;
      throw new IllegalStateException("Stored academic draft is not an object.");
    } catch (JacksonException exception) {
      throw new IllegalStateException("Stored academic draft is unreadable.", exception);
    }
  }

  public String serialize(JsonNode value) {
    try {
      return json.writeValueAsString(value);
    } catch (JacksonException exception) {
      throw new IllegalStateException("Academic draft could not be serialized.", exception);
    }
  }

  public ObjectNode normalizeForSave(
      JsonNode submitted,
      String previousDraftJson,
      UUID authenticatedAdmin,
      String packageSubject) {
    List<AcademicViolation> violations = new ArrayList<>();
    if (!(submitted instanceof ObjectNode submittedObject)) {
      throw new AcademicValidationException(
          List.of(new AcademicViolation("draft", AcademicViolationCode.REQUIRED)));
    }
    if (serialize(submittedObject).getBytes(java.nio.charset.StandardCharsets.UTF_8).length
        > MAX_DRAFT_BYTES) {
      violations.add(new AcademicViolation("draft", AcademicViolationCode.OUT_OF_RANGE));
    }
    requireObject(submittedObject, "officialSyllabus", "draft.officialSyllabus", violations);
    for (String field :
        List.of("outlineItems", "learningObjectives", "resources", "questions", "mocks")) {
      requireArray(submittedObject, field, "draft." + field, violations);
    }
    // assessmentSets and terms are additive: omit means empty; if present must be an array.
    if (submittedObject.has("assessmentSets")
        && !submittedObject.path("assessmentSets").isArray()) {
      violations.add(new AcademicViolation("draft.assessmentSets", AcademicViolationCode.INVALID));
    }
    if (submittedObject.has("terms") && !submittedObject.path("terms").isArray()) {
      violations.add(new AcademicViolation("draft.terms", AcademicViolationCode.INVALID));
    }
    JsonNode mocks = submittedObject.get("mocks");
    if (mocks != null && mocks.isArray() && mocks.size() > 1) {
      violations.add(new AcademicViolation("draft.mocks", AcademicViolationCode.OUT_OF_RANGE));
    }
    validateStableIds(submittedObject, violations);
    if (!violations.isEmpty()) throw new AcademicValidationException(violations);

    ObjectNode normalized = submittedObject.deepCopy();
    if (!normalized.has("assessmentSets") || !normalized.path("assessmentSets").isArray()) {
      normalized.putArray("assessmentSets");
    }
    if (!normalized.has("terms") || !normalized.path("terms").isArray()) {
      normalized.putArray("terms");
    }
    dropStaleTermReferences(normalized);
    // Package identity owns subject; drafts cannot reassign a package to another subject.
    ObjectNode syllabus =
        normalized.get("officialSyllabus") instanceof ObjectNode existing
            ? existing
            : normalized.putObject("officialSyllabus");
    syllabus.put("subject", packageSubject);
    Map<String, UUID> priorAuthors = priorAuthors(parseObject(previousDraftJson));
    enrichProvenance(normalized, priorAuthors, authenticatedAdmin, false, null);
    return normalized;
  }

  public ObjectNode reviewForPublication(ObjectNode savedDraft, UUID adminId, Instant now) {
    ObjectNode reviewed = savedDraft.deepCopy();
    enrichProvenance(reviewed, priorAuthors(savedDraft), adminId, true, now);
    return reviewed;
  }

  public Set<UUID> referencedImageIds(ObjectNode draft) {
    Set<UUID> ids = new LinkedHashSet<>();
    walk(
        draft,
        node -> {
          if (node.isObject()
              && "IMAGE".equals(text(node, "kind"))
              && parseUuid(text(node, "imageId")) != null) {
            ids.add(parseUuid(text(node, "imageId")));
          }
        });
    return ids;
  }

  public void validateForPublication(ObjectNode draft, Set<UUID> availableImageIds) {
    dropStaleTermReferences(draft);
    List<AcademicViolation> violations = new ArrayList<>();
    ExamStructureSnapshot structure =
        validateOfficialSyllabus(draft.path("officialSyllabus"), violations);
    Set<UUID> outlineIds = validateOutline(draft.path("outlineItems"), violations);
    Set<UUID> objectiveIds =
        validateObjectives(draft.path("learningObjectives"), outlineIds, violations);
    Set<UUID> termIds = uniqueIds(draft.path("terms"), "draft.terms", violations);
    Map<UUID, Set<String>> termSurfaces = termSurfaceIndex(draft.path("terms"));
    validateResources(
        draft.path("resources"), outlineIds, objectiveIds, availableImageIds, termIds, violations);
    validateTerms(draft.path("terms"), outlineIds, violations);
    Map<UUID, QuestionSnapshot> questions =
        validateQuestions(
            draft.path("questions"),
            outlineIds,
            objectiveIds,
            availableImageIds,
            structure,
            termIds,
            termSurfaces,
            violations);
    Set<UUID> resourceIds = uniqueIds(draft.path("resources"), "draft.resources", violations);
    Map<UUID, String> resourceKinds = resourceKinds(draft.path("resources"));
    validateQuestionRelatedResources(draft.path("questions"), resourceIds, violations);
    validateAssessmentSets(
        draft.path("assessmentSets"), questions, resourceIds, resourceKinds, violations);
    Map<UUID, String> questionLanguages = new HashMap<>();
    for (Map.Entry<UUID, QuestionSnapshot> entry : questions.entrySet()) {
      questionLanguages.put(entry.getKey(), entry.getValue().examLanguage());
    }
    validateMock(draft.path("mocks"), questionLanguages, structure, violations);
    if (!violations.isEmpty()) throw new AcademicValidationException(violations);
  }

  private void validateStableIds(ObjectNode draft, List<AcademicViolation> violations) {
    validateItemShape(draft.path("outlineItems"), "draft.outlineItems", violations);
    validateItemShape(draft.path("learningObjectives"), "draft.learningObjectives", violations);
    validateItemShape(draft.path("resources"), "draft.resources", violations);
    validateItemShape(draft.path("questions"), "draft.questions", violations);
    validateItemShape(draft.path("assessmentSets"), "draft.assessmentSets", violations);
    validateItemShape(draft.path("terms"), "draft.terms", violations);
    validateItemShape(draft.path("mocks"), "draft.mocks", violations);
  }

  private void validateItemShape(
      JsonNode items, String basePath, List<AcademicViolation> violations) {
    if (!items.isArray()) return;
    for (int index = 0; index < items.size(); index++) {
      JsonNode item = items.get(index);
      String path = basePath + "[" + index + "]";
      if (!item.isObject()) {
        violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
      } else if (parseUuid(text(item, "id")) == null) {
        violations.add(new AcademicViolation(path + ".id", AcademicViolationCode.INVALID));
      }
    }
  }

  private ExamStructureSnapshot validateOfficialSyllabus(
      JsonNode syllabus, List<AcademicViolation> violations) {
    String base = "draft.officialSyllabus";
    String subject = text(syllabus, "subject");
    if (!AcademicSubjectProfile.isSupported(subject)) {
      violations.add(new AcademicViolation(base + ".subject", AcademicViolationCode.INCOMPATIBLE));
    }
    requireText(syllabus, "authority", base + ".authority", 160, violations);
    requireText(syllabus, "editionLabel", base + ".editionLabel", 80, violations);
    validateSourceLinks(syllabus.path("sourceLinks"), base + ".sourceLinks", violations);
    requireInstant(syllabus, "retrievedAt", base + ".retrievedAt", violations);
    requireInstant(syllabus, "lastCheckedAt", base + ".lastCheckedAt", violations);
    validateOfficialDate(syllabus.path("publishedOn"), base + ".publishedOn", violations);
    validateOfficialDate(syllabus.path("effectiveOn"), base + ".effectiveOn", violations);
    validateOfficialDate(syllabus.path("updatedOn"), base + ".updatedOn", violations);
    requireExact(syllabus, "permittedUse", "REFERENCE_ONLY", base + ".permittedUse", violations);
    return validateExamStructure(
        syllabus.path("examStructure"), base + ".examStructure", violations);
  }

  private ExamStructureSnapshot validateExamStructure(
      JsonNode structure, String base, List<AcademicViolation> violations) {
    Integer duration =
        requireIntInRange(
            structure,
            "durationMinutes",
            AcademicSubjectProfile.MIN_DURATION_MINUTES,
            AcademicSubjectProfile.MAX_DURATION_MINUTES,
            base + ".durationMinutes",
            violations);
    Integer totalPoints =
        requireIntInRange(
            structure,
            "totalPoints",
            AcademicSubjectProfile.MIN_TOTAL_POINTS,
            AcademicSubjectProfile.MAX_TOTAL_POINTS,
            base + ".totalPoints",
            violations);
    Integer questionCount =
        requireIntInRange(
            structure,
            "questionCount",
            AcademicSubjectProfile.MIN_QUESTION_COUNT,
            AcademicSubjectProfile.MAX_QUESTION_COUNT,
            base + ".questionCount",
            violations);
    String questionType = text(structure, "questionType");
    // Set.of(...).contains(null) throws; treat missing type as unsupported.
    if (questionType == null || !QUESTION_TYPES.contains(questionType)) {
      violations.add(
          new AcademicViolation(base + ".questionType", AcademicViolationCode.UNSUPPORTED));
    }
    validateLanguageArray(
        structure.path("examLanguages"), EXAM_LANGUAGES, base + ".examLanguages", violations);
    if (duration == null || totalPoints == null || questionCount == null || questionType == null) {
      return null;
    }
    return new ExamStructureSnapshot(duration, totalPoints, questionCount, questionType);
  }

  private Set<UUID> validateOutline(JsonNode items, List<AcademicViolation> violations) {
    Set<UUID> ids = uniqueIds(items, "draft.outlineItems", violations);
    if (ids.isEmpty()) {
      violations.add(new AcademicViolation("draft.outlineItems", AcademicViolationCode.REQUIRED));
      return ids;
    }
    for (int index = 0; index < items.size(); index++) {
      JsonNode item = items.get(index);
      String path = "draft.outlineItems[" + index + "]";
      JsonNode parent = item.get("parentId");
      if (parent != null && !parent.isNull()) {
        UUID parentId = parseUuid(parent.asText());
        if (parentId == null
            || !ids.contains(parentId)
            || parentId.equals(parseUuid(text(item, "id")))) {
          violations.add(
              new AcademicViolation(path + ".parentId", AcademicViolationCode.INCOMPATIBLE));
        }
      }
      if (!item.path("order").canConvertToInt() || item.path("order").asInt() < 0) {
        violations.add(new AcademicViolation(path + ".order", AcademicViolationCode.OUT_OF_RANGE));
      }
      JsonNode position = item.path("sourcePosition");
      boolean validPage =
          position.path("page").canConvertToInt() && position.path("page").asInt() > 0;
      String section = text(position, "section");
      boolean validSection = !blank(section);
      if (!validPage && !validSection) {
        violations.add(
            new AcademicViolation(path + ".sourcePosition", AcademicViolationCode.REQUIRED));
      }
      optionalTextMax(section, 160, path + ".sourcePosition.section", violations);
      validateLocalizedText(item.path("summary"), path + ".summary", violations);
    }
    return ids;
  }

  private Set<UUID> validateObjectives(
      JsonNode objectives, Set<UUID> outlineIds, List<AcademicViolation> violations) {
    Set<UUID> ids = uniqueIds(objectives, "draft.learningObjectives", violations);
    if (ids.isEmpty()) {
      violations.add(
          new AcademicViolation("draft.learningObjectives", AcademicViolationCode.REQUIRED));
      return ids;
    }
    for (int index = 0; index < objectives.size(); index++) {
      JsonNode objective = objectives.get(index);
      String path = "draft.learningObjectives[" + index + "]";
      validateLocalizedText(objective.path("title"), path + ".title", violations);
      JsonNode mappings = objective.path("mappings");
      if (!mappings.isArray() || mappings.isEmpty()) {
        violations.add(new AcademicViolation(path + ".mappings", AcademicViolationCode.REQUIRED));
        continue;
      }
      for (int mappingIndex = 0; mappingIndex < mappings.size(); mappingIndex++) {
        JsonNode mapping = mappings.get(mappingIndex);
        String mappingPath = path + ".mappings[" + mappingIndex + "]";
        UUID outlineId = parseUuid(text(mapping, "outlineItemId"));
        if (outlineId == null || !outlineIds.contains(outlineId)) {
          violations.add(
              new AcademicViolation(
                  mappingPath + ".outlineItemId", AcademicViolationCode.INCOMPATIBLE));
        }
        requireText(mapping, "rationale", mappingPath + ".rationale", 500, violations);
      }
    }
    return ids;
  }

  private void validateResources(
      JsonNode resources,
      Set<UUID> outlineIds,
      Set<UUID> objectiveIds,
      Set<UUID> imageIds,
      Set<UUID> termIds,
      List<AcademicViolation> violations) {
    uniqueIds(resources, "draft.resources", violations);
    Set<String> kinds = new HashSet<>();
    for (int index = 0; resources.isArray() && index < resources.size(); index++) {
      JsonNode resource = resources.get(index);
      String path = "draft.resources[" + index + "]";
      String kind = text(resource, "kind");
      if (!RESOURCE_KINDS.contains(kind)) {
        violations.add(new AcademicViolation(path + ".kind", AcademicViolationCode.UNSUPPORTED));
      } else {
        kinds.add(kind);
      }
      validateLocalizedText(resource.path("title"), path + ".title", violations);
      validateReferences(
          resource.path("outlineItemIds"), outlineIds, path + ".outlineItemIds", violations);
      validateReferences(
          resource.path("objectiveIds"), objectiveIds, path + ".objectiveIds", violations);
      validateLocalizedContent(resource.path("versions"), path + ".versions", imageIds, violations);
      validateRequiredTermIds(resource.path("requiredTermIds"), kind, termIds, path, violations);
      validateProvenance(resource.path("provenance"), path + ".provenance", violations);
    }
    for (String requiredKind : RESOURCE_KINDS) {
      if (!kinds.contains(requiredKind)) {
        violations.add(new AcademicViolation("draft.resources", AcademicViolationCode.REQUIRED));
        break;
      }
    }
  }

  private Map<UUID, QuestionSnapshot> validateQuestions(
      JsonNode questions,
      Set<UUID> outlineIds,
      Set<UUID> objectiveIds,
      Set<UUID> imageIds,
      ExamStructureSnapshot structure,
      Set<UUID> termIds,
      Map<UUID, Set<String>> termSurfaces,
      List<AcademicViolation> violations) {
    uniqueIds(questions, "draft.questions", violations);
    Map<UUID, QuestionSnapshot> snapshots = new HashMap<>();
    int requiredCount = structure == null ? 1 : structure.questionCount();
    if (!questions.isArray() || questions.size() < requiredCount) {
      violations.add(new AcademicViolation("draft.questions", AcademicViolationCode.OUT_OF_RANGE));
      return snapshots;
    }
    Set<UUID> allResourceIds = new HashSet<>();
    // Resource ids collected after resources validated; relatedResourceIds checked in a second pass
    // via assessment set / question related ids against resource set later if needed.
    for (int index = 0; index < questions.size(); index++) {
      JsonNode question = questions.get(index);
      String path = "draft.questions[" + index + "]";
      UUID id = parseUuid(text(question, "id"));
      String language = text(question, "examLanguage");
      if (!EXAM_LANGUAGES.contains(language)) {
        violations.add(
            new AcademicViolation(path + ".examLanguage", AcademicViolationCode.UNSUPPORTED));
      }
      if (!DIFFICULTIES.contains(text(question, "difficulty"))) {
        violations.add(
            new AcademicViolation(path + ".difficulty", AcademicViolationCode.UNSUPPORTED));
      }
      validateBlocks(question.path("stem"), path + ".stem", imageIds, violations);
      JsonNode options = question.path("options");
      Set<String> optionKeys = new HashSet<>();
      if (!options.isArray() || options.size() < 2) {
        violations.add(
            new AcademicViolation(path + ".options", AcademicViolationCode.OUT_OF_RANGE));
      } else {
        for (int optionIndex = 0; optionIndex < options.size(); optionIndex++) {
          JsonNode option = options.get(optionIndex);
          String optionPath = path + ".options[" + optionIndex + "]";
          String key = requireText(option, "key", optionPath + ".key", 40, violations);
          if (key != null && !optionKeys.add(key)) {
            violations.add(
                new AcademicViolation(optionPath + ".key", AcademicViolationCode.DUPLICATE));
          }
          validateBlocks(option.path("blocks"), optionPath + ".blocks", imageIds, violations);
        }
      }
      String answer =
          requireText(question, "correctOptionKey", path + ".correctOptionKey", 40, violations);
      if (answer != null && !optionKeys.contains(answer)) {
        violations.add(
            new AcademicViolation(path + ".correctOptionKey", AcademicViolationCode.INCOMPATIBLE));
      }
      validateLocalizedContent(
          question.path("explanations"), path + ".explanations", imageIds, violations);
      validateReferences(
          question.path("outlineItemIds"), outlineIds, path + ".outlineItemIds", violations);
      validateReferences(
          question.path("objectiveIds"), objectiveIds, path + ".objectiveIds", violations);
      validateHintTiers(question.path("hintTiers"), path + ".hintTiers", imageIds, violations);
      validateOptionalLocalizedTextArray(
          question.path("commonMistakeNotes"), path + ".commonMistakeNotes", 6, violations);
      validateOptionalResourceIdArray(
          question.path("relatedResourceIds"),
          path + ".relatedResourceIds",
          8,
          allResourceIds,
          violations);
      validateAuthoredTermAttachments(
          question.path("authoredTermAttachments"),
          path + ".authoredTermAttachments",
          termIds,
          termSurfaces,
          violations);
      validateProvenance(question.path("provenance"), path + ".provenance", violations);
      if (id != null && language != null && EXAM_LANGUAGES.contains(language)) {
        snapshots.put(
            id,
            new QuestionSnapshot(
                language,
                text(question, "difficulty"),
                uuidList(question.path("outlineItemIds")),
                uuidList(question.path("objectiveIds"))));
      }
    }
    return snapshots;
  }

  private void validateHintTiers(
      JsonNode hintTiers, String path, Set<UUID> imageIds, List<AcademicViolation> violations) {
    if (hintTiers == null || hintTiers.isMissingNode() || hintTiers.isNull()) {
      return;
    }
    if (!hintTiers.isArray()) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
      return;
    }
    if (hintTiers.size() > 8) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
      return;
    }
    // Strict order: STANDARD tiers first, then trailing STRONG only. STANDARD after STRONG fails.
    boolean sawStrong = false;
    for (int index = 0; index < hintTiers.size(); index++) {
      JsonNode tier = hintTiers.get(index);
      String tierPath = path + "[" + index + "]";
      if (!tier.isObject()) {
        violations.add(new AcademicViolation(tierPath, AcademicViolationCode.INVALID));
        continue;
      }
      String strength = text(tier, "strength");
      if (!HINT_STRENGTHS.contains(strength)) {
        violations.add(
            new AcademicViolation(tierPath + ".strength", AcademicViolationCode.UNSUPPORTED));
      } else if ("STRONG".equals(strength)) {
        sawStrong = true;
      } else if (sawStrong) {
        violations.add(
            new AcademicViolation(tierPath + ".strength", AcademicViolationCode.INCOMPATIBLE));
      }
      validateBlocks(tier.path("blocks"), tierPath + ".blocks", imageIds, violations);
    }
  }

  private void validateOptionalLocalizedTextArray(
      JsonNode values, String path, int maxItems, List<AcademicViolation> violations) {
    if (values == null || values.isMissingNode() || values.isNull()) {
      return;
    }
    if (!values.isArray()) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
      return;
    }
    if (values.size() > maxItems) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
      return;
    }
    for (int index = 0; index < values.size(); index++) {
      validateLocalizedText(values.get(index), path + "[" + index + "]", violations);
    }
  }

  private void validateOptionalResourceIdArray(
      JsonNode values,
      String path,
      int maxItems,
      Set<UUID> knownResourceIds,
      List<AcademicViolation> violations) {
    if (values == null || values.isMissingNode() || values.isNull()) {
      return;
    }
    if (!values.isArray()) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
      return;
    }
    if (values.size() > maxItems) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
      return;
    }
    Set<UUID> unique = new HashSet<>();
    for (int index = 0; index < values.size(); index++) {
      UUID id = parseUuid(values.get(index).asText());
      if (id == null) {
        violations.add(
            new AcademicViolation(path + "[" + index + "]", AcademicViolationCode.INVALID));
      } else if (!unique.add(id)) {
        violations.add(
            new AcademicViolation(path + "[" + index + "]", AcademicViolationCode.DUPLICATE));
      } else if (!knownResourceIds.isEmpty() && !knownResourceIds.contains(id)) {
        violations.add(
            new AcademicViolation(path + "[" + index + "]", AcademicViolationCode.INCOMPATIBLE));
      }
    }
  }

  private void validateQuestionRelatedResources(
      JsonNode questions, Set<UUID> resourceIds, List<AcademicViolation> violations) {
    if (!questions.isArray()) return;
    for (int index = 0; index < questions.size(); index++) {
      JsonNode related = questions.get(index).path("relatedResourceIds");
      if (related == null || related.isMissingNode() || related.isNull()) continue;
      if (!related.isArray()) continue;
      for (int r = 0; r < related.size(); r++) {
        UUID id = parseUuid(related.get(r).asText());
        if (id != null && !resourceIds.contains(id)) {
          violations.add(
              new AcademicViolation(
                  "draft.questions[" + index + "].relatedResourceIds[" + r + "]",
                  AcademicViolationCode.INCOMPATIBLE));
        }
      }
    }
  }

  private void validateAssessmentSets(
      JsonNode assessmentSets,
      Map<UUID, QuestionSnapshot> questions,
      Set<UUID> resourceIds,
      Map<UUID, String> resourceKinds,
      List<AcademicViolation> violations) {
    if (assessmentSets == null || assessmentSets.isMissingNode() || assessmentSets.isNull()) {
      return;
    }
    if (!assessmentSets.isArray()) {
      violations.add(new AcademicViolation("draft.assessmentSets", AcademicViolationCode.INVALID));
      return;
    }
    if (assessmentSets.size() > 64) {
      violations.add(
          new AcademicViolation("draft.assessmentSets", AcademicViolationCode.OUT_OF_RANGE));
      return;
    }
    uniqueIds(assessmentSets, "draft.assessmentSets", violations);
    // One CHECKPOINT edition per (lesson, exam language) — student UI exposes one startable
    // edition per language for a lesson (contract max 2 editions: en + zh-CN).
    Set<String> checkpointLessonLanguageKeys = new HashSet<>();
    // Re-validate question relatedResourceIds now that resource ids are known.
    // (Snapshot path does not carry those ids; callers validate questions first.)
    for (int index = 0; index < assessmentSets.size(); index++) {
      JsonNode set = assessmentSets.get(index);
      String path = "draft.assessmentSets[" + index + "]";
      if (!set.isObject()) {
        violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
        continue;
      }
      String purpose = text(set, "purpose");
      if (!ASSESSMENT_SET_PURPOSES.contains(purpose)) {
        violations.add(new AcademicViolation(path + ".purpose", AcademicViolationCode.UNSUPPORTED));
      }
      validateLocalizedText(set.path("title"), path + ".title", violations);
      String examLanguage = text(set, "examLanguage");
      if (!EXAM_LANGUAGES.contains(examLanguage)) {
        violations.add(
            new AcademicViolation(path + ".examLanguage", AcademicViolationCode.UNSUPPORTED));
      }
      String difficulty = text(set, "difficulty");
      if (difficulty != null && !DIFFICULTIES.contains(difficulty)) {
        violations.add(
            new AcademicViolation(path + ".difficulty", AcademicViolationCode.UNSUPPORTED));
      }
      JsonNode questionIds = set.path("questionIds");
      if (!questionIds.isArray() || questionIds.isEmpty() || questionIds.size() > 12) {
        violations.add(
            new AcademicViolation(path + ".questionIds", AcademicViolationCode.OUT_OF_RANGE));
      } else {
        Set<UUID> unique = new HashSet<>();
        for (int q = 0; q < questionIds.size(); q++) {
          UUID qid = parseUuid(questionIds.get(q).asText());
          String qPath = path + ".questionIds[" + q + "]";
          if (qid == null || !questions.containsKey(qid)) {
            violations.add(new AcademicViolation(qPath, AcademicViolationCode.INCOMPATIBLE));
          } else if (!unique.add(qid)) {
            violations.add(new AcademicViolation(qPath, AcademicViolationCode.DUPLICATE));
          } else if (examLanguage != null
              && !examLanguage.equals(questions.get(qid).examLanguage())) {
            violations.add(new AcademicViolation(qPath, AcademicViolationCode.INCOMPATIBLE));
          }
        }
      }
      if ("CHECKPOINT".equals(purpose)) {
        UUID lessonId = parseUuid(text(set, "lessonResourceId"));
        if (lessonId == null) {
          violations.add(
              new AcademicViolation(path + ".lessonResourceId", AcademicViolationCode.REQUIRED));
        } else if (!"LESSON".equals(resourceKinds.get(lessonId))) {
          violations.add(
              new AcademicViolation(
                  path + ".lessonResourceId", AcademicViolationCode.INCOMPATIBLE));
        } else if (examLanguage != null && EXAM_LANGUAGES.contains(examLanguage)) {
          String key = lessonId + "|" + examLanguage;
          if (!checkpointLessonLanguageKeys.add(key)) {
            violations.add(
                new AcademicViolation(path + ".examLanguage", AcademicViolationCode.DUPLICATE));
          }
        }
        String passPolicy = text(set, "passPolicy");
        if (passPolicy == null) {
          violations.add(
              new AcademicViolation(path + ".passPolicy", AcademicViolationCode.REQUIRED));
        } else if (!PASS_POLICIES.contains(passPolicy)) {
          violations.add(
              new AcademicViolation(path + ".passPolicy", AcademicViolationCode.UNSUPPORTED));
        }
      } else if (set.hasNonNull("lessonResourceId")) {
        UUID lessonId = parseUuid(text(set, "lessonResourceId"));
        if (lessonId != null && !"LESSON".equals(resourceKinds.get(lessonId))) {
          violations.add(
              new AcademicViolation(
                  path + ".lessonResourceId", AcademicViolationCode.INCOMPATIBLE));
        }
      }
      String feedbackMode = text(set, "feedbackMode");
      if (feedbackMode != null && !FEEDBACK_MODES.contains(feedbackMode)) {
        violations.add(
            new AcademicViolation(path + ".feedbackMode", AcademicViolationCode.UNSUPPORTED));
      }
      if (set.has("estimatedMinutes")
          && !set.path("estimatedMinutes").isNull()
          && set.path("estimatedMinutes").canConvertToInt()) {
        int minutes = set.path("estimatedMinutes").asInt();
        if (minutes < 1 || minutes > 180) {
          violations.add(
              new AcademicViolation(
                  path + ".estimatedMinutes", AcademicViolationCode.OUT_OF_RANGE));
        }
      }
      validateOptionalUuidRefs(
          set.path("outlineItemIds"), path + ".outlineItemIds", 32, violations);
      validateOptionalUuidRefs(set.path("objectiveIds"), path + ".objectiveIds", 32, violations);
      JsonNode remediationIds = set.path("remediationResourceIds");
      if (remediationIds != null && !remediationIds.isMissingNode() && !remediationIds.isNull()) {
        if (!remediationIds.isArray() || remediationIds.size() > 8) {
          violations.add(
              new AcademicViolation(
                  path + ".remediationResourceIds", AcademicViolationCode.OUT_OF_RANGE));
        } else {
          Set<UUID> unique = new HashSet<>();
          for (int r = 0; r < remediationIds.size(); r++) {
            UUID rid = parseUuid(remediationIds.get(r).asText());
            String rPath = path + ".remediationResourceIds[" + r + "]";
            if (rid == null || !resourceIds.contains(rid)) {
              violations.add(new AcademicViolation(rPath, AcademicViolationCode.INCOMPATIBLE));
            } else if (!"REMEDIATION".equals(resourceKinds.get(rid))) {
              violations.add(new AcademicViolation(rPath, AcademicViolationCode.INCOMPATIBLE));
            } else if (!unique.add(rid)) {
              violations.add(new AcademicViolation(rPath, AcademicViolationCode.DUPLICATE));
            }
          }
        }
      }
    }
  }

  private void validateOptionalUuidRefs(
      JsonNode values, String path, int maxItems, List<AcademicViolation> violations) {
    if (values == null || values.isMissingNode() || values.isNull()) {
      return;
    }
    if (!values.isArray() || values.size() > maxItems) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
      return;
    }
    for (int index = 0; index < values.size(); index++) {
      if (parseUuid(values.get(index).asText()) == null) {
        violations.add(
            new AcademicViolation(path + "[" + index + "]", AcademicViolationCode.INVALID));
      }
    }
  }

  private static Map<UUID, String> resourceKinds(JsonNode resources) {
    Map<UUID, String> kinds = new HashMap<>();
    if (!resources.isArray()) return kinds;
    for (JsonNode resource : resources) {
      UUID id = parseUuid(text(resource, "id"));
      String kind = text(resource, "kind");
      if (id != null && kind != null) {
        kinds.put(id, kind);
      }
    }
    return kinds;
  }

  private static List<UUID> uuidList(JsonNode values) {
    List<UUID> ids = new ArrayList<>();
    if (!values.isArray()) return ids;
    for (JsonNode value : values) {
      UUID id = parseUuid(value.asText());
      if (id != null) ids.add(id);
    }
    return List.copyOf(ids);
  }

  private record QuestionSnapshot(
      String examLanguage, String difficulty, List<UUID> outlineItemIds, List<UUID> objectiveIds) {}

  private void validateMock(
      JsonNode mocks,
      Map<UUID, String> questionLanguages,
      ExamStructureSnapshot structure,
      List<AcademicViolation> violations) {
    if (!mocks.isArray() || mocks.size() != 1) {
      violations.add(new AcademicViolation("draft.mocks", AcademicViolationCode.OUT_OF_RANGE));
      return;
    }
    if (structure == null) {
      return;
    }
    JsonNode mock = mocks.get(0);
    String path = "draft.mocks[0]";
    requireText(mock, "title", path + ".title", 200, violations);
    String language = text(mock, "examLanguage");
    if (!EXAM_LANGUAGES.contains(language)) {
      violations.add(
          new AcademicViolation(path + ".examLanguage", AcademicViolationCode.UNSUPPORTED));
    }
    // Mock must snapshot the package exam structure (subject-agnostic consistency rule).
    requireNumber(
        mock,
        "durationMinutes",
        structure.durationMinutes(),
        path + ".durationMinutes",
        violations);
    requireNumber(mock, "totalPoints", structure.totalPoints(), path + ".totalPoints", violations);
    requireNumber(
        mock, "questionCount", structure.questionCount(), path + ".questionCount", violations);
    requireExact(
        mock, "questionType", structure.questionType(), path + ".questionType", violations);
    validateProvenance(mock.path("provenance"), path + ".provenance", violations);

    JsonNode selected = mock.path("questions");
    if (!selected.isArray() || selected.size() != structure.questionCount()) {
      violations.add(
          new AcademicViolation(path + ".questions", AcademicViolationCode.OUT_OF_RANGE));
      return;
    }
    Set<UUID> unique = new HashSet<>();
    int total = 0;
    for (int index = 0; index < selected.size(); index++) {
      JsonNode item = selected.get(index);
      String itemPath = path + ".questions[" + index + "]";
      UUID questionId = parseUuid(text(item, "questionId"));
      if (questionId == null || !questionLanguages.containsKey(questionId)) {
        violations.add(
            new AcademicViolation(itemPath + ".questionId", AcademicViolationCode.INCOMPATIBLE));
      } else {
        if (!unique.add(questionId)) {
          violations.add(
              new AcademicViolation(itemPath + ".questionId", AcademicViolationCode.DUPLICATE));
        }
        if (!questionLanguages.get(questionId).equals(language)) {
          violations.add(
              new AcademicViolation(itemPath + ".questionId", AcademicViolationCode.INCOMPATIBLE));
        }
      }
      if (!item.path("points").canConvertToInt() || item.path("points").asInt() < 1) {
        violations.add(
            new AcademicViolation(itemPath + ".points", AcademicViolationCode.OUT_OF_RANGE));
      } else {
        total += item.path("points").asInt();
      }
    }
    if (total != structure.totalPoints()) {
      violations.add(
          new AcademicViolation(path + ".totalPoints", AcademicViolationCode.INCOMPATIBLE));
    }
  }

  private void validateLocalizedContent(
      JsonNode versions, String path, Set<UUID> imageIds, List<AcademicViolation> violations) {
    if (!versions.isArray() || versions.isEmpty()) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.REQUIRED));
      return;
    }
    Set<String> languages = new HashSet<>();
    for (int index = 0; index < versions.size(); index++) {
      JsonNode version = versions.get(index);
      String versionPath = path + "[" + index + "]";
      String language = text(version, "language");
      if (!EXPLANATION_LANGUAGES.contains(language)) {
        violations.add(
            new AcademicViolation(versionPath + ".language", AcademicViolationCode.UNSUPPORTED));
      } else if (!languages.add(language)) {
        violations.add(
            new AcademicViolation(versionPath + ".language", AcademicViolationCode.DUPLICATE));
      }
      validateBlocks(version.path("blocks"), versionPath + ".blocks", imageIds, violations);
    }
  }

  private void validateBlocks(
      JsonNode blocks, String path, Set<UUID> imageIds, List<AcademicViolation> violations) {
    if (!blocks.isArray() || blocks.isEmpty()) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.REQUIRED));
      return;
    }
    for (int index = 0; index < blocks.size(); index++) {
      JsonNode block = blocks.get(index);
      String blockPath = path + "[" + index + "]";
      switch (text(block, "kind")) {
        case "TEXT" -> {
          String body = requireText(block, "text", blockPath + ".text", 12000, violations);
          validateInlineLatex(body, blockPath + ".text", violations);
        }
        case "MATH" -> {
          String latex = requireText(block, "latex", blockPath + ".latex", 4000, violations);
          if (latex != null && !InlineLatex.isSafe(latex)) {
            violations.add(
                new AcademicViolation(blockPath + ".latex", AcademicViolationCode.UNSUPPORTED));
          }
          if (!block.path("displayMode").isBoolean()) {
            violations.add(
                new AcademicViolation(blockPath + ".displayMode", AcademicViolationCode.REQUIRED));
          }
        }
        case "IMAGE" -> {
          UUID imageId = parseUuid(text(block, "imageId"));
          if (imageId == null || !imageIds.contains(imageId)) {
            violations.add(
                new AcademicViolation(blockPath + ".imageId", AcademicViolationCode.INCOMPATIBLE));
          }
          requireText(block, "altText", blockPath + ".altText", 500, violations);
          optionalTextMax(text(block, "caption"), 1000, blockPath + ".caption", violations);
        }
        default ->
            violations.add(
                new AcademicViolation(blockPath + ".kind", AcademicViolationCode.UNSUPPORTED));
      }
    }
  }

  private void validateProvenance(
      JsonNode provenance, String path, List<AcademicViolation> violations) {
    String origin = text(provenance, "origin");
    if (!ORIGINS.contains(origin)) {
      violations.add(new AcademicViolation(path + ".origin", AcademicViolationCode.UNSUPPORTED));
      return;
    }
    optionalTextMax(text(provenance, "provider"), 200, path + ".provider", violations);
    optionalTextMax(text(provenance, "sourceLocator"), 2000, path + ".sourceLocator", violations);
    optionalTextMax(
        text(provenance, "permissionReference"), 1000, path + ".permissionReference", violations);
    if (!"YUKCSCA_ORIGINAL".equals(origin)
        && (blank(text(provenance, "provider"))
            || blank(text(provenance, "sourceLocator"))
            || blank(text(provenance, "permissionReference")))) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.MISSING_PERMISSION));
    }
  }

  private void validateTerms(
      JsonNode terms, Set<UUID> outlineIds, List<AcademicViolation> violations) {
    if (terms == null || terms.isMissingNode() || terms.isNull()) {
      return;
    }
    if (!terms.isArray()) {
      violations.add(new AcademicViolation("draft.terms", AcademicViolationCode.INVALID));
      return;
    }
    if (terms.size() > 500) {
      violations.add(new AcademicViolation("draft.terms", AcademicViolationCode.OUT_OF_RANGE));
      return;
    }
    for (int index = 0; index < terms.size(); index++) {
      JsonNode term = terms.get(index);
      String path = "draft.terms[" + index + "]";
      if (!term.isObject()) {
        violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
        continue;
      }
      String termClass = text(term, "termClass");
      if (!TERM_CLASSES.contains(termClass)) {
        violations.add(
            new AcademicViolation(path + ".termClass", AcademicViolationCode.UNSUPPORTED));
      }
      JsonNode surfaces = term.path("surfaceForms");
      if (!surfaces.isArray() || surfaces.isEmpty() || surfaces.size() > 8) {
        violations.add(
            new AcademicViolation(
                path + ".surfaceForms",
                surfaces.isArray() && surfaces.isEmpty()
                    ? AcademicViolationCode.REQUIRED
                    : AcademicViolationCode.OUT_OF_RANGE));
      } else {
        for (int s = 0; s < surfaces.size(); s++) {
          JsonNode surface = surfaces.get(s);
          String surfacePath = path + ".surfaceForms[" + s + "]";
          requireText(surface, "text", surfacePath + ".text", 40, violations);
          requireText(surface, "pinyin", surfacePath + ".pinyin", 80, violations);
        }
      }
      validateOptionalDefinitions(term.path("definitions"), path + ".definitions", violations);
      String englishEquivalent =
          requireText(term, "englishEquivalent", path + ".englishEquivalent", 200, violations);
      validateInlineLatex(englishEquivalent, path + ".englishEquivalent", violations);
      String symbols = text(term, "symbols");
      optionalTextMax(symbols, 80, path + ".symbols", violations);
      if (symbols != null && !symbols.isBlank() && !InlineLatex.isSafe(symbols)) {
        violations.add(new AcademicViolation(path + ".symbols", AcademicViolationCode.UNSUPPORTED));
      }
      String example = text(term, "example");
      optionalTextMax(example, 500, path + ".example", violations);
      validateInlineLatex(example, path + ".example", violations);
      JsonNode outline = term.path("outlineItemIds");
      if (outline.isMissingNode() || outline.isNull()) {
        if ("TOPIC_TERM".equals(termClass)) {
          violations.add(
              new AcademicViolation(path + ".outlineItemIds", AcademicViolationCode.REQUIRED));
        }
      } else if (!outline.isArray()) {
        violations.add(
            new AcademicViolation(path + ".outlineItemIds", AcademicViolationCode.INVALID));
      } else if (outline.size() > 32) {
        violations.add(
            new AcademicViolation(path + ".outlineItemIds", AcademicViolationCode.OUT_OF_RANGE));
      } else if (outline.isEmpty()) {
        if ("TOPIC_TERM".equals(termClass)) {
          violations.add(
              new AcademicViolation(path + ".outlineItemIds", AcademicViolationCode.REQUIRED));
        }
      } else {
        validateOptionalKnownIds(outline, outlineIds, path + ".outlineItemIds", 32, violations);
      }
    }
  }

  private void validateOptionalDefinitions(
      JsonNode definitions, String path, List<AcademicViolation> violations) {
    if (definitions == null || definitions.isMissingNode() || definitions.isNull()) {
      return;
    }
    if (!definitions.isObject()) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
      return;
    }
    String indonesian = text(definitions, "indonesian");
    optionalTextMax(indonesian, 4000, path + ".indonesian", violations);
    validateInlineLatex(indonesian, path + ".indonesian", violations);
    String english = text(definitions, "english");
    optionalTextMax(english, 4000, path + ".english", violations);
    validateInlineLatex(english, path + ".english", violations);
    String simplifiedChinese = text(definitions, "simplifiedChinese");
    optionalTextMax(simplifiedChinese, 4000, path + ".simplifiedChinese", violations);
    validateInlineLatex(simplifiedChinese, path + ".simplifiedChinese", violations);
  }

  /**
   * Term-bank edits are not a transactional rewrite of every resource/question pointer. Unknown
   * {@code requiredTermIds} and attachments are dropped so a deleted term cannot block publish.
   * Remaining ids are still validated against the live bank.
   */
  void dropStaleTermReferences(ObjectNode draft) {
    Set<UUID> termIds = new LinkedHashSet<>();
    JsonNode terms = draft.path("terms");
    if (terms.isArray()) {
      for (JsonNode term : terms) {
        UUID id = parseUuid(text(term, "id"));
        if (id != null) {
          termIds.add(id);
        }
      }
    }
    JsonNode resources = draft.path("resources");
    if (resources.isArray()) {
      for (JsonNode resource : resources) {
        if (!(resource instanceof ObjectNode node)) {
          continue;
        }
        JsonNode required = node.get("requiredTermIds");
        if (required == null || required.isNull() || required.isMissingNode()) {
          continue;
        }
        String kind = text(node, "kind");
        if (!required.isArray() || !("TERMINOLOGY".equals(kind) || "LESSON".equals(kind))) {
          node.remove("requiredTermIds");
          continue;
        }
        node.set("requiredTermIds", keepKnownIds(required, termIds));
      }
    }
    JsonNode questions = draft.path("questions");
    if (questions.isArray()) {
      for (JsonNode question : questions) {
        if (!(question instanceof ObjectNode node)) {
          continue;
        }
        JsonNode attachments = node.get("authoredTermAttachments");
        if (attachments == null || attachments.isNull() || attachments.isMissingNode()) {
          continue;
        }
        if (!attachments.isArray()) {
          node.remove("authoredTermAttachments");
          continue;
        }
        ArrayNode kept = json.createArrayNode();
        for (JsonNode attachment : attachments) {
          if (!attachment.isObject()) {
            continue;
          }
          UUID termId = parseUuid(text(attachment, "termId"));
          if (termId == null || !termIds.contains(termId)) {
            continue;
          }
          kept.add(attachment);
        }
        node.set("authoredTermAttachments", kept);
      }
    }
  }

  private ArrayNode keepKnownIds(JsonNode values, Set<UUID> known) {
    ArrayNode kept = json.createArrayNode();
    Set<UUID> unique = new LinkedHashSet<>();
    for (JsonNode value : values) {
      UUID id = parseUuid(value.asText());
      if (id == null || !known.contains(id) || !unique.add(id)) {
        continue;
      }
      kept.add(id.toString());
    }
    return kept;
  }

  private void validateRequiredTermIds(
      JsonNode requiredTermIds,
      String kind,
      Set<UUID> termIds,
      String path,
      List<AcademicViolation> violations) {
    if (requiredTermIds == null || requiredTermIds.isMissingNode() || requiredTermIds.isNull()) {
      return;
    }
    if (!requiredTermIds.isArray()) {
      violations.add(
          new AcademicViolation(path + ".requiredTermIds", AcademicViolationCode.INVALID));
      return;
    }
    if (!"TERMINOLOGY".equals(kind) && !"LESSON".equals(kind)) {
      if (!requiredTermIds.isEmpty()) {
        violations.add(
            new AcademicViolation(path + ".requiredTermIds", AcademicViolationCode.INVALID));
      }
      return;
    }
    if (requiredTermIds.size() > 64) {
      violations.add(
          new AcademicViolation(path + ".requiredTermIds", AcademicViolationCode.OUT_OF_RANGE));
      return;
    }
    validateOptionalKnownIds(requiredTermIds, termIds, path + ".requiredTermIds", 64, violations);
  }

  private void validateAuthoredTermAttachments(
      JsonNode attachments,
      String path,
      Set<UUID> termIds,
      Map<UUID, Set<String>> termSurfaces,
      List<AcademicViolation> violations) {
    if (attachments == null || attachments.isMissingNode() || attachments.isNull()) {
      return;
    }
    if (!attachments.isArray()) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
      return;
    }
    if (attachments.size() > 32) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
      return;
    }
    for (int index = 0; index < attachments.size(); index++) {
      JsonNode attachment = attachments.get(index);
      String itemPath = path + "[" + index + "]";
      if (!attachment.isObject()) {
        violations.add(new AcademicViolation(itemPath, AcademicViolationCode.INVALID));
        continue;
      }
      UUID termId = parseUuid(text(attachment, "termId"));
      if (termId == null || !termIds.contains(termId)) {
        violations.add(
            new AcademicViolation(itemPath + ".termId", AcademicViolationCode.INCOMPATIBLE));
        continue;
      }
      String surface = text(attachment, "surfaceForm");
      if (surface != null) {
        if (surface.length() > 40) {
          violations.add(
              new AcademicViolation(itemPath + ".surfaceForm", AcademicViolationCode.OUT_OF_RANGE));
        } else if (!termSurfaces.getOrDefault(termId, Set.of()).contains(surface)) {
          violations.add(
              new AcademicViolation(itemPath + ".surfaceForm", AcademicViolationCode.INCOMPATIBLE));
        }
      }
    }
  }

  private void validateOptionalKnownIds(
      JsonNode values,
      Set<UUID> known,
      String path,
      int maxItems,
      List<AcademicViolation> violations) {
    if (values.size() > maxItems) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
      return;
    }
    Set<UUID> unique = new HashSet<>();
    for (int index = 0; index < values.size(); index++) {
      UUID id = parseUuid(values.get(index).asText());
      if (id == null || !known.contains(id)) {
        violations.add(
            new AcademicViolation(path + "[" + index + "]", AcademicViolationCode.INCOMPATIBLE));
      } else if (!unique.add(id)) {
        violations.add(
            new AcademicViolation(path + "[" + index + "]", AcademicViolationCode.DUPLICATE));
      }
    }
  }

  private static Map<UUID, Set<String>> termSurfaceIndex(JsonNode terms) {
    Map<UUID, Set<String>> index = new HashMap<>();
    if (terms == null || !terms.isArray()) return index;
    for (JsonNode term : terms) {
      UUID id = parseUuid(text(term, "id"));
      if (id == null) continue;
      Set<String> surfaces = new LinkedHashSet<>();
      JsonNode forms = term.path("surfaceForms");
      if (forms.isArray()) {
        for (JsonNode form : forms) {
          String value = text(form, "text");
          if (value != null) surfaces.add(value);
        }
      }
      index.put(id, surfaces);
    }
    return index;
  }

  private void validateLocalizedText(
      JsonNode localized, String path, List<AcademicViolation> violations) {
    requireText(localized, "indonesian", path + ".indonesian", 4000, violations);
    requireText(localized, "english", path + ".english", 4000, violations);
    requireText(localized, "simplifiedChinese", path + ".simplifiedChinese", 4000, violations);
  }

  private void validateReferences(
      JsonNode references, Set<UUID> validIds, String path, List<AcademicViolation> violations) {
    if (!references.isArray() || references.isEmpty()) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.REQUIRED));
      return;
    }
    Set<UUID> unique = new HashSet<>();
    for (int index = 0; index < references.size(); index++) {
      UUID id = parseUuid(references.get(index).asText());
      if (id == null || !validIds.contains(id)) {
        violations.add(
            new AcademicViolation(path + "[" + index + "]", AcademicViolationCode.INCOMPATIBLE));
      } else if (!unique.add(id)) {
        violations.add(
            new AcademicViolation(path + "[" + index + "]", AcademicViolationCode.DUPLICATE));
      }
    }
  }

  private Set<UUID> uniqueIds(JsonNode items, String path, List<AcademicViolation> violations) {
    Set<UUID> ids = new LinkedHashSet<>();
    if (!items.isArray()) return ids;
    for (int index = 0; index < items.size(); index++) {
      UUID id = parseUuid(text(items.get(index), "id"));
      if (id == null) {
        violations.add(
            new AcademicViolation(path + "[" + index + "].id", AcademicViolationCode.INVALID));
      } else if (!ids.add(id)) {
        violations.add(
            new AcademicViolation(path + "[" + index + "].id", AcademicViolationCode.DUPLICATE));
      }
    }
    return ids;
  }

  private void validateOfficialDate(
      JsonNode date, String path, List<AcademicViolation> violations) {
    String status = text(date, "status");
    JsonNode value = date.get("date");
    if ("NOT_STATED".equals(status)) {
      if (value != null && !value.isNull()) {
        violations.add(new AcademicViolation(path + ".date", AcademicViolationCode.INCOMPATIBLE));
      }
      return;
    }
    if (!"DECLARED".equals(status)) {
      violations.add(new AcademicViolation(path + ".status", AcademicViolationCode.UNSUPPORTED));
      return;
    }
    try {
      if (value == null || value.isNull()) throw new DateTimeParseException("missing", "", 0);
      LocalDate.parse(value.asText());
    } catch (DateTimeParseException exception) {
      violations.add(new AcademicViolation(path + ".date", AcademicViolationCode.INVALID));
    }
  }

  private void validateLanguageArray(
      JsonNode languages, Set<String> supported, String path, List<AcademicViolation> violations) {
    if (!languages.isArray() || languages.isEmpty()) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.REQUIRED));
      return;
    }
    Set<String> unique = new HashSet<>();
    for (int index = 0; index < languages.size(); index++) {
      String language = languages.get(index).asText();
      if (!supported.contains(language)) {
        violations.add(
            new AcademicViolation(path + "[" + index + "]", AcademicViolationCode.UNSUPPORTED));
      } else if (!unique.add(language)) {
        violations.add(
            new AcademicViolation(path + "[" + index + "]", AcademicViolationCode.DUPLICATE));
      }
    }
  }

  /**
   * Official CSCA PDFs may exist in one or two language editions (en / zh-CN). Each language may
   * appear at most once; each URL must be absolute http(s).
   */
  private void validateSourceLinks(
      JsonNode links, String path, List<AcademicViolation> violations) {
    if (!links.isArray() || links.isEmpty()) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.REQUIRED));
      return;
    }
    if (links.size() > 2) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
      return;
    }
    Set<String> uniqueLanguages = new HashSet<>();
    for (int index = 0; index < links.size(); index++) {
      JsonNode link = links.get(index);
      String itemPath = path + "[" + index + "]";
      if (!link.isObject()) {
        violations.add(new AcademicViolation(itemPath, AcademicViolationCode.INVALID));
        continue;
      }
      String language = text(link, "language");
      if (blank(language)) {
        violations.add(
            new AcademicViolation(itemPath + ".language", AcademicViolationCode.REQUIRED));
      } else if (!EXAM_LANGUAGES.contains(language)) {
        violations.add(
            new AcademicViolation(itemPath + ".language", AcademicViolationCode.UNSUPPORTED));
      } else if (!uniqueLanguages.add(language)) {
        violations.add(
            new AcademicViolation(itemPath + ".language", AcademicViolationCode.DUPLICATE));
      }
      String url = requireText(link, "url", itemPath + ".url", 2000, violations);
      if (url != null && !isHttpUrl(url)) {
        violations.add(new AcademicViolation(itemPath + ".url", AcademicViolationCode.INVALID));
      }
    }
  }

  private void enrichProvenance(
      ObjectNode draft,
      Map<String, UUID> priorAuthors,
      UUID currentAdmin,
      boolean reviewed,
      Instant reviewedAt) {
    for (String collection : List.of("resources", "questions", "mocks")) {
      JsonNode values = draft.path(collection);
      if (!values.isArray()) continue;
      for (JsonNode value : values) {
        if (!(value instanceof ObjectNode item)) continue;
        ObjectNode provenance =
            item.get("provenance") instanceof ObjectNode existing
                ? existing
                : json.createObjectNode();
        item.set("provenance", provenance);
        String key = collection + ":" + text(item, "id");
        UUID author = priorAuthors.getOrDefault(key, currentAdmin);
        if (blank(text(provenance, "origin"))) provenance.put("origin", "YUKCSCA_ORIGINAL");
        provenance.put("authorUserId", author.toString());
        if (reviewed) {
          provenance.put("reviewedByUserId", currentAdmin.toString());
          provenance.put("reviewedAt", reviewedAt.toString());
        } else {
          provenance.putNull("reviewedByUserId");
          provenance.putNull("reviewedAt");
        }
      }
    }
  }

  private Map<String, UUID> priorAuthors(ObjectNode draft) {
    Map<String, UUID> authors = new HashMap<>();
    for (String collection : List.of("resources", "questions", "mocks")) {
      JsonNode values = draft.path(collection);
      if (!values.isArray()) continue;
      for (JsonNode item : values) {
        UUID author = parseUuid(item.path("provenance").path("authorUserId").asText());
        if (author != null) authors.put(collection + ":" + text(item, "id"), author);
      }
    }
    return authors;
  }

  private static String requireText(
      JsonNode parent,
      String field,
      String path,
      int maxLength,
      List<AcademicViolation> violations) {
    String value = text(parent, field);
    if (blank(value)) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.REQUIRED));
      return null;
    }
    if (value.length() > maxLength) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
    }
    return value;
  }

  private static void requireObject(
      ObjectNode parent, String field, String path, List<AcademicViolation> violations) {
    if (!parent.path(field).isObject()) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.REQUIRED));
    }
  }

  private static void optionalTextMax(
      String value, int maxLength, String path, List<AcademicViolation> violations) {
    if (value != null && value.length() > maxLength) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
    }
  }

  private static void requireArray(
      ObjectNode parent, String field, String path, List<AcademicViolation> violations) {
    if (!parent.path(field).isArray()) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.REQUIRED));
    }
  }

  private static void requireExact(
      JsonNode parent,
      String field,
      String expected,
      String path,
      List<AcademicViolation> violations) {
    if (!expected.equals(text(parent, field))) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.INCOMPATIBLE));
    }
  }

  private static void requireNumber(
      JsonNode parent,
      String field,
      int expected,
      String path,
      List<AcademicViolation> violations) {
    if (!parent.path(field).canConvertToInt() || parent.path(field).asInt() != expected) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.INCOMPATIBLE));
    }
  }

  private static Integer requireIntInRange(
      JsonNode parent,
      String field,
      int min,
      int max,
      String path,
      List<AcademicViolation> violations) {
    if (!parent.path(field).canConvertToInt()) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.REQUIRED));
      return null;
    }
    int value = parent.path(field).asInt();
    if (value < min || value > max) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
      return null;
    }
    return value;
  }

  private record ExamStructureSnapshot(
      int durationMinutes, int totalPoints, int questionCount, String questionType) {}

  private static void requireInstant(
      JsonNode parent, String field, String path, List<AcademicViolation> violations) {
    try {
      Instant.parse(text(parent, field));
    } catch (DateTimeParseException | NullPointerException exception) {
      violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
    }
  }

  private static boolean isHttpUrl(String value) {
    try {
      URI uri = URI.create(value);
      return ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
          && uri.getHost() != null;
    } catch (IllegalArgumentException exception) {
      return false;
    }
  }

  private void validateInlineLatex(String value, String path, List<AcademicViolation> violations) {
    if (value == null || InlineLatex.isValidMixed(value)) return;
    violations.add(new AcademicViolation(path, AcademicViolationCode.UNSUPPORTED));
  }

  private static String text(JsonNode parent, String field) {
    if (parent == null || !parent.isObject()) return null;
    JsonNode value = parent.get(field);
    return value == null || value.isNull() || !value.isTextual() ? null : value.asText();
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }

  private static UUID parseUuid(String value) {
    try {
      return value == null ? null : UUID.fromString(value);
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  private static void walk(JsonNode node, java.util.function.Consumer<JsonNode> consumer) {
    consumer.accept(node);
    Iterator<JsonNode> children = node.iterator();
    while (children.hasNext()) walk(children.next(), consumer);
  }
}
