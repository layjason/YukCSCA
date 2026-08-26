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
 * explanationLanguage}. INTERVAL_SET parameters ({@code number-line-union}) extend the param
 * grammar with composite item paths {@code segments[i].params.<paramId>[j]} and sub-field paths
 * {@code segments[i].params.<paramId>[j].<field>}. The Python render worker re-validates the same
 * rules before rendering.
 */
@Component
public class SceneSpecificationValidator {
  static final int MAX_SEGMENTS = 60;
  static final int MAX_NARRATION_LENGTH = 600;
  static final int MAX_PARAM_KEYS = 16;

  /** Bounded composite size for INTERVAL_SET parameters ({@code number-line-union}). */
  static final int MAX_INTERVAL_SCOPES = 4;

  private static final Set<String> EXPLANATION_LANGUAGES = Set.of("id", "en", "zh-CN");
  private static final String TEMPLATE_ACTION_PATTERN = "^[a-z0-9][a-z0-9-]{0,63}$";
  private static final Set<String> INTERVAL_END_TOKENS = Set.of("FINITE", "INFINITE");
  private static final Set<String> INTERVAL_BOUND_TOKENS = Set.of("OPEN", "CLOSED");
  private static final double INTERVAL_ENDPOINT_LIMIT = 100.0;

  /**
   * Family-conditional coefficient requirements; keys align with the {@code function-graph} family
   * choices. Coefficient {@code a} is required for every family, so its descriptor flag enforces it
   * and reporting it here again would duplicate the violation.
   */
  private static final Map<String, List<String>> REQUIRED_COEFFICIENTS =
      Map.of(
          "LINEAR",
          List.of("b"),
          "QUADRATIC",
          List.of("b", "c"),
          "POWER",
          List.of("n"),
          "EXP",
          List.of("r"),
          "LOG",
          List.of("base"),
          "SIN",
          List.of("b", "c", "d"),
          "COS",
          List.of("b", "c", "d"));

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
        case ENUM -> {
          if (!value.isTextual() || !descriptor.choices().contains(value.asText())) {
            violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
          } else {
            normalized.put(descriptor.id(), value.asText());
          }
        }
        case INTERVAL_SET -> {
          // The composite value stays an untyped wire boundary; only its shape and member fields
          // are validated here. A valid array is stored verbatim for the render worker.
          if (!value.isArray()) {
            violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
          } else {
            if (value.isEmpty() || value.size() > MAX_INTERVAL_SCOPES) {
              violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
            }
            for (int index = 0; index < value.size(); index++) {
              validateIntervalScope(value.get(index), path + "[" + index + "]", violations);
            }
            normalized.set(descriptor.id(), value);
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
    applyActionSemantics(action.id(), params, paramsPath, violations);
    return normalized;
  }

  /**
   * Validates one INTERVAL_SET member object at {@code basePath} ({@code
   * segments[i].params.<paramId>[j]}): closed field set, required FINITE/INFINITE end tokens, and
   * endpoint/bound fields that are required only on a FINITE end. Field order inside the scope is
   * part of the violation contract and is mirrored by the Python worker.
   */
  private static void validateIntervalScope(
      JsonNode scope, String basePath, List<AcademicViolation> violations) {
    if (!scope.isObject()) {
      violations.add(new AcademicViolation(basePath, AcademicViolationCode.INVALID));
      return;
    }
    Set<String> knownFields =
        Set.of("left", "leftBound", "leftInf", "right", "rightBound", "rightInf");
    for (Map.Entry<String, JsonNode> entry : scope.properties()) {
      if (!knownFields.contains(entry.getKey())) {
        violations.add(
            new AcademicViolation(
                basePath + "." + entry.getKey(), AcademicViolationCode.UNSUPPORTED));
      }
    }
    String leftInf = intervalEndToken(scope, "leftInf", basePath, violations);
    String rightInf = intervalEndToken(scope, "rightInf", basePath, violations);
    validateIntervalEnd(scope, "left", "leftBound", leftInf, basePath, violations);
    validateIntervalEnd(scope, "right", "rightBound", rightInf, basePath, violations);
  }

  /** Reads the FINITE/INFINITE token for one interval end; null when missing or malformed. */
  private static String intervalEndToken(
      JsonNode scope, String fieldId, String basePath, List<AcademicViolation> violations) {
    JsonNode token = scope.path(fieldId);
    if (token.isMissingNode() || token.isNull()) {
      violations.add(
          new AcademicViolation(basePath + "." + fieldId, AcademicViolationCode.REQUIRED));
      return null;
    }
    if (!token.isTextual() || !INTERVAL_END_TOKENS.contains(token.asText())) {
      violations.add(
          new AcademicViolation(basePath + "." + fieldId, AcademicViolationCode.INVALID));
      return null;
    }
    return token.asText();
  }

  /**
   * Validates the endpoint number and bound type of one FINITE interval end. Fields on an INFINITE
   * end are semantically absent: neither required nor validated (same D-08/D-10 posture as the
   * single-interval action).
   */
  private static void validateIntervalEnd(
      JsonNode scope,
      String numberField,
      String boundField,
      String endToken,
      String basePath,
      List<AcademicViolation> violations) {
    if (!"FINITE".equals(endToken)) return;
    JsonNode number = scope.path(numberField);
    if (number.isMissingNode() || number.isNull()) {
      violations.add(
          new AcademicViolation(basePath + "." + numberField, AcademicViolationCode.REQUIRED));
    } else if (!number.isNumber()) {
      violations.add(
          new AcademicViolation(basePath + "." + numberField, AcademicViolationCode.INVALID));
    } else if (number.asDouble() < -INTERVAL_ENDPOINT_LIMIT
        || number.asDouble() > INTERVAL_ENDPOINT_LIMIT) {
      violations.add(
          new AcademicViolation(basePath + "." + numberField, AcademicViolationCode.OUT_OF_RANGE));
    }
    JsonNode bound = scope.path(boundField);
    if (bound.isMissingNode() || bound.isNull()) {
      violations.add(
          new AcademicViolation(basePath + "." + boundField, AcademicViolationCode.REQUIRED));
    } else if (!bound.isTextual() || !INTERVAL_BOUND_TOKENS.contains(bound.asText())) {
      violations.add(
          new AcademicViolation(basePath + "." + boundField, AcademicViolationCode.INVALID));
    }
  }

  /**
   * Conditional semantic rules for the CSCA Math templates (D-06..D-09). Runs only on already
   * well-formed inputs: a parameter that failed its own descriptor check is skipped here so no
   * duplicate or misleading violation is reported. The Python worker mirrors these rules exactly.
   */
  private static void applyActionSemantics(
      String actionId, JsonNode params, String paramsPath, List<AcademicViolation> violations) {
    if (!params.isObject()) return;
    switch (actionId) {
      case "function-graph" -> {
        String family = textualToken(params.get("family"));
        if (family != null && REQUIRED_COEFFICIENTS.containsKey(family)) {
          for (String coefficientId : REQUIRED_COEFFICIENTS.get(family)) {
            JsonNode coefficient = params.get(coefficientId);
            if (coefficient == null || coefficient.isNull()) {
              violations.add(
                  new AcademicViolation(
                      paramsPath + "." + coefficientId, AcademicViolationCode.REQUIRED));
            }
          }
          if ("EXP".equals(family)) {
            Double ratio = numericValue(params.get("r"));
            if (ratio != null && (ratio <= 0 || ratio == 1)) {
              violations.add(
                  new AcademicViolation(paramsPath + ".r", AcademicViolationCode.OUT_OF_RANGE));
            }
          } else if ("LOG".equals(family)) {
            Double base = numericValue(params.get("base"));
            if (base != null && (base <= 0 || base == 1)) {
              violations.add(
                  new AcademicViolation(paramsPath + ".base", AcademicViolationCode.OUT_OF_RANGE));
            }
          }
        }
        Double xMin = numericValue(params.get("xMin"));
        Double xMax = numericValue(params.get("xMax"));
        if (xMin != null && xMax != null && xMin >= xMax) {
          violations.add(
              new AcademicViolation(paramsPath + ".xMax", AcademicViolationCode.INVALID));
        }
      }
      case "number-line-interval" -> {
        String leftInf = textualToken(params.get("leftInf"));
        String rightInf = textualToken(params.get("rightInf"));
        Double left = numericValue(params.get("left"));
        Double right = numericValue(params.get("right"));
        // D-08/D-12: endpoint and bound type are meaningless on an infinite end, so each is
        // required only when that end is FINITE (same conditional pattern as family coefficients).
        // Presence is checked on the raw node so a value that already failed its descriptor check
        // is not double-reported.
        if ("FINITE".equals(leftInf)
            && (params.get("left") == null || params.get("left").isNull())) {
          violations.add(
              new AcademicViolation(paramsPath + ".left", AcademicViolationCode.REQUIRED));
        }
        if ("FINITE".equals(leftInf)
            && (params.get("leftBound") == null || params.get("leftBound").isNull())) {
          violations.add(
              new AcademicViolation(paramsPath + ".leftBound", AcademicViolationCode.REQUIRED));
        }
        if ("FINITE".equals(rightInf)
            && (params.get("right") == null || params.get("right").isNull())) {
          violations.add(
              new AcademicViolation(paramsPath + ".right", AcademicViolationCode.REQUIRED));
        }
        if ("FINITE".equals(rightInf)
            && (params.get("rightBound") == null || params.get("rightBound").isNull())) {
          violations.add(
              new AcademicViolation(paramsPath + ".rightBound", AcademicViolationCode.REQUIRED));
        }
        if ("FINITE".equals(leftInf)
            && "FINITE".equals(rightInf)
            && left != null
            && right != null
            && left >= right) {
          violations.add(
              new AcademicViolation(paramsPath + ".right", AcademicViolationCode.INVALID));
        }
      }
      case "number-line-union" -> {
        JsonNode scopes = params.get("scopes");
        if (scopes != null && scopes.isArray()) {
          for (int index = 0; index < scopes.size(); index++) {
            JsonNode scope = scopes.get(index);
            if (scope == null || !scope.isObject()) continue;
            Double left = numericValue(scope.get("left"));
            Double right = numericValue(scope.get("right"));
            boolean leftFinite = "FINITE".equals(textualToken(scope.get("leftInf")));
            boolean rightFinite = "FINITE".equals(textualToken(scope.get("rightInf")));
            if (leftFinite && rightFinite && left != null && right != null && left >= right) {
              violations.add(
                  new AcademicViolation(
                      paramsPath + ".scopes[" + index + "].right", AcademicViolationCode.INVALID));
            }
          }
        }
      }
      default -> {
        // Framing actions have no cross-parameter semantics.
      }
    }
  }

  private static String textualToken(JsonNode node) {
    return node != null && node.isTextual() ? node.asText() : null;
  }

  private static Double numericValue(JsonNode node) {
    return node != null && node.isNumber() ? node.asDouble() : null;
  }

  static boolean isSafeMathExpression(String value) {
    return InlineLatex.isSafe(value);
  }

  static boolean isSafeInlineMarkup(String value) {
    return InlineLatex.isValidMixed(value);
  }
}
