package com.yukcsca.academic.application;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/**
 * Parses published term banks and projects student-safe cards and UTF-16 TEXT spans. Java {@link
 * String#indexOf(String)} offsets are UTF-16 code units.
 */
@Component
public class TerminologyProjector {
  public static final Set<String> EXAM_WORDING_CLASSES =
      Set.of("EXAM_INSTRUCTION", "LOGICAL_EXPRESSION");

  public boolean hasPublishedTermBank(JsonNode content) {
    JsonNode terms = content.path("terms");
    return terms.isArray() && !terms.isEmpty();
  }

  public List<PublishedTerm> terms(JsonNode content) {
    JsonNode nodes = content.path("terms");
    if (!nodes.isArray()) return List.of();
    List<PublishedTerm> terms = new ArrayList<>();
    for (JsonNode node : nodes) {
      UUID id = uuid(node.path("id"));
      String termClass = text(node, "termClass");
      if (id == null || termClass == null) continue;
      List<Surface> surfaces = new ArrayList<>();
      JsonNode forms = node.path("surfaceForms");
      if (forms.isArray()) {
        for (JsonNode form : forms) {
          String value = text(form, "text");
          String pinyin = text(form, "pinyin");
          if (value != null && pinyin != null) {
            surfaces.add(new Surface(value, pinyin));
          }
        }
      }
      if (surfaces.isEmpty()) continue;
      JsonNode definitions = node.path("definitions");
      terms.add(
          new PublishedTerm(
              id,
              termClass,
              List.copyOf(surfaces),
              text(definitions, "indonesian"),
              text(definitions, "english"),
              text(definitions, "simplifiedChinese"),
              text(node, "englishEquivalent") == null ? "" : text(node, "englishEquivalent"),
              text(node, "symbols"),
              text(node, "example"),
              uuidArray(node.path("outlineItemIds"))));
    }
    return List.copyOf(terms);
  }

  public Optional<PublishedTerm> findTerm(List<PublishedTerm> terms, UUID termId) {
    return terms.stream().filter(term -> term.id().equals(termId)).findFirst();
  }

  public Optional<PublishedTerm> matchSelectedText(List<PublishedTerm> terms, String selectedText) {
    if (selectedText == null) return Optional.empty();
    String needle = selectedText.trim();
    if (needle.isEmpty()) return Optional.empty();
    for (PublishedTerm term : terms) {
      for (Surface surface : term.surfaces()) {
        if (needle.equals(surface.text())) {
          return Optional.of(term);
        }
      }
    }
    return Optional.empty();
  }

  public Set<UUID> requiredTermIds(JsonNode resource) {
    return new LinkedHashSet<>(uuidArray(resource.path("requiredTermIds")));
  }

  public List<JsonNode> terminologyResources(JsonNode content) {
    List<JsonNode> resources = new ArrayList<>();
    JsonNode nodes = content.path("resources");
    if (!nodes.isArray()) return List.of();
    for (JsonNode resource : nodes) {
      if ("TERMINOLOGY".equals(text(resource, "kind"))) {
        resources.add(resource);
      }
    }
    return List.copyOf(resources);
  }

  public Optional<JsonNode> terminologyBoundTo(JsonNode content, List<UUID> outlineItemIds) {
    Set<UUID> wanted = new HashSet<>(outlineItemIds);
    for (JsonNode resource : terminologyResources(content)) {
      for (UUID outlineId : uuidArray(resource.path("outlineItemIds"))) {
        if (wanted.contains(outlineId)) {
          return Optional.of(resource);
        }
      }
    }
    return Optional.empty();
  }

  public List<UUID> lessonResourceIdsSharingOutline(JsonNode content, JsonNode terminology) {
    Set<UUID> outline = new HashSet<>(uuidArray(terminology.path("outlineItemIds")));
    List<UUID> lessons = new ArrayList<>();
    JsonNode nodes = content.path("resources");
    if (!nodes.isArray()) return List.of();
    for (JsonNode resource : nodes) {
      if (!"LESSON".equals(text(resource, "kind"))) continue;
      UUID id = uuid(resource.path("id"));
      if (id == null) continue;
      for (UUID outlineId : uuidArray(resource.path("outlineItemIds"))) {
        if (outline.contains(outlineId)) {
          lessons.add(id);
          break;
        }
      }
    }
    return List.copyOf(lessons);
  }

  public List<PublishedTerm> requiredTerms(List<PublishedTerm> bank, Set<UUID> requiredIds) {
    Map<UUID, PublishedTerm> byId = new LinkedHashMap<>();
    for (PublishedTerm term : bank) {
      byId.put(term.id(), term);
    }
    List<PublishedTerm> ordered = new ArrayList<>();
    for (UUID id : requiredIds) {
      PublishedTerm term = byId.get(id);
      if (term != null) ordered.add(term);
    }
    return List.copyOf(ordered);
  }

  public Set<UUID> autoMatchTermIds(List<PublishedTerm> bank, Set<UUID> requiredTopicTermIds) {
    Set<UUID> ids = new LinkedHashSet<>(requiredTopicTermIds);
    for (PublishedTerm term : bank) {
      if (EXAM_WORDING_CLASSES.contains(term.termClass())) {
        ids.add(term.id());
      }
    }
    return ids;
  }

  /**
   * Terms that light up on a scored stem. Missing or extra-only attachments keep platform presets
   * (required topic terms + exam wording). Once attachments include a preset, the checked set is
   * exclusive so an admin uncheck is honored.
   */
  public Set<UUID> languageHelpTermIds(
      JsonNode question, List<PublishedTerm> bank, Set<UUID> requiredTopicTermIds) {
    Set<UUID> auto = autoMatchTermIds(bank, requiredTopicTermIds);
    if (question == null) {
      return auto;
    }
    JsonNode nodes = question.get("authoredTermAttachments");
    if (nodes == null || nodes.isNull() || nodes.isMissingNode() || !nodes.isArray()) {
      return auto;
    }
    Set<UUID> attached = new LinkedHashSet<>();
    for (AuthoredAttachment attachment : authoredAttachments(question)) {
      attached.add(attachment.termId());
    }
    if (attached.isEmpty()) {
      return auto;
    }
    for (UUID id : attached) {
      if (auto.contains(id)) {
        return Set.copyOf(attached);
      }
    }
    Set<UUID> lighting = new LinkedHashSet<>(auto);
    lighting.addAll(attached);
    return lighting;
  }

  public List<TermSpanMatch> matchSpans(
      List<JsonNode> blocks, List<PublishedTerm> bank, Set<UUID> autoMatchIds, int maxSpans) {
    List<SurfaceCandidate> candidates = new ArrayList<>();
    for (PublishedTerm term : bank) {
      if (!autoMatchIds.contains(term.id())) continue;
      for (Surface surface : term.surfaces()) {
        candidates.add(new SurfaceCandidate(term.id(), surface.text()));
      }
    }
    candidates.sort(Comparator.comparingInt((SurfaceCandidate c) -> c.text().length()).reversed());
    List<TermSpanMatch> spans = new ArrayList<>();
    for (int blockIndex = 0; blockIndex < blocks.size(); blockIndex++) {
      JsonNode block = blocks.get(blockIndex);
      if (!"TEXT".equals(text(block, "kind"))) continue;
      String body = text(block, "text");
      if (body == null || body.isEmpty()) continue;
      boolean[] used = occupiedByLatex(body);
      for (SurfaceCandidate candidate : candidates) {
        String needle = candidate.text();
        int from = 0;
        while (from <= body.length() - needle.length()) {
          int start = body.indexOf(needle, from);
          if (start < 0) break;
          int end = start + needle.length();
          if (!rangeUsed(used, start, end)) {
            markUsed(used, start, end);
            spans.add(new TermSpanMatch(candidate.termId(), needle, blockIndex, start, end));
            if (spans.size() >= maxSpans) return List.copyOf(spans);
          }
          from = start + 1;
        }
      }
    }
    return List.copyOf(spans);
  }

  public List<TermSpanMatch> mergeAuthoredSpans(
      List<TermSpanMatch> auto,
      List<JsonNode> blocks,
      List<PublishedTerm> bank,
      List<AuthoredAttachment> attachments,
      int maxSpans) {
    List<TermSpanMatch> merged = new ArrayList<>(auto);
    Set<String> seen = new HashSet<>();
    for (TermSpanMatch span : auto) {
      seen.add(spanKey(span));
    }
    Map<UUID, PublishedTerm> byId = new LinkedHashMap<>();
    for (PublishedTerm term : bank) {
      byId.put(term.id(), term);
    }
    for (AuthoredAttachment attachment : attachments) {
      PublishedTerm term = byId.get(attachment.termId());
      if (term == null) continue;
      List<String> surfaces = new ArrayList<>();
      if (attachment.surfaceForm() != null && !attachment.surfaceForm().isBlank()) {
        boolean known =
            term.surfaces().stream().anyMatch(s -> s.text().equals(attachment.surfaceForm()));
        if (!known) continue;
        surfaces.add(attachment.surfaceForm());
      } else {
        term.surfaces().forEach(s -> surfaces.add(s.text()));
      }
      for (String needle : surfaces) {
        for (int blockIndex = 0; blockIndex < blocks.size(); blockIndex++) {
          JsonNode block = blocks.get(blockIndex);
          if (!"TEXT".equals(text(block, "kind"))) continue;
          String body = text(block, "text");
          if (body == null) continue;
          boolean[] used = occupiedByLatex(body);
          int from = 0;
          while (from <= body.length() - needle.length()) {
            int start = body.indexOf(needle, from);
            if (start < 0) break;
            int end = start + needle.length();
            if (!rangeUsed(used, start, end)) {
              TermSpanMatch span = new TermSpanMatch(term.id(), needle, blockIndex, start, end);
              if (seen.add(spanKey(span))) {
                merged.add(span);
                if (merged.size() >= maxSpans) return List.copyOf(merged);
              }
            }
            from = start + 1;
          }
        }
      }
    }
    return List.copyOf(merged);
  }

  public List<AuthoredAttachment> authoredAttachments(JsonNode question) {
    JsonNode nodes = question.path("authoredTermAttachments");
    if (!nodes.isArray()) return List.of();
    List<AuthoredAttachment> attachments = new ArrayList<>();
    for (JsonNode node : nodes) {
      UUID termId = uuid(node.path("termId"));
      if (termId == null) continue;
      attachments.add(new AuthoredAttachment(termId, text(node, "surfaceForm")));
    }
    return List.copyOf(attachments);
  }

  public String definitionText(PublishedTerm term, String explanationLanguage) {
    return switch (explanationLanguage) {
      case "id" -> term.definitionId();
      case "en" -> term.definitionEn();
      case "zh-CN" -> term.definitionZh();
      default -> null;
    };
  }

  public String encounterSnippet(PublishedTerm term, String publishedFragment) {
    String source = publishedFragment;
    if (source == null || source.isBlank()) {
      source = term.example();
    }
    if (source == null || source.isBlank()) return null;
    return InlineLatex.truncatePreserving(source, 400);
  }

  public Optional<String> clozeSnippet(PublishedTerm term, String encounterSnippet) {
    String source = encounterSnippet;
    if (source == null || source.isBlank()) source = term.example();
    if (source == null || source.isBlank()) return Optional.empty();
    String primary = term.primary().text();
    int index = InlineLatex.indexOutsideReserved(source, primary);
    String matched = primary;
    if (index < 0) {
      for (Surface surface : term.surfaces()) {
        index = InlineLatex.indexOutsideReserved(source, surface.text());
        if (index >= 0) {
          matched = surface.text();
          break;
        }
      }
    }
    if (index < 0) return Optional.empty();
    String replaced =
        source.substring(0, index) + "______" + source.substring(index + matched.length());
    return Optional.of(InlineLatex.truncatePreserving(replaced, 400));
  }

  public LocalizedText localized(JsonNode node) {
    return new LocalizedText(
        text(node, "indonesian"), text(node, "english"), text(node, "simplifiedChinese"));
  }

  public JsonNode resourceById(JsonNode content, UUID resourceId) {
    JsonNode nodes = content.path("resources");
    if (!nodes.isArray()) return null;
    for (JsonNode resource : nodes) {
      if (resourceId.equals(uuid(resource.path("id")))) return resource;
    }
    return null;
  }

  public JsonNode questionById(JsonNode content, UUID questionId) {
    JsonNode nodes = content.path("questions");
    if (!nodes.isArray()) return null;
    for (JsonNode question : nodes) {
      if (questionId.equals(uuid(question.path("id")))) return question;
    }
    return null;
  }

  private static boolean[] occupiedByLatex(String body) {
    boolean[] used = new boolean[body.length()];
    for (InlineLatex.Range range : InlineLatex.reservedRanges(body)) {
      markUsed(used, range.start(), range.end());
    }
    return used;
  }

  private static boolean rangeUsed(boolean[] used, int start, int end) {
    for (int i = start; i < end && i < used.length; i++) {
      if (used[i]) return true;
    }
    return false;
  }

  private static void markUsed(boolean[] used, int start, int end) {
    for (int i = start; i < end && i < used.length; i++) {
      used[i] = true;
    }
  }

  private static String spanKey(TermSpanMatch span) {
    return span.termId()
        + ":"
        + span.blockIndex()
        + ":"
        + span.startOffset()
        + ":"
        + span.endOffset();
  }

  private static List<UUID> uuidArray(JsonNode node) {
    if (node == null || !node.isArray()) return List.of();
    List<UUID> values = new ArrayList<>();
    for (JsonNode item : node) {
      UUID id = uuid(item);
      if (id != null) values.add(id);
    }
    return values;
  }

  private static UUID uuid(JsonNode node) {
    if (node == null || node.isNull() || node.isMissingNode() || !node.isTextual()) return null;
    try {
      return UUID.fromString(node.asText());
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  private static String text(JsonNode node, String field) {
    if (node == null || !node.isObject()) return null;
    JsonNode value = node.get(field);
    if (value == null || value.isNull() || !value.isTextual()) return null;
    String text = value.asText();
    return text.isBlank() ? null : text;
  }

  public record Surface(String text, String pinyin) {}

  public record PublishedTerm(
      UUID id,
      String termClass,
      List<Surface> surfaces,
      String definitionId,
      String definitionEn,
      String definitionZh,
      String englishEquivalent,
      String symbols,
      String example,
      List<UUID> outlineItemIds) {
    public Surface primary() {
      return surfaces.getFirst();
    }

    public List<Surface> aliases() {
      return surfaces.size() <= 1 ? List.of() : surfaces.subList(1, surfaces.size());
    }
  }

  public record TermSpanMatch(
      UUID termId, String surfaceForm, int blockIndex, int startOffset, int endOffset) {}

  public record AuthoredAttachment(UUID termId, String surfaceForm) {}

  public record LocalizedText(String indonesian, String english, String simplifiedChinese) {}

  private record SurfaceCandidate(UUID termId, String text) {}
}
