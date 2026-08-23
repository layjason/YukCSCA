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
  public static final String VERSION = "2026-08.1";

  /**
   * The pilot library: worked-example steps and concept/definition introduction, plus the shared
   * framing actions every script uses.
   */
  public static final List<SceneTemplateAction> ACTIONS =
      List.of(
          new SceneTemplateAction(
              "title-heading",
              "Title heading",
              List.of(
                  new SceneTemplateParamDescriptor(
                      "text", ParamKind.STRING, "Heading text", true, null, null, 120))),
          new SceneTemplateAction(
              "concept-definition",
              "Concept definition",
              List.of(
                  new SceneTemplateParamDescriptor(
                      "term", ParamKind.STRING, "Term", true, null, null, 80),
                  new SceneTemplateParamDescriptor(
                      "definition",
                      ParamKind.MULTILINE_TEXT,
                      "Definition",
                      true,
                      null,
                      null,
                      400))),
          new SceneTemplateAction(
              "statement-text",
              "Statement text",
              List.of(
                  new SceneTemplateParamDescriptor(
                      "text", ParamKind.MULTILINE_TEXT, "Statement", true, null, null, 300))),
          new SceneTemplateAction(
              "worked-example-step",
              "Worked example step",
              List.of(
                  new SceneTemplateParamDescriptor(
                      "stepLabel", ParamKind.STRING, "Step label", true, null, null, 40),
                  new SceneTemplateParamDescriptor(
                      "expression",
                      ParamKind.MATH_EXPRESSION,
                      "Step expression",
                      true,
                      null,
                      null,
                      400))),
          new SceneTemplateAction(
              "highlight-box",
              "Highlighted key point",
              List.of(
                  new SceneTemplateParamDescriptor(
                      "text", ParamKind.MULTILINE_TEXT, "Key point", true, null, null, 300))));

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
    MATH_EXPRESSION
  }

  public record SceneTemplateParamDescriptor(
      String id,
      ParamKind kind,
      String label,
      boolean required,
      Double min,
      Double max,
      Integer maxLength) {}

  public record SceneTemplateAction(
      String id, String displayName, List<SceneTemplateParamDescriptor> params) {}
}
