package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicPackage;
import com.yukcsca.academic.domain.AcademicRevision;
import com.yukcsca.academic.domain.StudentContentProgress;
import com.yukcsca.academic.domain.StudentContentProgressStatus;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Projects active published revision JSON into student-safe shapes. Never exposes questions, mocks,
 * answer keys, drafts, or admin provenance.
 */
@Component
public class PublishedPackageProjector {
  public static final String PROGRESS_NOT_STARTED = "NOT_STARTED";
  public static final String PRODUCT_FULLY = "FULLY_COVERED";
  public static final String PRODUCT_PARTIAL = "PARTIALLY_COVERED";
  public static final String PRODUCT_NONE = "NOT_COVERED";

  private final JsonMapper json;

  public PublishedPackageProjector(JsonMapper json) {
    this.json = json;
  }

  public JsonNode parseContent(String contentJson) {
    try {
      JsonNode node = json.readTree(contentJson);
      if (node == null || !node.isObject()) {
        throw new IllegalStateException("Published academic revision content is not an object.");
      }
      return node;
    } catch (RuntimeException exception) {
      throw new IllegalStateException(
          "Published academic revision content is unreadable.", exception);
    }
  }

  public List<String> examLanguages(JsonNode content) {
    JsonNode languages =
        content.path("officialSyllabus").path("examStructure").path("examLanguages");
    List<String> values = new ArrayList<>();
    if (languages.isArray()) {
      for (JsonNode language : languages) {
        if (language.isTextual()) values.add(language.asText());
      }
    }
    return List.copyOf(values);
  }

  public OfficialSourceProjection officialSource(String subject, JsonNode content) {
    JsonNode syllabus = content.path("officialSyllabus");
    List<SourceLinkProjection> links = new ArrayList<>();
    JsonNode sourceLinks = syllabus.path("sourceLinks");
    if (sourceLinks.isArray()) {
      for (JsonNode link : sourceLinks) {
        String language = text(link, "language");
        String url = text(link, "url");
        if (language != null && url != null) {
          links.add(new SourceLinkProjection(language, url));
        }
      }
    }
    return new OfficialSourceProjection(
        subject,
        requireText(syllabus, "authority"),
        requireText(syllabus, "editionLabel"),
        List.copyOf(links),
        instant(syllabus.path("lastCheckedAt")),
        officialDate(syllabus.path("publishedOn")),
        officialDate(syllabus.path("effectiveOn")),
        officialDate(syllabus.path("updatedOn")),
        requireText(syllabus, "permittedUse"));
  }

  public List<LessonResourceProjection> lessons(JsonNode content) {
    return studyResourcesOfKind(content, "LESSON").stream()
        .map(
            resource ->
                new LessonResourceProjection(
                    resource.id(),
                    resource.title(),
                    resource.outlineItemIds(),
                    resource.availableExplanationLanguages(),
                    resource.blocksByLanguage()))
        .toList();
  }

  public List<StudyResourceProjection> remediations(JsonNode content) {
    return studyResourcesOfKind(content, "REMEDIATION");
  }

  public List<StudyResourceProjection> studyResourcesOfKind(JsonNode content, String kind) {
    List<StudyResourceProjection> resources = new ArrayList<>();
    JsonNode nodes = content.path("resources");
    if (!nodes.isArray()) return List.of();
    for (JsonNode resource : nodes) {
      if (!kind.equals(text(resource, "kind"))) continue;
      UUID id = uuid(resource.path("id"));
      if (id == null) continue;
      List<UUID> outlineItemIds = uuidArray(resource.path("outlineItemIds"));
      List<UUID> objectiveIds = uuidArray(resource.path("objectiveIds"));
      List<String> languages = new ArrayList<>();
      Map<String, List<JsonNode>> blocksByLanguage = new LinkedHashMap<>();
      JsonNode versions = resource.path("versions");
      if (versions.isArray()) {
        for (JsonNode version : versions) {
          String language = text(version, "language");
          if (language == null) continue;
          languages.add(language);
          List<JsonNode> blocks = new ArrayList<>();
          JsonNode blockNodes = version.path("blocks");
          if (blockNodes.isArray()) {
            for (JsonNode block : blockNodes) {
              JsonNode projected = projectBlock(block);
              if (projected != null) blocks.add(projected);
            }
          }
          blocksByLanguage.put(language, List.copyOf(blocks));
        }
      }
      resources.add(
          new StudyResourceProjection(
              id,
              kind,
              localized(resource.path("title")),
              outlineItemIds,
              objectiveIds,
              languages,
              blocksByLanguage));
    }
    return List.copyOf(resources);
  }

  public List<OutlineNodeProjection> outline(
      JsonNode content,
      List<LessonResourceProjection> lessons,
      Map<UUID, StudentContentProgress> progressByResource,
      UUID activeRevisionId) {
    JsonNode items = content.path("outlineItems");
    if (!items.isArray()) return List.of();

    List<RawOutline> raw = new ArrayList<>();
    Map<UUID, List<UUID>> children = new HashMap<>();
    for (JsonNode item : items) {
      UUID id = uuid(item.path("id"));
      if (id == null) continue;
      UUID parentId = item.path("parentId").isNull() ? null : uuid(item.path("parentId"));
      int order = item.path("order").canConvertToInt() ? item.path("order").asInt() : 0;
      raw.add(new RawOutline(id, parentId, order, localized(item.path("summary"))));
      if (parentId != null) {
        children.computeIfAbsent(parentId, ignored -> new ArrayList<>()).add(id);
      }
    }

    Map<UUID, List<LessonResourceProjection>> lessonsByOutline = new HashMap<>();
    for (LessonResourceProjection lesson : lessons) {
      for (UUID outlineId : lesson.outlineItemIds()) {
        lessonsByOutline.computeIfAbsent(outlineId, ignored -> new ArrayList<>()).add(lesson);
      }
    }

    Map<UUID, String> coverage = new HashMap<>();
    for (RawOutline node : raw) {
      coverage.put(node.id(), computeCoverage(node.id(), children, lessonsByOutline, coverage));
    }

    List<OutlineNodeProjection> projected = new ArrayList<>();
    for (RawOutline node :
        raw.stream().sorted(Comparator.comparingInt(RawOutline::order)).toList()) {
      List<LessonSummaryProjection> nodeLessons =
          lessonsByOutline.getOrDefault(node.id(), List.of()).stream()
              .map(
                  lesson ->
                      lessonSummary(lesson, progressByResource.get(lesson.id()), activeRevisionId))
              .toList();
      projected.add(
          new OutlineNodeProjection(
              node.id(),
              node.parentId(),
              node.order(),
              node.summary(),
              coverage.getOrDefault(node.id(), PRODUCT_NONE),
              nodeLessons));
    }
    return List.copyOf(projected);
  }

  public LessonSummaryProjection lessonSummary(
      LessonResourceProjection lesson, StudentContentProgress progress, UUID activeRevisionId) {
    return new LessonSummaryProjection(
        lesson.id(),
        lesson.title(),
        lesson.outlineItemIds(),
        contentProgress(progress, null, activeRevisionId));
  }

  public ContentProgressProjection contentProgress(
      StudentContentProgress progress, Integer clampToBlockCount, UUID activeRevisionId) {
    if (progress == null) {
      return new ContentProgressProjection(PROGRESS_NOT_STARTED, null, null, false);
    }
    Integer resume = progress.getResumeBlockIndex();
    if (resume != null && clampToBlockCount != null) {
      if (clampToBlockCount <= 0) {
        resume = null;
      } else if (resume >= clampToBlockCount) {
        resume = clampToBlockCount - 1;
      } else if (resume < 0) {
        resume = 0;
      }
    }
    boolean updatedSinceCompleted =
        progress.getStatus() == StudentContentProgressStatus.CONTENT_COMPLETE
            && progress.getLastRevisionId() != null
            && activeRevisionId != null
            && !progress.getLastRevisionId().equals(activeRevisionId);
    return new ContentProgressProjection(
        progress.getStatus().name(), resume, progress.getUpdatedAt(), updatedSinceCompleted);
  }

  public LessonSummaryProjection continueLesson(
      List<LessonResourceProjection> lessons,
      List<StudentContentProgress> progressRows,
      UUID activeRevisionId) {
    Map<UUID, LessonResourceProjection> byId = new HashMap<>();
    for (LessonResourceProjection lesson : lessons) {
      byId.put(lesson.id(), lesson);
    }
    return progressRows.stream()
        .filter(row -> row.getStatus() == StudentContentProgressStatus.IN_PROGRESS)
        .sorted(Comparator.comparing(StudentContentProgress::getUpdatedAt).reversed())
        .map(
            row -> {
              LessonResourceProjection lesson = byId.get(row.getResourceId());
              return lesson == null ? null : lessonSummary(lesson, row, activeRevisionId);
            })
        .filter(Objects::nonNull)
        .findFirst()
        .orElse(null);
  }

  public Set<UUID> referencedImageIds(JsonNode content) {
    Set<UUID> ids = new HashSet<>();
    collectImageIds(content, ids);
    return Set.copyOf(ids);
  }

  public boolean referencesImage(JsonNode content, UUID imageId) {
    return referencedImageIds(content).contains(imageId);
  }

  public PublishedPackageSummaryProjection packageSummary(
      AcademicPackage academicPackage, AcademicRevision revision, JsonNode content) {
    return new PublishedPackageSummaryProjection(
        academicPackage.getId(),
        academicPackage.getSubject(),
        new RevisionSummaryProjection(
            revision.getId(), revision.getRevisionNumber(), revision.getPublishedAt()),
        examLanguages(content));
  }

  /**
   * LESSON presence only. Leaf: FULLY when any LESSON maps to the node, else NOT. Parent: FULLY
   * when every child is FULLY; PARTIAL when any child is covered or the node itself has a LESSON;
   * else NOT. Practice/mock flags are out of scope.
   */
  private String computeCoverage(
      UUID nodeId,
      Map<UUID, List<UUID>> children,
      Map<UUID, List<LessonResourceProjection>> lessonsByOutline,
      Map<UUID, String> memo) {
    if (memo.containsKey(nodeId)) return memo.get(nodeId);
    List<UUID> childIds = children.getOrDefault(nodeId, List.of());
    boolean hasDirectLesson = !lessonsByOutline.getOrDefault(nodeId, List.of()).isEmpty();
    if (childIds.isEmpty()) {
      String value = hasDirectLesson ? PRODUCT_FULLY : PRODUCT_NONE;
      memo.put(nodeId, value);
      return value;
    }
    int fully = 0;
    boolean anyCovered = false;
    for (UUID childId : childIds) {
      String child = computeCoverage(childId, children, lessonsByOutline, memo);
      if (PRODUCT_FULLY.equals(child)) fully++;
      if (!PRODUCT_NONE.equals(child)) anyCovered = true;
    }
    String value;
    if (fully == childIds.size()) {
      value = PRODUCT_FULLY;
    } else if (anyCovered || hasDirectLesson) {
      value = PRODUCT_PARTIAL;
    } else {
      value = PRODUCT_NONE;
    }
    memo.put(nodeId, value);
    return value;
  }

  /**
   * Student-safe content blocks: only contracted TEXT / MATH / IMAGE fields. Extra keys on the
   * published revision node (admin-only metadata, typos, future fields) are stripped.
   */
  /** Public projection of a content block for assessment attempt copies and remediation bodies. */
  public JsonNode projectBlockPublic(JsonNode block) {
    return projectBlock(block);
  }

  private JsonNode projectBlock(JsonNode block) {
    String kind = text(block, "kind");
    if (kind == null) return null;
    return switch (kind) {
      case "TEXT" -> {
        String body = text(block, "text");
        if (body == null) yield null;
        var projected = json.createObjectNode();
        projected.put("kind", "TEXT");
        projected.put("text", body);
        yield projected;
      }
      case "MATH" -> {
        String latex = text(block, "latex");
        if (latex == null) yield null;
        var projected = json.createObjectNode();
        projected.put("kind", "MATH");
        projected.put("latex", latex);
        projected.put("displayMode", block.path("displayMode").asBoolean(false));
        yield projected;
      }
      case "IMAGE" -> {
        UUID imageId = uuid(block.path("imageId"));
        String altText = text(block, "altText");
        if (imageId == null || altText == null) yield null;
        var projected = json.createObjectNode();
        projected.put("kind", "IMAGE");
        projected.put("imageId", imageId.toString());
        projected.put("altText", altText);
        JsonNode caption = block.path("caption");
        if (caption != null && caption.isTextual() && !caption.asText().isBlank()) {
          projected.put("caption", caption.asText());
        } else {
          projected.putNull("caption");
        }
        yield projected;
      }
      default -> null;
    };
  }

  private void collectImageIds(JsonNode node, Set<UUID> ids) {
    if (node == null || node.isNull() || node.isMissingNode()) return;
    if (node.isObject()) {
      if ("IMAGE".equals(text(node, "kind"))) {
        UUID imageId = uuid(node.path("imageId"));
        if (imageId != null) ids.add(imageId);
      }
      node.properties().forEach(entry -> collectImageIds(entry.getValue(), ids));
      return;
    }
    if (node.isArray()) {
      for (JsonNode child : node) {
        collectImageIds(child, ids);
      }
    }
  }

  private static LocalizedTextProjection localized(JsonNode node) {
    if (node == null || !node.isObject()) {
      return new LocalizedTextProjection(null, null, null);
    }
    return new LocalizedTextProjection(
        text(node, "indonesian"), text(node, "english"), text(node, "simplifiedChinese"));
  }

  private static OfficialDateProjection officialDate(JsonNode node) {
    if (node == null || node.isNull() || node.isMissingNode() || !node.isObject()) {
      return null;
    }
    String status = text(node, "status");
    String date =
        node.path("date").isNull() || node.path("date").isMissingNode() ? null : text(node, "date");
    if (status == null && date == null) return null;
    return new OfficialDateProjection(status, date);
  }

  private static Instant instant(JsonNode node) {
    if (node == null || !node.isTextual()) {
      throw new IllegalStateException("Published syllabus lastCheckedAt is missing.");
    }
    return Instant.parse(node.asText());
  }

  private static String requireText(JsonNode node, String field) {
    String value = text(node, field);
    if (value == null) {
      throw new IllegalStateException("Published syllabus field missing: " + field);
    }
    return value;
  }

  private static String text(JsonNode node, String field) {
    JsonNode value = node.path(field);
    if (value == null || value.isNull() || value.isMissingNode() || !value.isTextual()) return null;
    String text = value.asText();
    return text.isBlank() ? null : text;
  }

  private static UUID uuid(JsonNode node) {
    if (node == null || node.isNull() || node.isMissingNode() || !node.isTextual()) return null;
    try {
      return UUID.fromString(node.asText());
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  private static List<UUID> uuidArray(JsonNode node) {
    if (node == null || !node.isArray()) return List.of();
    List<UUID> values = new ArrayList<>();
    for (JsonNode item : node) {
      UUID id = uuid(item);
      if (id != null) values.add(id);
    }
    return List.copyOf(values);
  }

  private record RawOutline(UUID id, UUID parentId, int order, LocalizedTextProjection summary) {}

  public record LocalizedTextProjection(
      String indonesian, String english, String simplifiedChinese) {}

  public record SourceLinkProjection(String language, String url) {}

  public record OfficialDateProjection(String status, String date) {}

  public record OfficialSourceProjection(
      String subject,
      String authority,
      String editionLabel,
      List<SourceLinkProjection> sourceLinks,
      Instant lastCheckedAt,
      OfficialDateProjection publishedOn,
      OfficialDateProjection effectiveOn,
      OfficialDateProjection updatedOn,
      String permittedUse) {}

  public record RevisionSummaryProjection(UUID id, long revisionNumber, Instant publishedAt) {}

  public record PublishedPackageSummaryProjection(
      UUID id,
      String subject,
      RevisionSummaryProjection activeRevision,
      List<String> examLanguages) {}

  public record ContentProgressProjection(
      String status, Integer resumeBlockIndex, Instant updatedAt, boolean updatedSinceCompleted) {}

  public record LessonSummaryProjection(
      UUID resourceId,
      LocalizedTextProjection title,
      List<UUID> outlineItemIds,
      ContentProgressProjection contentProgress) {}

  public record OutlineNodeProjection(
      UUID id,
      UUID parentId,
      int order,
      LocalizedTextProjection summary,
      String productCoverage,
      List<LessonSummaryProjection> lessons) {}

  public record LessonResourceProjection(
      UUID id,
      LocalizedTextProjection title,
      List<UUID> outlineItemIds,
      List<String> availableExplanationLanguages,
      Map<String, List<JsonNode>> blocksByLanguage) {}

  public record StudyResourceProjection(
      UUID id,
      String kind,
      LocalizedTextProjection title,
      List<UUID> outlineItemIds,
      List<UUID> objectiveIds,
      List<String> availableExplanationLanguages,
      Map<String, List<JsonNode>> blocksByLanguage) {}
}
