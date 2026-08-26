package com.yukcsca.academic.application;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Reviewed render-template registry for scene specifications. Data-only descriptors; no template
 * content is executable. The version is append-only history recorded in {@code
 * scene_template_registry_version} (seeded by Flyway) and mirrored by the isolated Python render
 * worker, which must ship the identical version and action set before it claims RENDER_SCENE jobs.
 */
public final class SceneTemplateRegistry {
  public static final String VERSION = "2026-08.4";

  /**
   * The pilot library: worked-example steps and concept/definition introduction, plus the shared
   * framing actions every script uses, and the CSCA Math graph/interval templates (follow-on
   * decisions D-06..D-12). {@code sequence-points} was removed by D-11.
   */
  public static final List<SceneTemplateAction> ACTIONS =
      List.of(
          new SceneTemplateAction(
              "title-heading",
              "Title heading",
              List.of(
                  new SceneTemplateParamDescriptor(
                      "text",
                      ParamKind.STRING,
                      "Heading text",
                      true,
                      null,
                      null,
                      120,
                      null,
                      null))),
          new SceneTemplateAction(
              "concept-definition",
              "Concept definition",
              List.of(
                  new SceneTemplateParamDescriptor(
                      "term", ParamKind.STRING, "Term", true, null, null, 80, null, null),
                  new SceneTemplateParamDescriptor(
                      "definition",
                      ParamKind.MULTILINE_TEXT,
                      "Definition",
                      true,
                      null,
                      null,
                      400,
                      null,
                      null))),
          new SceneTemplateAction(
              "statement-text",
              "Statement text",
              List.of(
                  new SceneTemplateParamDescriptor(
                      "text",
                      ParamKind.MULTILINE_TEXT,
                      "Statement",
                      true,
                      null,
                      null,
                      300,
                      null,
                      null))),
          new SceneTemplateAction(
              "worked-example-step",
              "Worked example step",
              List.of(
                  new SceneTemplateParamDescriptor(
                      "stepLabel",
                      ParamKind.STRING,
                      "Step label",
                      true,
                      null,
                      null,
                      40,
                      null,
                      null),
                  new SceneTemplateParamDescriptor(
                      "expression",
                      ParamKind.MATH_EXPRESSION,
                      "Step expression",
                      true,
                      null,
                      null,
                      400,
                      null,
                      null))),
          new SceneTemplateAction(
              "highlight-box",
              "Highlighted key point",
              List.of(
                  new SceneTemplateParamDescriptor(
                      "text",
                      ParamKind.MULTILINE_TEXT,
                      "Key point",
                      true,
                      null,
                      null,
                      300,
                      null,
                      null))),
          new SceneTemplateAction(
              "function-graph",
              "Function graph",
              List.of(
                  new SceneTemplateParamDescriptor(
                      "family",
                      ParamKind.ENUM,
                      "Curve family",
                      true,
                      null,
                      null,
                      null,
                      List.of("LINEAR", "QUADRATIC", "POWER", "EXP", "LOG", "SIN", "COS"),
                      null),
                  new SceneTemplateParamDescriptor(
                      "a", ParamKind.DECIMAL, "Coefficient a", true, null, null, null, null, null),
                  new SceneTemplateParamDescriptor(
                      "b",
                      ParamKind.DECIMAL,
                      "Coefficient b",
                      false,
                      null,
                      null,
                      null,
                      null,
                      new SceneTemplateParamVisibility(
                          "family", List.of("LINEAR", "QUADRATIC", "SIN", "COS"))),
                  new SceneTemplateParamDescriptor(
                      "c",
                      ParamKind.DECIMAL,
                      "Coefficient c",
                      false,
                      null,
                      null,
                      null,
                      null,
                      new SceneTemplateParamVisibility(
                          "family", List.of("QUADRATIC", "SIN", "COS"))),
                  new SceneTemplateParamDescriptor(
                      "d",
                      ParamKind.DECIMAL,
                      "Coefficient d",
                      false,
                      null,
                      null,
                      null,
                      null,
                      new SceneTemplateParamVisibility("family", List.of("SIN", "COS"))),
                  new SceneTemplateParamDescriptor(
                      "n",
                      ParamKind.DECIMAL,
                      "Exponent n",
                      false,
                      null,
                      null,
                      null,
                      null,
                      new SceneTemplateParamVisibility("family", List.of("POWER"))),
                  new SceneTemplateParamDescriptor(
                      "r",
                      ParamKind.DECIMAL,
                      "Ratio r",
                      false,
                      null,
                      null,
                      null,
                      null,
                      new SceneTemplateParamVisibility("family", List.of("EXP"))),
                  new SceneTemplateParamDescriptor(
                      "base",
                      ParamKind.DECIMAL,
                      "Logarithm base",
                      false,
                      null,
                      null,
                      null,
                      null,
                      new SceneTemplateParamVisibility("family", List.of("LOG"))),
                  new SceneTemplateParamDescriptor(
                      "xMin",
                      ParamKind.DECIMAL,
                      "X axis minimum",
                      true,
                      -100.0,
                      100.0,
                      null,
                      null,
                      null),
                  new SceneTemplateParamDescriptor(
                      "xMax",
                      ParamKind.DECIMAL,
                      "X axis maximum",
                      true,
                      -100.0,
                      100.0,
                      null,
                      null,
                      null),
                  new SceneTemplateParamDescriptor(
                      "yMin",
                      ParamKind.DECIMAL,
                      "Y axis minimum",
                      false,
                      -100.0,
                      100.0,
                      null,
                      null,
                      null),
                  new SceneTemplateParamDescriptor(
                      "yMax",
                      ParamKind.DECIMAL,
                      "Y axis maximum",
                      false,
                      -100.0,
                      100.0,
                      null,
                      null,
                      null),
                  new SceneTemplateParamDescriptor(
                      "keyPoints",
                      ParamKind.ENUM,
                      "Key points",
                      true,
                      null,
                      null,
                      null,
                      List.of("NONE", "ROOTS", "EXTREMA", "BOTH"),
                      null),
                  new SceneTemplateParamDescriptor(
                      "caption",
                      ParamKind.MATH_EXPRESSION,
                      "Caption",
                      false,
                      null,
                      null,
                      120,
                      null,
                      null))),
          new SceneTemplateAction(
              "number-line-interval",
              "Number line interval",
              List.of(
                  new SceneTemplateParamDescriptor(
                      "leftInf",
                      ParamKind.ENUM,
                      "Left end type",
                      true,
                      null,
                      null,
                      null,
                      List.of("FINITE", "INFINITE"),
                      null),
                  new SceneTemplateParamDescriptor(
                      "left",
                      ParamKind.DECIMAL,
                      "Left endpoint",
                      false,
                      -100.0,
                      100.0,
                      null,
                      null,
                      new SceneTemplateParamVisibility("leftInf", List.of("FINITE"))),
                  new SceneTemplateParamDescriptor(
                      "leftBound",
                      ParamKind.ENUM,
                      "Left bound type",
                      false,
                      null,
                      null,
                      null,
                      List.of("OPEN", "CLOSED"),
                      new SceneTemplateParamVisibility("leftInf", List.of("FINITE"))),
                  new SceneTemplateParamDescriptor(
                      "rightInf",
                      ParamKind.ENUM,
                      "Right end type",
                      true,
                      null,
                      null,
                      null,
                      List.of("FINITE", "INFINITE"),
                      null),
                  new SceneTemplateParamDescriptor(
                      "right",
                      ParamKind.DECIMAL,
                      "Right endpoint",
                      false,
                      -100.0,
                      100.0,
                      null,
                      null,
                      new SceneTemplateParamVisibility("rightInf", List.of("FINITE"))),
                  new SceneTemplateParamDescriptor(
                      "rightBound",
                      ParamKind.ENUM,
                      "Right bound type",
                      false,
                      null,
                      null,
                      null,
                      List.of("OPEN", "CLOSED"),
                      new SceneTemplateParamVisibility("rightInf", List.of("FINITE"))),
                  new SceneTemplateParamDescriptor(
                      "setLabel",
                      ParamKind.MATH_EXPRESSION,
                      "Set label",
                      false,
                      null,
                      null,
                      80,
                      null,
                      null))),
          new SceneTemplateAction(
              "number-line-union",
              "Number line union",
              List.of(
                  new SceneTemplateParamDescriptor(
                      "scopes",
                      ParamKind.INTERVAL_SET,
                      "Interval scopes",
                      true,
                      null,
                      null,
                      null,
                      null,
                      null),
                  new SceneTemplateParamDescriptor(
                      "setLabel",
                      ParamKind.MATH_EXPRESSION,
                      "Set label",
                      false,
                      null,
                      null,
                      80,
                      null,
                      null))));

  private static final Map<String, SceneTemplateAction> BY_ID =
      ACTIONS.stream()
          .collect(Collectors.toUnmodifiableMap(SceneTemplateAction::id, Function.identity()));

  private SceneTemplateRegistry() {}

  public static SceneTemplateAction action(String id) {
    return BY_ID.get(id);
  }

  public enum ParamKind {
    STRING,
    MULTILINE_TEXT,
    INTEGER,
    DECIMAL,
    MATH_EXPRESSION,
    ENUM,

    /**
     * Bounded JSON-array composite of one to four interval scopes ({@code number-line-union}); the
     * member schema is fixed by this kind and enforced by {@code SceneSpecificationValidator}, so
     * no descriptor-level {@code min}/{@code max}/{@code choices} metadata applies.
     */
    INTERVAL_SET
  }

  /**
   * @param choices closed value set for {@link ParamKind#ENUM} only; null/empty for every other
   *     kind. Tokens are uppercase alphanumeric/underscore identifiers, mirroring the TypeSpec
   *     {@code SceneTemplateParamChoice} pattern.
   * @param visibleWhen data-only display rule (TypeSpec {@code SceneTemplateParamVisibility});
   *     presentation-only metadata for the script editor — validation semantics never depend on it,
   *     and null means the parameter is always shown.
   */
  public record SceneTemplateParamDescriptor(
      String id,
      ParamKind kind,
      String label,
      boolean required,
      Double min,
      Double max,
      Integer maxLength,
      List<String> choices,
      SceneTemplateParamVisibility visibleWhen) {}

  /**
   * Data-only display rule mirroring the TypeSpec model of the same name: the owning parameter is
   * collected only while the observed ENUM-kind parameter holds one of {@code choices}.
   * Presentation-only; server-side validation semantics are unchanged.
   */
  public record SceneTemplateParamVisibility(String paramId, List<String> choices) {}

  public record SceneTemplateAction(
      String id, String displayName, List<SceneTemplateParamDescriptor> params) {}
}
