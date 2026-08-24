package com.yukcsca.academic.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.yukcsca.academic.application.SceneSpecificationValidator.Compiled;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** Scene-specification compilation tests: path grammar and per-segment violations (AC-02/AC-03). */
class SceneSpecificationValidatorTest {
  private final JsonMapper json = JsonMapper.builder().build();
  private final SceneSpecificationValidator validator = new SceneSpecificationValidator(json);

  @Test
  void compilesValidScriptAndStampsRegistryVersion() {
    Compiled compiled = validator.compile(script("id", segment("title-heading", "text", "Judul")));

    assertThat(compiled.explanationLanguage()).isEqualTo("id");
    assertThat(compiled.registryVersion()).isEqualTo(SceneTemplateRegistry.VERSION);
    ArrayNode segments = (ArrayNode) json.readTree(compiled.segmentsJson());
    assertThat(segments.size()).isEqualTo(1);
    assertThat(segments.get(0).path("params").path("text").asText()).isEqualTo("Judul");
  }

  @Test
  void rejectsUnsupportedLanguageAtCollectionLevel() {
    assertThatThrownBy(() -> validator.compile(script("fr", segment("title-heading", "text", "x"))))
        .isInstanceOf(AcademicValidationException.class)
        .satisfies(
            exception ->
                assertThat(violations(exception))
                    .contains(
                        new AcademicViolation(
                            "explanationLanguage", AcademicViolationCode.UNSUPPORTED)));
  }

  @Test
  void rejectsEmptySegments() {
    ObjectNode input = json.createObjectNode();
    input.put("explanationLanguage", "id");
    input.putArray("segments");
    assertThatThrownBy(() -> validator.compile(input))
        .isInstanceOf(AcademicValidationException.class)
        .satisfies(
            exception ->
                assertThat(violations(exception))
                    .contains(
                        new AcademicViolation("segments", AcademicViolationCode.OUT_OF_RANGE)));
  }

  @Test
  void identifiesOffendingSegmentActionParamAndNarration() {
    ObjectNode input = script("id", segment("no-such-action", "text", "x"));
    input.withArray("segments").addObject().put("templateActionId", "title-heading");
    input.withArray("segments").addObject();

    List<AcademicViolation> violations = violations(assertThrowsValidation(input));

    assertThat(violations)
        .contains(
            new AcademicViolation(
                "segments[0].templateActionId", AcademicViolationCode.UNSUPPORTED),
            new AcademicViolation("segments[1].narrationText", AcademicViolationCode.REQUIRED),
            new AcademicViolation("segments[1].params", AcademicViolationCode.REQUIRED),
            new AcademicViolation("segments[2].templateActionId", AcademicViolationCode.REQUIRED),
            new AcademicViolation("segments[2].narrationText", AcademicViolationCode.REQUIRED));
  }

  @Test
  void validatesParamsAgainstDescriptors() {
    ObjectNode input = script("en", segment("worked-example-step", "stepLabel", "S".repeat(41)));
    ObjectNode params = (ObjectNode) input.withArray("segments").get(0).path("params");
    params.put("expression", "x^2");
    params.put("unknown", 1);

    List<AcademicViolation> violations = violations(assertThrowsValidation(input));
    assertThat(violations)
        .contains(
            new AcademicViolation(
                "segments[0].params.stepLabel", AcademicViolationCode.OUT_OF_RANGE),
            new AcademicViolation("segments[0].params.unknown", AcademicViolationCode.UNSUPPORTED));
  }

  @Test
  void boundsNarrationLength() {
    ObjectNode input = script("id", segment("title-heading", "text", "ok"));
    ((ObjectNode) input.withArray("segments").get(0)).put("narrationText", "a".repeat(601));
    List<AcademicViolation> violations = violations(assertThrowsValidation(input));
    assertThat(violations)
        .contains(
            new AcademicViolation("segments[0].narrationText", AcademicViolationCode.OUT_OF_RANGE));
  }

  @Test
  void rejectsTexFileInputPrimitivesButAllowsReviewedMathCommands() {
    assertThat(SceneSpecificationValidator.isSafeMathExpression("x = \\frac{-b}{2a}")).isTrue();
    ObjectNode input = script("id", segment("worked-example-step", "stepLabel", "Langkah 1"));
    ((ObjectNode) input.withArray("segments").get(0).path("params"))
        .put("expression", "\\input{/etc/passwd}");

    assertThat(violations(assertThrowsValidation(input)))
        .contains(
            new AcademicViolation("segments[0].params.expression", AcademicViolationCode.INVALID));
  }

  private AcademicValidationException assertThrowsValidation(ObjectNode input) {
    try {
      validator.compile(input);
      throw new AssertionError("expected AcademicValidationException");
    } catch (AcademicValidationException exception) {
      return exception;
    }
  }

  private static List<AcademicViolation> violations(Throwable exception) {
    return ((AcademicValidationException) exception).violations();
  }

  private ObjectNode script(String language, ObjectNode segment) {
    ObjectNode input = json.createObjectNode();
    input.put("explanationLanguage", language);
    input.withArray("segments").add(segment);
    return input;
  }

  private ObjectNode segment(String actionId, String paramId, String paramValue) {
    ObjectNode segment = json.createObjectNode();
    segment.put("templateActionId", actionId);
    segment.putObject("params").put(paramId, paramValue);
    segment.put("narrationText", "Narasi pembuka.");
    return segment;
  }
}
