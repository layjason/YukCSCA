package com.yukcsca.academic.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class AcademicDraftProcessorTest {
  private final AcademicDraftProcessor processor = new AcademicDraftProcessor(JsonMapper.shared());
  private final JsonMapper json = JsonMapper.shared();

  @Test
  void incompleteDraftFailsValidationWithoutNpe() {
    ObjectNode draft =
        processor.parseObject(
            """
        {"officialSyllabus":{"subject":"MATHEMATICS"},"outlineItems":[],"learningObjectives":[],"resources":[],"questions":[],"mocks":[]}
        """);
    assertThatThrownBy(() -> processor.validateForPublication(draft, Set.of()))
        .isInstanceOf(AcademicValidationException.class);
  }

  @Test
  void emptyDraftIncludesTermsArray() {
    ObjectNode draft = processor.parseObject(processor.emptyDraft("MATHEMATICS"));
    assertThat(draft.path("terms").isArray()).isTrue();
    assertThat(draft.path("terms")).isEmpty();
  }

  @Test
  void normalizeForSaveOmitsTermsAsEmptyArray() {
    ObjectNode submitted = json.createObjectNode();
    submitted.putObject("officialSyllabus").put("subject", "MATHEMATICS");
    submitted.putArray("outlineItems");
    submitted.putArray("learningObjectives");
    submitted.putArray("resources");
    submitted.putArray("questions");
    submitted.putArray("mocks");
    ObjectNode normalized =
        processor.normalizeForSave(
            submitted, processor.emptyDraft("MATHEMATICS"), UUID.randomUUID(), "MATHEMATICS");
    assertThat(normalized.path("terms").isArray()).isTrue();
    assertThat(normalized.path("terms")).isEmpty();
  }

  @Test
  void normalizeForSaveRejectsNonArrayTerms() {
    ObjectNode submitted = json.createObjectNode();
    submitted.putObject("officialSyllabus").put("subject", "MATHEMATICS");
    submitted.putArray("outlineItems");
    submitted.putArray("learningObjectives");
    submitted.putArray("resources");
    submitted.putArray("questions");
    submitted.putArray("mocks");
    submitted.put("terms", "nope");
    assertThatThrownBy(
            () ->
                processor.normalizeForSave(
                    submitted,
                    processor.emptyDraft("MATHEMATICS"),
                    UUID.randomUUID(),
                    "MATHEMATICS"))
        .isInstanceOf(AcademicValidationException.class)
        .hasMessageContaining("validation");
  }

  @Test
  void omittedTermsDoNotAddDedicatedTermViolations() {
    ObjectNode draft =
        processor.parseObject(
            """
        {"officialSyllabus":{"subject":"MATHEMATICS"},"outlineItems":[],"learningObjectives":[],"resources":[],"questions":[],"mocks":[]}
        """);
    try {
      processor.validateForPublication(draft, Set.of());
    } catch (AcademicValidationException exception) {
      assertThat(exception.violations())
          .noneMatch(violation -> violation.path().startsWith("draft.terms"));
    }
  }

  @Test
  void missingSurfaceAndDomainMeaningAreRejected() {
    ObjectNode draft = publicationSkeleton();
    ObjectNode term = draft.withArray("terms").addObject();
    term.put("id", UUID.randomUUID().toString());
    term.put("termClass", "EXAM_INSTRUCTION");
    term.putArray("surfaceForms");
    term.putObject("definitions");
    assertThatThrownBy(() -> processor.validateForPublication(draft, Set.of()))
        .isInstanceOf(AcademicValidationException.class)
        .satisfies(
            exception ->
                assertThat(((AcademicValidationException) exception).violations())
                    .anyMatch(v -> v.path().contains("surfaceForms"))
                    .anyMatch(v -> v.path().contains("domainMeaning")));
  }

  @Test
  void topicTermWithoutOutlineIsRejected() {
    ObjectNode draft = publicationSkeleton();
    ObjectNode term = draft.withArray("terms").addObject();
    term.put("id", UUID.randomUUID().toString());
    term.put("termClass", "TOPIC_TERM");
    ObjectNode surface = term.putArray("surfaceForms").addObject();
    surface.put("text", "导数");
    surface.put("pinyin", "dǎoshù");
    term.putObject("definitions").put("english", "derivative");
    term.put("englishEquivalent", "derivative");
    term.put("domainMeaning", "The instantaneous rate of change.");
    term.putArray("outlineItemIds");
    assertThatThrownBy(() -> processor.validateForPublication(draft, Set.of()))
        .isInstanceOf(AcademicValidationException.class)
        .satisfies(
            exception ->
                assertThat(((AcademicValidationException) exception).violations())
                    .anyMatch(
                        v ->
                            v.path().contains("outlineItemIds")
                                && v.code() == AcademicViolationCode.REQUIRED));
  }

  @Test
  void unknownRequiredTermIdIsRejected() {
    ObjectNode draft = publicationSkeleton();
    for (var resource : draft.path("resources")) {
      if ("TERMINOLOGY".equals(resource.path("kind").asText())) {
        ((ObjectNode) resource).putArray("requiredTermIds").add(UUID.randomUUID().toString());
        break;
      }
    }
    assertThatThrownBy(() -> processor.validateForPublication(draft, Set.of()))
        .isInstanceOf(AcademicValidationException.class)
        .satisfies(
            exception ->
                assertThat(((AcademicValidationException) exception).violations())
                    .anyMatch(v -> v.path().contains("requiredTermIds")));
  }

  @Test
  void unknownAuthoredTermAttachmentIsRejected() {
    ObjectNode draft = publicationSkeleton();
    ObjectNode question = (ObjectNode) draft.path("questions").get(0);
    ObjectNode attachment = question.putArray("authoredTermAttachments").addObject();
    attachment.put("termId", UUID.randomUUID().toString());
    assertThatThrownBy(() -> processor.validateForPublication(draft, Set.of()))
        .isInstanceOf(AcademicValidationException.class)
        .satisfies(
            exception ->
                assertThat(((AcademicValidationException) exception).violations())
                    .anyMatch(v -> v.path().contains("authoredTermAttachments")));
  }

  private ObjectNode publicationSkeleton() {
    ObjectNode draft = json.createObjectNode();
    ObjectNode syllabus = draft.putObject("officialSyllabus");
    syllabus.put("subject", "MATHEMATICS");
    syllabus.put("authority", "CSCA");
    syllabus.put("editionLabel", "2025");
    syllabus
        .putArray("sourceLinks")
        .addObject()
        .put("language", "en")
        .put("url", "https://csca.cn/files/math.pdf");
    syllabus.put("retrievedAt", "2026-07-31T00:00:00Z");
    syllabus.put("lastCheckedAt", "2026-07-31T00:00:00Z");
    ObjectNode notStated = json.createObjectNode();
    notStated.put("status", "NOT_STATED");
    notStated.putNull("date");
    syllabus.set("publishedOn", notStated);
    syllabus.set("effectiveOn", notStated);
    syllabus.set("updatedOn", notStated);
    syllabus.put("permittedUse", "REFERENCE_ONLY");
    ObjectNode structure = syllabus.putObject("examStructure");
    structure.put("durationMinutes", 60);
    structure.put("totalPoints", 100);
    structure.put("questionCount", 1);
    structure.put("questionType", "SINGLE_ANSWER");
    structure.putArray("examLanguages").add("en");
    UUID outlineId = UUID.randomUUID();
    ObjectNode outline = draft.putArray("outlineItems").addObject();
    outline.put("id", outlineId.toString());
    outline.putNull("parentId");
    outline.put("order", 0);
    outline.putObject("sourcePosition").put("page", 1);
    localized(outline.putObject("summary"));
    UUID objectiveId = UUID.randomUUID();
    ObjectNode objective = draft.putArray("learningObjectives").addObject();
    objective.put("id", objectiveId.toString());
    localized(objective.putObject("title"));
    objective
        .putArray("mappings")
        .addObject()
        .put("outlineItemId", outlineId.toString())
        .put("rationale", "aligned");
    for (String kind : new String[] {"LESSON", "TERMINOLOGY", "REMEDIATION"}) {
      ObjectNode resource = draft.withArray("resources").addObject();
      resource.put("id", UUID.randomUUID().toString());
      resource.put("kind", kind);
      localized(resource.putObject("title"));
      resource.putArray("outlineItemIds").add(outlineId.toString());
      resource.putArray("objectiveIds").add(objectiveId.toString());
      ObjectNode version = resource.putArray("versions").addObject();
      version.put("language", "id");
      version.putArray("blocks").addObject().put("kind", "TEXT").put("text", "body");
      resource.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
    }
    ObjectNode question = draft.putArray("questions").addObject();
    question.put("id", UUID.randomUUID().toString());
    question.put("examLanguage", "en");
    question.put("difficulty", "STANDARD");
    question.putArray("stem").addObject().put("kind", "TEXT").put("text", "Q?");
    ObjectNode optionA = question.putArray("options").addObject();
    optionA.put("key", "A");
    optionA.putArray("blocks").addObject().put("kind", "TEXT").put("text", "1");
    ObjectNode optionB = question.withArray("options").addObject();
    optionB.put("key", "B");
    optionB.putArray("blocks").addObject().put("kind", "TEXT").put("text", "2");
    question.put("correctOptionKey", "A");
    ObjectNode explanation = question.putArray("explanations").addObject();
    explanation.put("language", "id");
    explanation.putArray("blocks").addObject().put("kind", "TEXT").put("text", "because");
    question.putArray("outlineItemIds").add(outlineId.toString());
    question.putArray("objectiveIds").add(objectiveId.toString());
    question.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
    draft.putArray("assessmentSets");
    draft.putArray("terms");
    draft.putArray("mocks");
    return draft;
  }

  private static void localized(ObjectNode node) {
    node.put("indonesian", "id");
    node.put("english", "en");
    node.put("simplifiedChinese", "zh");
  }
}
