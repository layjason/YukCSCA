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

    List<PublishedPackageProjector.LessonResourceProjection> lessons = projector.lessons(content);
    List<PublishedPackageProjector.OutlineNodeProjection> nodes =
        projector.outline(content, lessons, Map.of());

    assertThat(nodes).hasSize(3);
    assertThat(find(nodes, childCovered).productCoverage()).isEqualTo("FULLY_COVERED");
    assertThat(find(nodes, childBare).productCoverage()).isEqualTo("NOT_COVERED");
    assertThat(find(nodes, root).productCoverage()).isEqualTo("PARTIALLY_COVERED");
  }

  @Test
  void contentProgressClampsResumeIndexToBlockCount() {
    StudentContentProgress progress =
        new StudentContentProgress(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "MATHEMATICS",
            UUID.randomUUID(),
            StudentContentProgressStatus.IN_PROGRESS,
            40,
            UUID.randomUUID(),
            Instant.parse("2026-08-01T00:00:00Z"));

    assertThat(projector.contentProgress(progress, 3).resumeBlockIndex()).isEqualTo(2);
    assertThat(projector.contentProgress(progress, 0).resumeBlockIndex()).isNull();
    assertThat(projector.contentProgress(null, 3).status()).isEqualTo("NOT_STARTED");
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
