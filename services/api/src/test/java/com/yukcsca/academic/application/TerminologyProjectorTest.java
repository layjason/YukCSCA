package com.yukcsca.academic.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.academic.application.TerminologyProjector.PublishedTerm;
import com.yukcsca.academic.application.TerminologyProjector.Surface;
import com.yukcsca.academic.application.TerminologyProjector.TermSpanMatch;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class TerminologyProjectorTest {
  private final JsonMapper json = JsonMapper.shared();
  private final TerminologyProjector projector = new TerminologyProjector();

  @Test
  void matchesExactSurfaceAndAliasUsingUtf16Offsets() {
    UUID termId = UUID.randomUUID();
    PublishedTerm term =
        new PublishedTerm(
            termId,
            "TOPIC_TERM",
            List.of(new Surface("因式分解", "yīnshì fēnjiě"), new Surface("分解因式", "fēnjiě yīnshì")),
            null,
            "factorization",
            null,
            "factorization",
            "writing a polynomial as a product",
            null,
            null,
            List.of());
    ObjectNode block = json.createObjectNode();
    block.put("kind", "TEXT");
    block.put("text", "请将多项式分解因式。");
    List<TermSpanMatch> spans =
        projector.matchSpans(List.of(block), List.of(term), Set.of(termId), 64);
    assertThat(spans).hasSize(1);
    assertThat(spans.getFirst().surfaceForm()).isEqualTo("分解因式");
    assertThat(spans.getFirst().startOffset()).isEqualTo("请将多项式分解因式。".indexOf("分解因式"));
    assertThat(spans.getFirst().endOffset())
        .isEqualTo(spans.getFirst().startOffset() + "分解因式".length());
  }

  @Test
  void doesNotAutoMatchTopicTermOutsideRequiredSet() {
    UUID required = UUID.randomUUID();
    UUID other = UUID.randomUUID();
    PublishedTerm requiredTerm =
        new PublishedTerm(
            required,
            "TOPIC_TERM",
            List.of(new Surface("单调递增", "dāndiào dìzēng")),
            null,
            "increasing",
            null,
            "monotonically increasing",
            "increasing on an interval",
            null,
            null,
            List.of());
    PublishedTerm otherTerm =
        new PublishedTerm(
            other,
            "TOPIC_TERM",
            List.of(new Surface("导数", "dǎoshù")),
            null,
            "derivative",
            null,
            "derivative",
            "instantaneous rate",
            null,
            null,
            List.of());
    ObjectNode block = json.createObjectNode();
    block.put("kind", "TEXT");
    block.put("text", "函数单调递增且导数为正。");
    List<TermSpanMatch> spans =
        projector.matchSpans(
            List.of(block), List.of(requiredTerm, otherTerm), Set.of(required), 64);
    assertThat(spans).extracting(TermSpanMatch::termId).containsExactly(required);
  }

  @Test
  void adminPresetCanAddTopicTermOutsideRequiredSet() {
    UUID required = UUID.randomUUID();
    UUID extra = UUID.randomUUID();
    PublishedTerm requiredTerm =
        new PublishedTerm(
            required,
            "TOPIC_TERM",
            List.of(new Surface("单调递增", "dāndiào dìzēng")),
            null,
            "increasing",
            null,
            "monotonically increasing",
            "increasing on an interval",
            null,
            null,
            List.of());
    PublishedTerm extraTerm =
        new PublishedTerm(
            extra,
            "TOPIC_TERM",
            List.of(new Surface("导数", "dǎoshù")),
            null,
            "derivative",
            null,
            "derivative",
            "instantaneous rate",
            null,
            null,
            List.of());
    ObjectNode block = json.createObjectNode();
    block.put("kind", "TEXT");
    block.put("text", "函数单调递增且导数为正。");
    List<TermSpanMatch> auto =
        projector.matchSpans(
            List.of(block), List.of(requiredTerm, extraTerm), Set.of(required), 64);
    List<TermSpanMatch> merged =
        projector.mergeAuthoredSpans(
            auto,
            List.of(block),
            List.of(requiredTerm, extraTerm),
            List.of(new TerminologyProjector.AuthoredAttachment(extra, "导数")),
            64);
    assertThat(merged).extracting(TermSpanMatch::termId).containsExactly(required, extra);
  }

  @Test
  void missingExplanationLanguageDoesNotSubstitute() {
    PublishedTerm term =
        new PublishedTerm(
            UUID.randomUUID(),
            "EXAM_INSTRUCTION",
            List.of(new Surface("求", "qiú")),
            null,
            "find",
            null,
            "find",
            "request a value",
            null,
            null,
            List.of());
    assertThat(projector.definitionText(term, "id")).isNull();
    assertThat(projector.definitionText(term, "en")).isEqualTo("find");
  }

  @Test
  void parsesTermBankFromRevisionJson() {
    ObjectNode content = json.createObjectNode();
    ObjectNode term = content.putArray("terms").addObject();
    UUID id = UUID.randomUUID();
    term.put("id", id.toString());
    term.put("termClass", "EXAM_INSTRUCTION");
    ObjectNode surface = term.putArray("surfaceForms").addObject();
    surface.put("text", "求");
    surface.put("pinyin", "qiú");
    term.putObject("definitions").put("english", "find");
    term.put("englishEquivalent", "find");
    term.put("domainMeaning", "ask for a value");
    assertThat(projector.hasPublishedTermBank(content)).isTrue();
    assertThat(projector.terms(content)).hasSize(1);
    assertThat(projector.terms(content).getFirst().id()).isEqualTo(id);
  }
}
