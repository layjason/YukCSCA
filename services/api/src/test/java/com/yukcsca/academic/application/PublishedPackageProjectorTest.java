package com.yukcsca.academic.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.academic.domain.StudentContentProgress;
import com.yukcsca.academic.domain.StudentContentProgressStatus;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class PublishedPackageProjectorTest {
  private final JsonMapper json = JsonMapper.builder().build();
  private final PublishedPackageProjector projector = new PublishedPackageProjector(json);

  @Test
  void productCoverageUsesLessonPresenceWithParentPartialRule() {
    UUID root = UUID.randomUUID();
    UUID childCovered = UUID.randomUUID();
    UUID childBare = UUID.randomUUID();
    UUID lessonId = UUID.randomUUID();

    ObjectNode content = json.createObjectNode();
    var outline = content.putArray("outlineItems");
    outline
        .addObject()
        .put("id", root.toString())
        .putNull("parentId")
        .put("order", 0)
        .putObject("summary")
        .put("english", "Root");
    outline
        .addObject()
        .put("id", childCovered.toString())
        .put("parentId", root.toString())
        .put("order", 1)
        .putObject("summary")
        .put("english", "Covered");
    outline
        .addObject()
        .put("id", childBare.toString())
        .put("parentId", root.toString())
        .put("order", 2)
        .putObject("summary")
        .put("english", "Bare");

    var resources = content.putArray("resources");
    var lesson = resources.addObject();
    lesson.put("id", lessonId.toString());
    lesson.put("kind", "LESSON");
    lesson.putObject("title").put("english", "Lesson");
    lesson.putArray("outlineItemIds").add(childCovered.toString());
    lesson.putArray("versions").addObject().put("language", "id").putArray("blocks");

    UUID activeRevisionId = UUID.randomUUID();
    List<PublishedPackageProjector.LessonResourceProjection> lessons = projector.lessons(content);
    List<PublishedPackageProjector.OutlineNodeProjection> nodes =
        projector.outline(content, lessons, Map.of(), activeRevisionId, Map.of());

    assertThat(nodes).hasSize(3);
    assertThat(find(nodes, childCovered).productCoverage()).isEqualTo("FULLY_COVERED");
    assertThat(find(nodes, childBare).productCoverage()).isEqualTo("NOT_COVERED");
    assertThat(find(nodes, root).productCoverage()).isEqualTo("PARTIALLY_COVERED");
  }

  @Test
  void contentProgressClampsResumeIndexToBlockCount() {
    UUID completedRevision = UUID.randomUUID();
    StudentContentProgress progress =
        new StudentContentProgress(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "MATHEMATICS",
            UUID.randomUUID(),
            StudentContentProgressStatus.IN_PROGRESS,
            40,
            completedRevision,
            Instant.parse("2026-08-01T00:00:00Z"));

    assertThat(projector.contentProgress(progress, 3, completedRevision).resumeBlockIndex())
        .isEqualTo(2);
    assertThat(projector.contentProgress(progress, 0, completedRevision).resumeBlockIndex())
        .isNull();
    assertThat(projector.contentProgress(null, 3, completedRevision).status())
        .isEqualTo("NOT_STARTED");
    assertThat(projector.contentProgress(null, 3, completedRevision).updatedSinceCompleted())
        .isFalse();
  }

  @Test
  void contentProgressFlagsUpdatedSinceCompletedWhenActiveRevisionDiffersWithoutContentContext() {
    UUID completedRevision = UUID.randomUUID();
    UUID activeRevision = UUID.randomUUID();
    StudentContentProgress progress =
        new StudentContentProgress(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "MATHEMATICS",
            UUID.randomUUID(),
            StudentContentProgressStatus.CONTENT_COMPLETE,
            2,
            completedRevision,
            Instant.parse("2026-08-01T00:00:00Z"));

    assertThat(projector.contentProgress(progress, null, completedRevision).updatedSinceCompleted())
        .isFalse();
    // Without resource content, revision id mismatch soft-signals (legacy callers).
    assertThat(projector.contentProgress(progress, null, activeRevision).updatedSinceCompleted())
        .isTrue();
    assertThat(projector.contentProgress(progress, null, activeRevision).status())
        .isEqualTo("CONTENT_COMPLETE");
  }

  @Test
  void contentProgressUsesResourceFingerprintWhenHistoricalContentProvided() {
    UUID lessonId = UUID.randomUUID();
    UUID otherLessonId = UUID.randomUUID();
    UUID completedRevision = UUID.randomUUID();
    UUID activeRevision = UUID.randomUUID();

    ObjectNode previous = json.createObjectNode();
    var prevResources = previous.putArray("resources");
    ObjectNode prevLesson = prevResources.addObject();
    prevLesson.put("id", lessonId.toString());
    prevLesson.put("kind", "LESSON");
    prevLesson.putObject("title").put("english", "Lesson A");
    prevLesson.putArray("outlineItemIds");
    prevLesson.putArray("versions").addObject().put("language", "id").putArray("blocks");

    ObjectNode activeUnchanged = previous.deepCopy();
    ObjectNode activeOtherLessonOnly = previous.deepCopy();
    ObjectNode other =
        ((tools.jackson.databind.node.ArrayNode) activeOtherLessonOnly.path("resources"))
            .addObject();
    other.put("id", otherLessonId.toString());
    other.put("kind", "LESSON");
    other.putObject("title").put("english", "Other");
    other.putArray("outlineItemIds");
    other.putArray("versions").addObject().put("language", "id").putArray("blocks");

    ObjectNode activeLessonChanged = previous.deepCopy();
    ((ObjectNode) activeLessonChanged.path("resources").get(0).path("title"))
        .put("english", "Lesson A revised");

    StudentContentProgress progress =
        new StudentContentProgress(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "MATHEMATICS",
            lessonId,
            StudentContentProgressStatus.CONTENT_COMPLETE,
            0,
            completedRevision,
            Instant.parse("2026-08-01T00:00:00Z"));

    Map<UUID, tools.jackson.databind.JsonNode> historical = Map.of(completedRevision, previous);

    assertThat(
            projector
                .contentProgress(
                    progress, null, activeRevision, lessonId, activeUnchanged, historical)
                .updatedSinceCompleted())
        .isFalse();
    assertThat(
            projector
                .contentProgress(
                    progress, null, activeRevision, lessonId, activeOtherLessonOnly, historical)
                .updatedSinceCompleted())
        .isFalse();
    assertThat(
            projector
                .contentProgress(
                    progress, null, activeRevision, lessonId, activeLessonChanged, historical)
                .updatedSinceCompleted())
        .isTrue();
  }

  @Test
  void projectBlockStripsUnknownFieldsFromStudentLessonBlocks() {
    UUID imageId = UUID.randomUUID();
    UUID lessonId = UUID.randomUUID();
    ObjectNode content = json.createObjectNode();
    content.putArray("outlineItems");
    var resources = content.putArray("resources");
    var lesson = resources.addObject();
    lesson.put("id", lessonId.toString());
    lesson.put("kind", "LESSON");
    lesson.putObject("title").put("english", "Lesson");
    lesson.putArray("outlineItemIds");
    var version = lesson.putArray("versions").addObject();
    version.put("language", "id");
    var blocks = version.putArray("blocks");
    blocks
        .addObject()
        .put("kind", "TEXT")
        .put("text", "Hello")
        .put("adminOnlyNote", "should-not-leak");
    blocks
        .addObject()
        .put("kind", "MATH")
        .put("latex", "x^2")
        .put("displayMode", true)
        .put("internalProvenance", "strip-me");
    blocks
        .addObject()
        .put("kind", "IMAGE")
        .put("imageId", imageId.toString())
        .put("altText", "Diagram")
        .putNull("caption")
        .put("draftPath", "/tmp/secret");

    var projected = projector.lessons(content);
    assertThat(projected).hasSize(1);
    var idBlocks = projected.getFirst().blocksByLanguage().get("id");
    assertThat(idBlocks).hasSize(3);

    assertThat(idBlocks.get(0).path("kind").asText()).isEqualTo("TEXT");
    assertThat(idBlocks.get(0).path("text").asText()).isEqualTo("Hello");
    assertThat(idBlocks.get(0).has("adminOnlyNote")).isFalse();
    assertThat(idBlocks.get(0).properties()).hasSize(2);

    assertThat(idBlocks.get(1).path("kind").asText()).isEqualTo("MATH");
    assertThat(idBlocks.get(1).path("latex").asText()).isEqualTo("x^2");
    assertThat(idBlocks.get(1).path("displayMode").asBoolean()).isTrue();
    assertThat(idBlocks.get(1).has("internalProvenance")).isFalse();
    assertThat(idBlocks.get(1).properties()).hasSize(3);

    assertThat(idBlocks.get(2).path("kind").asText()).isEqualTo("IMAGE");
    assertThat(idBlocks.get(2).path("imageId").asText()).isEqualTo(imageId.toString());
    assertThat(idBlocks.get(2).path("altText").asText()).isEqualTo("Diagram");
    assertThat(idBlocks.get(2).path("caption").isNull()).isTrue();
    assertThat(idBlocks.get(2).has("draftPath")).isFalse();
    assertThat(idBlocks.get(2).properties()).hasSize(4);
  }

  private static PublishedPackageProjector.OutlineNodeProjection find(
      List<PublishedPackageProjector.OutlineNodeProjection> nodes, UUID id) {
    return nodes.stream().filter(node -> node.id().equals(id)).findFirst().orElseThrow();
  }
}
