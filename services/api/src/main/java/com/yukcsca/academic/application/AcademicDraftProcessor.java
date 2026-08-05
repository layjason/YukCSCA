package com.yukcsca.academic.application;

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
import tools.jackson.databind.node.ObjectNode;

@Service
public class AcademicDraftProcessor {
  private static final int MAX_DRAFT_BYTES = 5 * 1024 * 1024;
  private static final Set<String> EXAM_LANGUAGES = Set.of("en", "zh-CN");
  private static final Set<String> EXPLANATION_LANGUAGES = Set.of("id", "en", "zh-CN");
  private static final Set<String> RESOURCE_KINDS = Set.of("LESSON", "TERMINOLOGY", "REMEDIATION");
  private static final Set<String> DIFFICULTIES = Set.of("FOUNDATION", "STANDARD", "ADVANCED");
  private static final Set<String> ORIGINS = Set.of("YUKCSCA_ORIGINAL", "LICENSED", "OPEN_LICENSE");

  private final JsonMapper json;

  public AcademicDraftProcessor(JsonMapper json) {
    this.json = json;
  }

  public String emptyDraft() {
    return """
        {"officialSyllabus":{"subject":"MATHEMATICS"},"outlineItems":[],"learningObjectives":[],"resources":[],"questions":[],"mocks":[]}
        """
        .trim();
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
      JsonNode submitted, String previousDraftJson, UUID authenticatedAdmin) {
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
    JsonNode mocks = submittedObject.get("mocks");
    if (mocks != null && mocks.isArray() && mocks.size() > 1) {
      violations.add(new AcademicViolation("draft.mocks", AcademicViolationCode.OUT_OF_RANGE));
    }
    validateStableIds(submittedObject, violations);
    if (!violations.isEmpty()) throw new AcademicValidationException(violations);

    ObjectNode normalized = submittedObject.deepCopy();
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
    List<AcademicViolation> violations = new ArrayList<>();
    validateOfficialSyllabus(draft.path("officialSyllabus"), violations);
    Set<UUID> outlineIds = validateOutline(draft.path("outlineItems"), violations);
    Set<UUID> objectiveIds =
        validateObjectives(draft.path("learningObjectives"), outlineIds, violations);
    validateResources(
        draft.path("resources"), outlineIds, objectiveIds, availableImageIds, violations);
    Map<UUID, String> questionLanguages =
        validateQuestions(
            draft.path("questions"), outlineIds, objectiveIds, availableImageIds, violations);
    validateMock(draft.path("mocks"), questionLanguages, violations);
    if (!violations.isEmpty()) throw new AcademicValidationException(violations);
  }

  private void validateStableIds(ObjectNode draft, List<AcademicViolation> violations) {
    validateItemShape(draft.path("outlineItems"), "draft.outlineItems", violations);
    validateItemShape(draft.path("learningObjectives"), "draft.learningObjectives", violations);
    validateItemShape(draft.path("resources"), "draft.resources", violations);
    validateItemShape(draft.path("questions"), "draft.questions", violations);
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

  private void validateOfficialSyllabus(JsonNode syllabus, List<AcademicViolation> violations) {
    String base = "draft.officialSyllabus";
    requireExact(syllabus, "subject", "MATHEMATICS", base + ".subject", violations);
    requireText(syllabus, "authority", base + ".authority", 160, violations);
    requireText(syllabus, "editionLabel", base + ".editionLabel", 80, violations);
    String sourceUrl = requireText(syllabus, "sourceUrl", base + ".sourceUrl", 2000, violations);
    if (sourceUrl != null && !isHttpUrl(sourceUrl)) {
      violations.add(new AcademicViolation(base + ".sourceUrl", AcademicViolationCode.INVALID));
    }
    validateLanguageArray(
        syllabus.path("sourceLanguages"), EXAM_LANGUAGES, base + ".sourceLanguages", violations);
    requireInstant(syllabus, "retrievedAt", base + ".retrievedAt", violations);
    requireInstant(syllabus, "lastCheckedAt", base + ".lastCheckedAt", violations);
    validateOfficialDate(syllabus.path("publishedOn"), base + ".publishedOn", violations);
    validateOfficialDate(syllabus.path("effectiveOn"), base + ".effectiveOn", violations);
    validateOfficialDate(syllabus.path("updatedOn"), base + ".updatedOn", violations);
    requireExact(syllabus, "permittedUse", "REFERENCE_ONLY", base + ".permittedUse", violations);
    JsonNode structure = syllabus.path("examStructure");
    requireNumber(
        structure, "durationMinutes", 60, base + ".examStructure.durationMinutes", violations);
    requireNumber(structure, "totalPoints", 100, base + ".examStructure.totalPoints", violations);
    requireNumber(
        structure, "questionCount", 48, base + ".examStructure.questionCount", violations);
    requireExact(
        structure,
        "questionType",
        "SINGLE_ANSWER",
        base + ".examStructure.questionType",
        violations);
    validateLanguageArray(
        structure.path("examLanguages"),
        EXAM_LANGUAGES,
        base + ".examStructure.examLanguages",
        violations);
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
      validateProvenance(resource.path("provenance"), path + ".provenance", violations);
    }
    for (String requiredKind : RESOURCE_KINDS) {
      if (!kinds.contains(requiredKind)) {
        violations.add(new AcademicViolation("draft.resources", AcademicViolationCode.REQUIRED));
        break;
      }
    }
  }

  private Map<UUID, String> validateQuestions(
      JsonNode questions,
      Set<UUID> outlineIds,
      Set<UUID> objectiveIds,
      Set<UUID> imageIds,
      List<AcademicViolation> violations) {
    uniqueIds(questions, "draft.questions", violations);
    Map<UUID, String> languages = new HashMap<>();
    if (!questions.isArray() || questions.size() < 48) {
      violations.add(new AcademicViolation("draft.questions", AcademicViolationCode.OUT_OF_RANGE));
      return languages;
    }
    for (int index = 0; index < questions.size(); index++) {
      JsonNode question = questions.get(index);
      String path = "draft.questions[" + index + "]";
      UUID id = parseUuid(text(question, "id"));
      String language = text(question, "examLanguage");
      if (!EXAM_LANGUAGES.contains(language)) {
        violations.add(
            new AcademicViolation(path + ".examLanguage", AcademicViolationCode.UNSUPPORTED));
      } else if (id != null) {
        languages.put(id, language);
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
      validateProvenance(question.path("provenance"), path + ".provenance", violations);
    }
    return languages;
  }

  private void validateMock(
      JsonNode mocks, Map<UUID, String> questionLanguages, List<AcademicViolation> violations) {
    if (!mocks.isArray() || mocks.size() != 1) {
      violations.add(new AcademicViolation("draft.mocks", AcademicViolationCode.OUT_OF_RANGE));
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
    requireNumber(mock, "durationMinutes", 60, path + ".durationMinutes", violations);
    requireNumber(mock, "totalPoints", 100, path + ".totalPoints", violations);
    requireNumber(mock, "questionCount", 48, path + ".questionCount", violations);
    requireExact(mock, "questionType", "SINGLE_ANSWER", path + ".questionType", violations);
    validateProvenance(mock.path("provenance"), path + ".provenance", violations);

    JsonNode selected = mock.path("questions");
    if (!selected.isArray() || selected.size() != 48) {
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
    if (total != 100) {
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
        case "TEXT" -> requireText(block, "text", blockPath + ".text", 12000, violations);
        case "MATH" -> {
          String latex = requireText(block, "latex", blockPath + ".latex", 4000, violations);
          if (latex != null && !safeLatex(latex)) {
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

  private static boolean safeLatex(String value) {
    String normalized = value.toLowerCase(java.util.Locale.ROOT);
    if (normalized.indexOf('<') >= 0 || normalized.indexOf('>') >= 0) return false;
    return java.util.stream.Stream.of(
            "\\html", "\\href", "\\url", "\\includegraphics", "\\def", "\\gdef", "\\newcommand")
        .noneMatch(normalized::contains);
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
