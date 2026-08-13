package com.yukcsca.assessment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.yukcsca.academic.application.AcademicDraftProcessor;
import com.yukcsca.academic.application.AcademicValidationException;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

class AcademicAssessmentDraftValidationTest {
  private final AcademicDraftProcessor processor = new AcademicDraftProcessor(JsonMapper.shared());
  private final JsonMapper json = JsonMapper.shared();

  @Test
  void checkpointWithoutLessonFailsPublish() {
    ObjectNode draft = minimalDraft();
    ObjectNode set = draft.withArray("assessmentSets").addObject();
    set.put("id", UUID.randomUUID().toString());
    set.put("purpose", "CHECKPOINT");
    localized(set.putObject("title"), "CP", "CP", "CP");
    set.put("examLanguage", "en");
    set.putArray("questionIds").add(firstQuestionId(draft).toString());
    set.put("feedbackMode", "IMMEDIATE");
    set.put("passPolicy", "ALL_CORRECT_NO_STRONG_ASSISTANCE");

    assertThatThrownBy(() -> processor.validateForPublication(draft, Set.of()))
        .isInstanceOf(AcademicValidationException.class)
        .hasMessageContaining("validation");
  }

  @Test
  void checkpointWithLessonAndQuestionsPassesAssessmentValidationWhenBaseValid() {
    // incomplete base still fails on syllabus/mock; ensure assessment set shape does not NPE
    ObjectNode draft = minimalDraft();
    UUID lessonId = firstLessonId(draft);
    ObjectNode set = draft.withArray("assessmentSets").addObject();
    set.put("id", UUID.randomUUID().toString());
    set.put("purpose", "CHECKPOINT");
    localized(set.putObject("title"), "CP", "CP", "CP");
    set.put("examLanguage", "en");
    set.put("lessonResourceId", lessonId.toString());
    set.putArray("questionIds").add(firstQuestionId(draft).toString());
    set.put("feedbackMode", "IMMEDIATE");
    set.put("passPolicy", "ALL_CORRECT_NO_STRONG_ASSISTANCE");
    assertThatThrownBy(() -> processor.validateForPublication(draft, Set.of()))
        .isInstanceOf(AcademicValidationException.class);
  }

  @Test
  void duplicateCheckpointLessonAndExamLanguageFailsPublish() {
    ObjectNode draft = minimalDraft();
    UUID lessonId = firstLessonId(draft);
    UUID questionId = firstQuestionId(draft);
    for (int i = 0; i < 2; i++) {
      ObjectNode set = draft.withArray("assessmentSets").addObject();
      set.put("id", UUID.randomUUID().toString());
      set.put("purpose", "CHECKPOINT");
      localized(set.putObject("title"), "CP" + i, "CP" + i, "CP" + i);
      set.put("examLanguage", "en");
      set.put("lessonResourceId", lessonId.toString());
      set.putArray("questionIds").add(questionId.toString());
      set.put("feedbackMode", "IMMEDIATE");
      set.put("passPolicy", "ALL_CORRECT_NO_STRONG_ASSISTANCE");
    }

    assertThatThrownBy(() -> processor.validateForPublication(draft, Set.of()))
        .isInstanceOf(AcademicValidationException.class)
        .satisfies(
            thrown -> {
              AcademicValidationException exception = (AcademicValidationException) thrown;
              assertThat(
                      exception.violations().stream()
                          .anyMatch(
                              v ->
                                  v.path().contains("assessmentSets")
                                      && v.path().endsWith(".examLanguage")
                                      && v.code().name().equals("DUPLICATE")))
                  .isTrue();
            });
  }

  @Test
  void unorderedHintTiersFailPublishClosed() {
    ObjectNode draft = minimalDraft();
    ObjectNode question = (ObjectNode) draft.path("questions").get(0);
    question.remove("hintTiers");
    // STRONG first then STANDARD — not strictly ordered (STANDARD after STRONG)
    ObjectNode strong = question.putArray("hintTiers").addObject();
    strong.put("strength", "STRONG");
    strong.putArray("blocks").addObject().put("kind", "TEXT").put("text", "strong first");
    ObjectNode standard = question.withArray("hintTiers").addObject();
    standard.put("strength", "STANDARD");
    standard.putArray("blocks").addObject().put("kind", "TEXT").put("text", "standard after");

    assertThatThrownBy(() -> processor.validateForPublication(draft, Set.of()))
        .isInstanceOf(AcademicValidationException.class)
        .satisfies(
            thrown -> {
              AcademicValidationException exception = (AcademicValidationException) thrown;
              assertThat(
                      exception.violations().stream()
                          .anyMatch(
                              v ->
                                  v.path().contains("hintTiers")
                                      && v.path().contains("strength")
                                      && v.code().name().equals("INCOMPATIBLE")))
                  .isTrue();
            });
  }

  private ObjectNode minimalDraft() {
    ObjectNode draft = json.createObjectNode();
    draft.putObject("officialSyllabus").put("subject", "MATHEMATICS");
    UUID outlineId = UUID.randomUUID();
    ObjectNode outline = draft.putArray("outlineItems").addObject();
    outline.put("id", outlineId.toString());
    outline.putNull("parentId");
    outline.put("order", 0);
    UUID objectiveId = UUID.randomUUID();
    ObjectNode objective = draft.putArray("learningObjectives").addObject();
    objective.put("id", objectiveId.toString());
    UUID lessonId = UUID.randomUUID();
    ObjectNode lesson = draft.putArray("resources").addObject();
    lesson.put("id", lessonId.toString());
    lesson.put("kind", "LESSON");
    localized(lesson.putObject("title"), "L", "L", "L");
    lesson.putArray("outlineItemIds").add(outlineId.toString());
    lesson.putArray("objectiveIds").add(objectiveId.toString());
    lesson.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
    ObjectNode rem = draft.withArray("resources").addObject();
    rem.put("id", UUID.randomUUID().toString());
    rem.put("kind", "REMEDIATION");
    localized(rem.putObject("title"), "R", "R", "R");
    rem.putArray("outlineItemIds").add(outlineId.toString());
    rem.putArray("objectiveIds").add(objectiveId.toString());
    rem.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
    ObjectNode term = draft.withArray("resources").addObject();
    term.put("id", UUID.randomUUID().toString());
    term.put("kind", "TERMINOLOGY");
    localized(term.putObject("title"), "T", "T", "T");
    term.putArray("outlineItemIds").add(outlineId.toString());
    term.putArray("objectiveIds").add(objectiveId.toString());
    term.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
    UUID questionId = UUID.randomUUID();
    ObjectNode question = draft.putArray("questions").addObject();
    question.put("id", questionId.toString());
    question.put("examLanguage", "en");
    question.put("difficulty", "STANDARD");
    question.putArray("stem").addObject().put("kind", "TEXT").put("text", "Q?");
    ArrayNode options = question.putArray("options");
    options
        .addObject()
        .put("key", "A")
        .putArray("blocks")
        .addObject()
        .put("kind", "TEXT")
        .put("text", "1");
    options
        .addObject()
        .put("key", "B")
        .putArray("blocks")
        .addObject()
        .put("kind", "TEXT")
        .put("text", "2");
    question.put("correctOptionKey", "A");
    question
        .putArray("explanations")
        .addObject()
        .put("language", "id")
        .putArray("blocks")
        .addObject()
        .put("kind", "TEXT")
        .put("text", "because");
    question.putArray("outlineItemIds").add(outlineId.toString());
    question.putArray("objectiveIds").add(objectiveId.toString());
    ObjectNode hint = question.putArray("hintTiers").addObject();
    hint.put("strength", "STANDARD");
    hint.putArray("blocks").addObject().put("kind", "TEXT").put("text", "hint");
    question.putObject("provenance").put("origin", "YUKCSCA_ORIGINAL");
    draft.putArray("assessmentSets");
    draft.putArray("mocks");
    return draft;
  }

  private static UUID firstQuestionId(ObjectNode draft) {
    return UUID.fromString(draft.path("questions").get(0).path("id").asText());
  }

  private static UUID firstLessonId(ObjectNode draft) {
    for (var resource : draft.path("resources")) {
      if ("LESSON".equals(resource.path("kind").asText())) {
        return UUID.fromString(resource.path("id").asText());
      }
    }
    throw new IllegalStateException("lesson missing");
  }

  private static void localized(ObjectNode node, String id, String en, String zh) {
    node.put("indonesian", id);
    node.put("english", en);
    node.put("simplifiedChinese", zh);
  }
}
