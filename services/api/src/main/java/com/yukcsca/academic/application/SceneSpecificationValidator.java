package com.yukcsca.academic.application;

import com.yukcsca.academic.application.SceneTemplateRegistry.ParamKind;
import com.yukcsca.academic.application.SceneTemplateRegistry.SceneTemplateAction;
import com.yukcsca.academic.application.SceneTemplateRegistry.SceneTemplateParamDescriptor;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Compiles and validates an admin script into a stored scene specification against the reviewed
 * template registry. Violation paths follow the documented grammar: {@code segments[i]}, {@code
 * segments[i].templateActionId}, {@code segments[i].params.<paramId>}, {@code
 * segments[i].narrationText}, plus collection-level {@code segments} and {@code
 * explanationLanguage}. The Python render worker re-validates the same rules before rendering.
 */
@Component
public class SceneSpecificationValidator {
  static final int MAX_SEGMENTS = 60;
  static final int MAX_NARRATION_LENGTH = 600;
  static final int MAX_PARAM_KEYS = 16;
  private static final Set<String> EXPLANATION_LANGUAGES = Set.of("id", "en", "zh-CN");
  private static final String TEMPLATE_ACTION_PATTERN = "^[a-z0-9][a-z0-9-]{0,63}$";

  private final JsonMapper json;

  public SceneSpecificationValidator(JsonMapper json) {
    this.json = json;
  }

  public record Compiled(String explanationLanguage, String registryVersion, String segmentsJson) {}

  /**
   * Validates and normalizes; throws {@link AcademicValidationException} with per-segment paths.
   */
  public Compiled compile(JsonNode input) {
    List<AcademicViolation> violations = new ArrayList<>();
    String language = input.path("explanationLanguage").asText(null);
    if (language == null || !EXPLANATION_LANGUAGES.contains(language)) {
      violations.add(
          new AcademicViolation("explanationLanguage", AcademicViolationCode.UNSUPPORTED));
      language = null;
    }
    JsonNode segmentsNode = input.path("segments");
    if (!segmentsNode.isArray() || segmentsNode.isEmpty() || segmentsNode.size() > MAX_SEGMENTS) {
      violations.add(new AcademicViolation("segments", AcademicViolationCode.OUT_OF_RANGE));
    }
    ArrayNode normalized = json.createArrayNode();
    if (segmentsNode.isArray()) {
      for (int index = 0; index < segmentsNode.size(); index++) {
        ObjectNode segment = validateSegment(segmentsNode.get(index), index, violations);
        if (segment != null) normalized.add(segment);
      }
    }
    if (!violations.isEmpty()) throw new AcademicValidationException(violations);
    return new Compiled(
        language, SceneTemplateRegistry.VERSION, json.writeValueAsString(normalized));
  }

  private ObjectNode validateSegment(
      JsonNode segment, int index, List<AcademicViolation> violations) {
    String basePath = "segments[" + index + "]";
    if (!segment.isObject()) {
      violations.add(new AcademicViolation(basePath, AcademicViolationCode.INVALID));
      return null;
    }
    String actionId = segment.path("templateActionId").asText(null);
    SceneTemplateAction action = null;
    if (actionId == null || actionId.isBlank()) {
      violations.add(
          new AcademicViolation(basePath + ".templateActionId", AcademicViolationCode.REQUIRED));
    } else if (!actionId.matches(TEMPLATE_ACTION_PATTERN)) {
      violations.add(
          new AcademicViolation(basePath + ".templateActionId", AcademicViolationCode.INVALID));
    } else if ((action = SceneTemplateRegistry.action(actionId)) == null) {
      violations.add(
          new AcademicViolation(basePath + ".templateActionId", AcademicViolationCode.UNSUPPORTED));
    }

    String narration = segment.path("narrationText").asText(null);
    if (narration == null || narration.isBlank()) {
      violations.add(
          new AcademicViolation(basePath + ".narrationText", AcademicViolationCode.REQUIRED));
    } else if (narration.length() > MAX_NARRATION_LENGTH) {
      violations.add(
          new AcademicViolation(basePath + ".narrationText", AcademicViolationCode.OUT_OF_RANGE));
    }

    ObjectNode params = validateParams(segment.path("params"), action, basePath, violations);

    if (action == null || narration == null || narration.isBlank()) return null;
    ObjectNode normalized = json.createObjectNode();
    normalized.put("templateActionId", actionId);
    normalized.set("params", params);
    normalized.put("narrationText", narration);
    return normalized;
  }

  private ObjectNode validateParams(
      JsonNode params,
      SceneTemplateAction action,
      String basePath,
      List<AcademicViolation> violations) {
    ObjectNode normalized = json.createObjectNode();
    if (action == null) return normalized;
    String paramsPath = basePath + ".params";
    if (params.isMissingNode() || params.isNull()) {
      boolean anyRequired =
          action.params().stream().anyMatch(SceneTemplateParamDescriptor::required);
      if (anyRequired) {
        violations.add(new AcademicViolation(paramsPath, AcademicViolationCode.REQUIRED));
      }
      return normalized;
    }
    if (!params.isObject()) {
      violations.add(new AcademicViolation(paramsPath, AcademicViolationCode.INVALID));
      return normalized;
    }
    Set<String> knownIds = new HashSet<>();
    for (SceneTemplateParamDescriptor descriptor : action.params()) {
      knownIds.add(descriptor.id());
      String path = paramsPath + "." + descriptor.id();
      JsonNode value = params.path(descriptor.id());
      if (value.isMissingNode() || value.isNull()) {
        if (descriptor.required()) {
          violations.add(new AcademicViolation(path, AcademicViolationCode.REQUIRED));
        }
        continue;
      }
      switch (descriptor.kind()) {
        case STRING, MULTILINE_TEXT, MATH_EXPRESSION -> {
          if (!value.isTextual() || value.asText().isBlank()) {
            violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
          } else if (value.asText().length() > descriptor.maxLength()) {
            violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
          } else if (descriptor.kind() == ParamKind.MATH_EXPRESSION
              && !InlineLatex.isSafe(value.asText())) {
            // Same safety as lesson MATH: block file/HTML primitives and raw < >; prefer \lt / \gt.
            violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
          } else if (descriptor.kind() != ParamKind.MATH_EXPRESSION
              && !InlineLatex.isValidMixed(value.asText())) {
            violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
          } else {
            normalized.put(descriptor.id(), value.asText());
          }
        }
        case INTEGER, DECIMAL -> {
          if (!value.isNumber()
              || (descriptor.kind() == ParamKind.INTEGER && !value.isIntegralNumber())) {
            violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
            break;
          }
          double numeric = value.asDouble();
          if (descriptor.min() != null && numeric < descriptor.min()
              || descriptor.max() != null && numeric > descriptor.max()) {
            violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
            break;
          }
          if (descriptor.kind() == ParamKind.INTEGER) {
            normalized.put(descriptor.id(), value.asInt());
          } else {
            normalized.put(descriptor.id(), numeric);
          }
        }
      }
    }
    for (Map.Entry<String, JsonNode> entry : params.properties()) {
      if (!knownIds.contains(entry.getKey())) {
        violations.add(
            new AcademicViolation(
                paramsPath + "." + entry.getKey(), AcademicViolationCode.UNSUPPORTED));
      }
    }
    if (params.properties().size() > MAX_PARAM_KEYS) {
      violations.add(new AcademicViolation(paramsPath, AcademicViolationCode.OUT_OF_RANGE));
    }
    return normalized;
  }

  static boolean isSafeMathExpression(String value) {
    return InlineLatex.isSafe(value);
  }

  static boolean isSafeInlineMarkup(String value) {
    return InlineLatex.isValidMixed(value);
  }
}
