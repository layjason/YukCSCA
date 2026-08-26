package com.yukcsca.academic.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.yukcsca.academic.application.SceneSpecificationValidator.Compiled;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
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
    assertThat(SceneSpecificationValidator.isSafeMathExpression("x^{2}-5x+6=(x-2)(x-3)\\lt 0"))
        .isTrue();
    assertThat(SceneSpecificationValidator.isSafeMathExpression("a < b")).isFalse();
    ObjectNode input = script("id", segment("worked-example-step", "stepLabel", "Langkah 1"));
    ((ObjectNode) input.withArray("segments").get(0).path("params"))
        .put("expression", "\\input{/etc/passwd}");

    assertThat(violations(assertThrowsValidation(input)))
        .contains(
            new AcademicViolation("segments[0].params.expression", AcademicViolationCode.INVALID));
  }

  @Test
  void compilesWorkedExampleUsingLessonInequalityCommands() {
    ObjectNode input = script("en", segment("worked-example-step", "stepLabel", "Quadratic"));
    ((ObjectNode) input.withArray("segments").get(0).path("params"))
        .put("expression", "x^{2}-5x+6=(x-2)(x-3)\\lt 0");
    Compiled compiled = validator.compile(input);
    assertThat(compiled.registryVersion()).isEqualTo(SceneTemplateRegistry.VERSION);
  }

  @Test
  void allowsInlineTexInProseAndRejectsUnsafeCommands() {
    assertThat(SceneSpecificationValidator.isSafeInlineMarkup("union \\(A\\cup B\\) and \\(U\\)"))
        .isTrue();
    Compiled compiled =
        validator.compile(script("en", segment("title-heading", "text", "Vertex \\(x^2\\)")));
    assertThat(compiled.registryVersion()).isEqualTo(SceneTemplateRegistry.VERSION);

    ObjectNode unsafe = script("en", segment("statement-text", "text", "Read \\(\\input{x}\\)"));
    assertThat(violations(assertThrowsValidation(unsafe)))
        .contains(new AcademicViolation("segments[0].params.text", AcademicViolationCode.INVALID));

    ObjectNode angles = script("en", segment("statement-text", "text", "Bad \\(a<b\\)"));
    assertThat(violations(assertThrowsValidation(angles)))
        .contains(new AcademicViolation("segments[0].params.text", AcademicViolationCode.INVALID));
  }

  @Test
  void compilesEachCscaMathActionAndNormalizesEnumTokens() {
    Compiled graph =
        validator.compile(
            script(
                "id",
                segment(
                    "function-graph",
                    json -> {
                      json.put("family", "QUADRATIC");
                      json.put("a", 1);
                      json.put("b", -3);
                      json.put("c", 2);
                      json.put("xMin", -5);
                      json.put("xMax", 5);
                      json.put("keyPoints", "ROOTS");
                    })));
    ArrayNode graphParams = (ArrayNode) json.readTree(graph.segmentsJson());
    assertThat(graphParams.get(0).path("params").path("family").asText()).isEqualTo("QUADRATIC");

    Compiled interval =
        validator.compile(
            script(
                "en",
                segment(
                    "number-line-interval",
                    json -> {
                      json.put("left", -2.5);
                      json.put("right", 7);
                      json.put("leftBound", "OPEN");
                      json.put("rightBound", "CLOSED");
                      json.put("leftInf", "FINITE");
                      json.put("rightInf", "INFINITE");
                    })));
    ArrayNode intervalSegments = (ArrayNode) json.readTree(interval.segmentsJson());
    assertThat(intervalSegments.get(0).path("params").path("rightBound").asText())
        .isEqualTo("CLOSED");

    Compiled sequence =
        validator.compile(
            script(
                "id",
                segment(
                    "sequence-points",
                    json -> {
                      json.put("seqType", "GEOMETRIC");
                      json.put("firstTerm", 3);
                      json.put("ratioOrDiff", -2);
                      json.put("termCount", 6);
                    })));
    ArrayNode sequenceSegments = (ArrayNode) json.readTree(sequence.segmentsJson());
    assertThat(sequenceSegments.get(0).path("params").path("termCount").asInt()).isEqualTo(6);
  }

  @Test
  void rejectsEnumValueOutsideClosedChoiceSet() {
    ObjectNode input = script("id", validFunctionGraph());
    ((ObjectNode) input.withArray("segments").get(0).path("params")).put("family", "TAN");

    List<AcademicViolation> violations = violations(assertThrowsValidation(input));
    assertThat(violations)
        .contains(new AcademicViolation("segments[0].params.family", AcademicViolationCode.INVALID))
        .doesNotContain(
            new AcademicViolation("segments[0].params.keyPoints", AcademicViolationCode.INVALID));
  }

  @Test
  void rejectsEnumNonTextualValue() {
    ObjectNode input = script("id", validNumberLineInterval());
    ((ObjectNode) input.withArray("segments").get(0).path("params")).put("leftBound", 1);

    assertThat(violations(assertThrowsValidation(input)))
        .contains(
            new AcademicViolation("segments[0].params.leftBound", AcademicViolationCode.INVALID));
  }

  @Test
  void requiresLinearCoefficients() {
    ObjectNode input = script("id", validFunctionGraph());
    ((ObjectNode) input.withArray("segments").get(0).path("params")).remove("b");

    assertThat(violations(assertThrowsValidation(input)))
        .contains(new AcademicViolation("segments[0].params.b", AcademicViolationCode.REQUIRED));
  }

  @Test
  void requiresTrigonometricCoefficients() {
    ObjectNode input = script("id", validFunctionGraph());
    ObjectNode params = (ObjectNode) input.withArray("segments").get(0).path("params");
    params.put("family", "SIN");

    List<AcademicViolation> violations = violations(assertThrowsValidation(input));
    assertThat(violations)
        .contains(
            new AcademicViolation("segments[0].params.c", AcademicViolationCode.REQUIRED),
            new AcademicViolation("segments[0].params.d", AcademicViolationCode.REQUIRED))
        .doesNotContain(
            new AcademicViolation("segments[0].params.b", AcademicViolationCode.REQUIRED));
  }

  @Test
  void requiresCosineCoefficientWhenSwitchingFamily() {
    ObjectNode input = script("id", validFunctionGraph());
    ObjectNode params = (ObjectNode) input.withArray("segments").get(0).path("params");
    params.put("family", "COS");
    params.put("c", 1);

    List<AcademicViolation> violations = violations(assertThrowsValidation(input));
    assertThat(violations)
        .contains(new AcademicViolation("segments[0].params.d", AcademicViolationCode.REQUIRED));
  }

  @Test
  void requiresPowerExponentWithoutIrrelevantCoefficients() {
    ObjectNode input = script("id", validFunctionGraph());
    ObjectNode params = (ObjectNode) input.withArray("segments").get(0).path("params");
    params.put("family", "POWER");

    List<AcademicViolation> violations = violations(assertThrowsValidation(input));
    assertThat(violations)
        .contains(new AcademicViolation("segments[0].params.n", AcademicViolationCode.REQUIRED))
        .doesNotContain(
            new AcademicViolation("segments[0].params.a", AcademicViolationCode.REQUIRED),
            new AcademicViolation("segments[0].params.b", AcademicViolationCode.REQUIRED),
            new AcademicViolation("segments[0].params.c", AcademicViolationCode.REQUIRED));
  }

  /**
   * {@code a} is descriptor-required for all families; the semantic table must not duplicate the
   * violation, so exactly one REQUIRED is reported per family.
   */
  @Test
  void requiresCoefficientAExactlyOnceForEveryFamily() {
    for (String family : List.of("LINEAR", "QUADRATIC", "POWER", "EXP", "LOG", "SIN", "COS")) {
      ObjectNode input = script("id", validFunctionGraph());
      ObjectNode params = (ObjectNode) input.withArray("segments").get(0).path("params");
      params.put("family", family);
      params.put("c", 1);
      params.put("d", 1);
      params.put("n", 1);
      params.put("r", 2);
      params.put("base", 2);
      params.remove("a");

      assertThat(violations(assertThrowsValidation(input)))
          .containsExactly(
              new AcademicViolation("segments[0].params.a", AcademicViolationCode.REQUIRED));
    }
  }

  @Test
  void requiresQuadraticConstantTerm() {
    ObjectNode input = script("id", validFunctionGraph());
    ObjectNode params = (ObjectNode) input.withArray("segments").get(0).path("params");
    params.put("family", "QUADRATIC");

    List<AcademicViolation> violations = violations(assertThrowsValidation(input));
    assertThat(violations)
        .contains(new AcademicViolation("segments[0].params.c", AcademicViolationCode.REQUIRED))
        .doesNotContain(
            new AcademicViolation("segments[0].params.a", AcademicViolationCode.REQUIRED),
            new AcademicViolation("segments[0].params.b", AcademicViolationCode.REQUIRED));
  }

  @Test
  void boundsExponentialRatioToPositiveNonOne() {
    for (double invalid : new double[] {0, -1.5, 1}) {
      ObjectNode input = script("id", validFunctionGraph());
      ObjectNode params = (ObjectNode) input.withArray("segments").get(0).path("params");
      params.put("family", "EXP");
      params.put("r", invalid);

      List<AcademicViolation> violations = violations(assertThrowsValidation(input));
      assertThat(violations)
          .contains(
              new AcademicViolation("segments[0].params.r", AcademicViolationCode.OUT_OF_RANGE));
    }
  }

  @Test
  void boundsLogarithmBaseToPositiveNonOne() {
    for (double invalid : new double[] {1, -3, 0}) {
      ObjectNode input = script("id", validFunctionGraph());
      ObjectNode params = (ObjectNode) input.withArray("segments").get(0).path("params");
      params.put("family", "LOG");
      params.put("base", invalid);

      List<AcademicViolation> violations = violations(assertThrowsValidation(input));
      assertThat(violations)
          .contains(
              new AcademicViolation("segments[0].params.base", AcademicViolationCode.OUT_OF_RANGE));
    }
  }

  @Test
  void rejectsInvertedXAxisBounds() {
    ObjectNode input = script("id", validFunctionGraph());
    ObjectNode params = (ObjectNode) input.withArray("segments").get(0).path("params");
    params.put("xMin", 4);
    params.put("xMax", -4);

    assertThat(violations(assertThrowsValidation(input)))
        .contains(new AcademicViolation("segments[0].params.xMax", AcademicViolationCode.INVALID));
  }

  @Test
  void rejectsFiniteIntervalWithLeftPastRight() {
    ObjectNode input = script("id", validNumberLineInterval());
    ObjectNode params = (ObjectNode) input.withArray("segments").get(0).path("params");
    params.put("rightInf", "FINITE");
    params.put("left", 5);
    params.put("right", 5);

    assertThat(violations(assertThrowsValidation(input)))
        .contains(new AcademicViolation("segments[0].params.right", AcademicViolationCode.INVALID));
  }

  @Test
  void allowsEqualEndpointsWhenAnEndIsInfinite() {
    ObjectNode input = script("id", validNumberLineInterval());
    ObjectNode params = (ObjectNode) input.withArray("segments").get(0).path("params");
    params.put("leftInf", "INFINITE");
    params.put("left", 5);
    params.put("right", 5);
    validator.compile(input);
  }

  @Test
  void allowsOmittedLeftBoundWhenLeftEndIsInfinite() {
    // D-10 display rules prune leftBound on an infinite end; the UI-saved shape must compile.
    ObjectNode input =
        script(
            "en",
            segment(
                "number-line-interval",
                json -> {
                  json.put("left", -2);
                  json.put("right", 3);
                  json.put("rightBound", "CLOSED");
                  json.put("leftInf", "INFINITE");
                  json.put("rightInf", "FINITE");
                }));

    Compiled compiled = validator.compile(input);

    ArrayNode segments = (ArrayNode) json.readTree(compiled.segmentsJson());
    assertThat(segments.get(0).path("params").path("leftBound").isMissingNode()).isTrue();
  }

  @Test
  void requiresLeftBoundOnlyWhenLeftEndIsFinite() {
    ObjectNode input = script("id", validNumberLineInterval());
    ((ObjectNode) input.withArray("segments").get(0).path("params")).remove("leftBound");

    assertThat(violations(assertThrowsValidation(input)))
        .containsExactly(
            new AcademicViolation("segments[0].params.leftBound", AcademicViolationCode.REQUIRED));
  }

  @Test
  void allowsOmittedRightBoundWhenRightEndIsInfinite() {
    ObjectNode input =
        script(
            "id",
            segment(
                "number-line-interval",
                json -> {
                  json.put("left", -3);
                  json.put("right", 8);
                  json.put("leftBound", "OPEN");
                  json.put("leftInf", "FINITE");
                  json.put("rightInf", "INFINITE");
                }));
    validator.compile(input);
  }

  @Test
  void requiresRightBoundOnlyWhenRightEndIsFinite() {
    ObjectNode input = script("id", validNumberLineInterval());
    ((ObjectNode) input.withArray("segments").get(0).path("params")).remove("rightBound");

    assertThat(violations(assertThrowsValidation(input)))
        .containsExactly(
            new AcademicViolation("segments[0].params.rightBound", AcademicViolationCode.REQUIRED));
  }

  @Test
  void boundsGeometricRatioMagnitude() {
    ObjectNode input =
        script(
            "id",
            segment(
                "sequence-points",
                params -> {
                  params.put("seqType", "GEOMETRIC");
                  params.put("firstTerm", 2);
                  params.put("ratioOrDiff", -11);
                  params.put("termCount", 4);
                }));

    List<AcademicViolation> violations = violations(assertThrowsValidation(input));
    assertThat(violations)
        .contains(
            new AcademicViolation(
                "segments[0].params.ratioOrDiff", AcademicViolationCode.OUT_OF_RANGE));
  }

  @Test
  void allowsArithmeticDifferenceBeyondGeometricBound() {
    ObjectNode input =
        script(
            "id",
            segment(
                "sequence-points",
                params -> {
                  params.put("seqType", "ARITHMETIC");
                  params.put("firstTerm", -20);
                  params.put("ratioOrDiff", 11);
                  params.put("termCount", 15);
                }));
    validator.compile(input);
  }

  private ObjectNode validNumberLineUnion() {
    return segment(
        "number-line-union",
        params -> {
          ArrayNode scopeArray = params.putArray("scopes");
          ObjectNode first = scopeArray.addObject();
          first.put("leftInf", "INFINITE");
          first.put("right", 2);
          first.put("rightBound", "CLOSED");
          first.put("rightInf", "FINITE");
          ObjectNode second = scopeArray.addObject();
          second.put("left", 5);
          second.put("leftBound", "OPEN");
          second.put("leftInf", "FINITE");
          second.put("rightInf", "INFINITE");
        });
  }

  @Test
  void compilesMultiScopeUnionAndStampsRegistryVersion() {
    Compiled compiled = validator.compile(script("id", validNumberLineUnion()));

    assertThat(compiled.registryVersion()).isEqualTo(SceneTemplateRegistry.VERSION);
    JsonNode storedScopes =
        json.readTree(compiled.segmentsJson()).get(0).path("params").path("scopes");
    assertThat(storedScopes.isArray()).isTrue();
    assertThat(storedScopes.size()).isEqualTo(2);
    assertThat(storedScopes.get(0).path("rightBound").asText()).isEqualTo("CLOSED");
  }

  @Test
  void requiresUnionBoundOnEachFiniteEndWithSubItemPath() {
    ObjectNode input = script("id", validNumberLineUnion());
    ((ObjectNode) input.withArray("segments").get(0).path("params").path("scopes").get(1))
        .remove("leftBound");

    List<AcademicViolation> violations = violations(assertThrowsValidation(input));

    // The extended grammar names the offending array item: params.scopes[j].<field>.
    assertThat(violations)
        .containsExactly(
            new AcademicViolation(
                "segments[0].params.scopes[1].leftBound", AcademicViolationCode.REQUIRED));
  }

  @Test
  void rejectsBooleanScopeEndpointValue() {
    ObjectNode input = script("id", validNumberLineUnion());
    ((ObjectNode) input.withArray("segments").get(0).path("params").path("scopes").get(1))
        .put("left", true);

    assertThat(violations(assertThrowsValidation(input)))
        .containsExactly(
            new AcademicViolation(
                "segments[0].params.scopes[1].left", AcademicViolationCode.INVALID));
  }

  @Test
  void rejectsFiniteUnionScopeWithLeftPastRightOnThatScope() {
    ObjectNode input = script("id", validNumberLineUnion());
    ObjectNode firstScope =
        (ObjectNode) input.withArray("segments").get(0).path("params").path("scopes").get(0);
    firstScope.put("leftInf", "FINITE");
    firstScope.put("left", 3);
    firstScope.put("right", 3);
    firstScope.put("leftBound", "OPEN");

    assertThat(violations(assertThrowsValidation(input)))
        .contains(
            new AcademicViolation(
                "segments[0].params.scopes[0].right", AcademicViolationCode.INVALID))
        .doesNotContain(
            new AcademicViolation("segments[0].params.right", AcademicViolationCode.INVALID));
  }

  @Test
  void boundsUnionEndpointValuesPerScope() {
    ObjectNode input = script("id", validNumberLineUnion());
    ((ObjectNode) input.withArray("segments").get(0).path("params").path("scopes").get(1))
        .put("left", 100.5);

    assertThat(violations(assertThrowsValidation(input)))
        .containsExactly(
            new AcademicViolation(
                "segments[0].params.scopes[1].left", AcademicViolationCode.OUT_OF_RANGE));
  }

  @Test
  void boundsUnionScopeCount() {
    ObjectNode input = script("id", validNumberLineUnion());
    ArrayNode scopes = (ArrayNode) input.withArray("segments").get(0).path("params").path("scopes");
    for (int extra = 0; extra < 3; extra++) {
      ObjectNode scope = scopes.addObject();
      scope.put("left", -10);
      scope.put("leftBound", "CLOSED");
      scope.put("leftInf", "FINITE");
      scope.put("right", 10);
      scope.put("rightBound", "CLOSED");
      scope.put("rightInf", "FINITE");
    }

    assertThat(violations(assertThrowsValidation(input)))
        .containsExactly(
            new AcademicViolation("segments[0].params.scopes", AcademicViolationCode.OUT_OF_RANGE));
  }

  @Test
  void rejectsUnknownUnionScopeFieldWithSubFieldPath() {
    ObjectNode input = script("id", validNumberLineUnion());
    ((ObjectNode) input.withArray("segments").get(0).path("params").path("scopes").get(0))
        .put("middle", 0);

    List<AcademicViolation> violations = violations(assertThrowsValidation(input));

    assertThat(violations)
        .contains(
            new AcademicViolation(
                "segments[0].params.scopes[0].middle", AcademicViolationCode.UNSUPPORTED));
    assertThat(violations).hasSize(1);
  }

  @Test
  void rejectsNonObjectUnionScopeItem() {
    ObjectNode input = script("id", validNumberLineUnion());
    ArrayNode scopes = (ArrayNode) input.withArray("segments").get(0).path("params").path("scopes");
    scopes.insert(0, "not-an-object");

    assertThat(violations(assertThrowsValidation(input)))
        .contains(
            new AcademicViolation("segments[0].params.scopes[0]", AcademicViolationCode.INVALID));
  }

  @Test
  void requiresScopesAsAnArrayOfOneToFourItems() {
    ObjectNode notArray =
        script("id", segment("number-line-union", params -> params.putNull("scopes")));
    assertThat(violations(assertThrowsValidation(notArray)))
        .contains(
            new AcademicViolation("segments[0].params.scopes", AcademicViolationCode.REQUIRED));

    ObjectNode empty =
        script("id", segment("number-line-union", params -> params.putArray("scopes")));
    assertThat(violations(assertThrowsValidation(empty)))
        .contains(
            new AcademicViolation("segments[0].params.scopes", AcademicViolationCode.OUT_OF_RANGE));

    ObjectNode wrongKind =
        script("id", segment("number-line-union", params -> params.put("scopes", "(-inf,2]")));
    assertThat(violations(assertThrowsValidation(wrongKind)))
        .contains(
            new AcademicViolation("segments[0].params.scopes", AcademicViolationCode.INVALID));
  }

  private ObjectNode validFunctionGraph() {
    return segment(
        "function-graph",
        params -> {
          params.put("family", "LINEAR");
          params.put("a", 2);
          params.put("b", -1);
          params.put("xMin", -10);
          params.put("xMax", 10);
          params.put("keyPoints", "NONE");
        });
  }

  private ObjectNode validNumberLineInterval() {
    return segment(
        "number-line-interval",
        params -> {
          params.put("left", -3);
          params.put("right", 8);
          params.put("leftBound", "OPEN");
          params.put("rightBound", "CLOSED");
          params.put("leftInf", "FINITE");
          params.put("rightInf", "FINITE");
        });
  }

  private ObjectNode segment(String actionId, java.util.function.Consumer<ObjectNode> params) {
    ObjectNode segment = json.createObjectNode();
    segment.put("templateActionId", actionId);
    ObjectNode paramObject = segment.putObject("params");
    params.accept(paramObject);
    segment.put("narrationText", "Narasi pembuka.");
    return segment;
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
