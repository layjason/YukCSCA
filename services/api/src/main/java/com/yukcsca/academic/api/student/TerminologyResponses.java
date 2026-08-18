package com.yukcsca.academic.api.student;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.yukcsca.academic.application.AcademicTerminologyService.LessonTerminologyView;
import com.yukcsca.academic.application.AcademicTerminologyService.MatchTargetView;
import com.yukcsca.academic.application.AcademicTerminologyService.NotebookDetailView;
import com.yukcsca.academic.application.AcademicTerminologyService.NotebookEntryView;
import com.yukcsca.academic.application.AcademicTerminologyService.NotebookListView;
import com.yukcsca.academic.application.AcademicTerminologyService.PreviewCheckView;
import com.yukcsca.academic.application.AcademicTerminologyService.PreviewProgressView;
import com.yukcsca.academic.application.AcademicTerminologyService.PreviewRefView;
import com.yukcsca.academic.application.AcademicTerminologyService.ReviewOptionView;
import com.yukcsca.academic.application.AcademicTerminologyService.TermCardView;
import com.yukcsca.academic.application.AcademicTerminologyService.TermDefinitionView;
import com.yukcsca.academic.application.AcademicTerminologyService.TermLookupView;
import com.yukcsca.academic.application.AcademicTerminologyService.TermMetInView;
import com.yukcsca.academic.application.AcademicTerminologyService.TermReviewPromptView;
import com.yukcsca.academic.application.AcademicTerminologyService.TermReviewResultView;
import com.yukcsca.academic.application.AcademicTerminologyService.TermSpanView;
import com.yukcsca.academic.application.AcademicTerminologyService.TermSurfaceView;
import com.yukcsca.academic.application.AcademicTerminologyService.TerminologyPreviewResult;
import com.yukcsca.academic.application.TerminologyProjector.LocalizedText;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

final class TerminologyResponses {
  private TerminologyResponses() {}

  static Map<String, Object> preview(TerminologyPreviewResult value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("packageId", value.packageId());
    body.put("packageRevisionId", value.packageRevisionId());
    body.put("subject", value.subject());
    body.put("resourceId", value.resourceId());
    body.put("title", localized(value.title()));
    body.put("outlineItemIds", value.outlineItemIds());
    body.put("lessonResourceIds", value.lessonResourceIds());
    body.put("requestedExplanationLanguage", value.requestedExplanationLanguage());
    body.put("terms", value.terms().stream().map(TerminologyResponses::card).toList());
    body.put("matchingPairsAvailable", value.matchingPairsAvailable());
    body.put(
        "matchTargets",
        value.matchTargets().stream().map(TerminologyResponses::matchTarget).toList());
    body.put("previewProgress", progress(value.previewProgress()));
    return body;
  }

  static Map<String, Object> progress(PreviewProgressView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("status", value.status());
    body.put("updatedAt", value.updatedAt());
    body.put("requiredSetUpdatedSinceCompleted", value.requiredSetUpdatedSinceCompleted());
    return body;
  }

  static Map<String, Object> check(PreviewCheckView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("kind", value.kind());
    body.put("correctCount", value.correctCount());
    body.put("totalCount", value.totalCount());
    body.put("previewProgress", progress(value.previewProgress()));
    return body;
  }

  static Map<String, Object> lookup(TermLookupView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("outcome", value.outcome());
    if ("MATCHED".equals(value.outcome())) {
      body.put("card", card(value.card()));
      body.put("alreadyInNotebook", value.alreadyInNotebook());
      body.put("entry", entry(value.entry()));
    }
    return body;
  }

  static Map<String, Object> notebookList(NotebookListView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("items", value.items().stream().map(TerminologyResponses::entry).toList());
    body.put("nextCursor", value.nextCursor());
    return body;
  }

  static Map<String, Object> notebookDetail(NotebookDetailView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("entry", entry(value.entry()));
    body.put("card", card(value.card()));
    return body;
  }

  static Map<String, Object> review(TermReviewResultView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("termId", value.termId());
    body.put("kind", value.kind());
    body.put("correct", value.correct());
    body.put("correctOptionKey", value.correctOptionKey());
    body.put("familiarity", value.familiarity());
    body.put("due", value.due());
    body.put("entry", entry(value.entry()));
    return body;
  }

  static Map<String, Object> previewRef(PreviewRefView value) {
    if (value == null) return null;
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("resourceId", value.resourceId());
    body.put("progress", progress(value.progress()));
    return body;
  }

  static Map<String, Object> lessonTerminology(LessonTerminologyView value) {
    if (value == null) return null;
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("previewResourceId", value.previewResourceId());
    body.put("rail", value.rail().stream().map(TerminologyResponses::card).toList());
    body.put("spans", value.spans().stream().map(TerminologyResponses::span).toList());
    return body;
  }

  static Map<String, Object> card(TermCardView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("termId", value.termId());
    body.put("subject", value.subject());
    body.put("packageId", value.packageId());
    body.put("termClass", value.termClass());
    body.put("primarySurface", surface(value.primarySurface()));
    body.put("aliases", value.aliases().stream().map(TerminologyResponses::surface).toList());
    body.put("definition", definition(value.definition()));
    body.put("englishEquivalent", value.englishEquivalent());
    body.put("domainMeaning", value.domainMeaning());
    body.put("symbols", value.symbols());
    body.put("example", value.example());
    body.put("outlineItemIds", value.outlineItemIds());
    return body;
  }

  private static Map<String, Object> surface(TermSurfaceView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("text", value.text());
    body.put("pinyin", value.pinyin());
    body.put("audioAvailable", value.audioAvailable());
    return body;
  }

  private static Map<String, Object> definition(TermDefinitionView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("availability", value.availability());
    if ("AVAILABLE".equals(value.availability())) {
      body.put("language", value.language());
      body.put("text", value.text());
    } else {
      body.put("requestedLanguage", value.language());
    }
    return body;
  }

  private static Map<String, Object> matchTarget(MatchTargetView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("termId", value.termId());
    body.put("matchKey", value.matchKey());
    body.put("promptSurface", value.promptSurface());
    body.put("matchLabel", value.matchLabel());
    return body;
  }

  private static Map<String, Object> entry(NotebookEntryView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("termId", value.termId());
    body.put("subject", value.subject());
    body.put("packageId", value.packageId());
    body.put("termClass", value.termClass());
    body.put("primarySurface", surface(value.primarySurface()));
    body.put("familiarity", value.familiarity());
    body.put("due", value.due());
    body.put("lastReviewAt", value.lastReviewAt());
    body.put("sources", value.sources());
    body.put("metIn", metIn(value.metIn()));
    body.put("pendingReview", pending(value.pendingReview()));
    return body;
  }

  private static Map<String, Object> metIn(TermMetInView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("source", value.source());
    body.put("place", value.place());
    body.put("topicTitle", localized(value.topicTitle()));
    body.put("outlineItemId", value.outlineItemId());
    body.put("at", value.at());
    return body;
  }

  private static Map<String, Object> pending(TermReviewPromptView value) {
    if (value == null) return null;
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("kind", value.kind());
    if ("CONTEXT_CLOZE".equals(value.kind())) {
      body.put("snippet", value.snippet());
    } else {
      body.put("promptSurface", value.promptSurface());
    }
    body.put("options", value.options().stream().map(TerminologyResponses::option).toList());
    return body;
  }

  private static Map<String, Object> option(ReviewOptionView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("key", value.key());
    body.put("label", value.label());
    return body;
  }

  private static Map<String, Object> span(TermSpanView value) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("termId", value.termId());
    body.put("surfaceForm", value.surfaceForm());
    body.put("blockIndex", value.blockIndex());
    body.put("startOffset", value.startOffset());
    body.put("endOffset", value.endOffset());
    return body;
  }

  static Map<String, String> localized(LocalizedText value) {
    if (value == null) return null;
    Map<String, String> body = new LinkedHashMap<>();
    body.put("indonesian", value.indonesian());
    body.put("english", value.english());
    body.put("simplifiedChinese", value.simplifiedChinese());
    return body;
  }

  @JsonInclude(JsonInclude.Include.NON_NULL)
  record Unused(UUID id, Instant at) {}
}
