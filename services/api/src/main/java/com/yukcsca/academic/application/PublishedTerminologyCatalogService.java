package com.yukcsca.academic.application;

import com.yukcsca.academic.application.TerminologyProjector.PublishedTerm;
import com.yukcsca.academic.application.TerminologyProjector.TermSpanMatch;
import com.yukcsca.academic.domain.AcademicRevision;
import com.yukcsca.academic.domain.StudentTerminologyNotebook;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

@Service
public class PublishedTerminologyCatalogService implements PublishedTerminologyCatalog {
  private final AcademicRevisionStore revisions;
  private final PublishedPackageProjector packageProjector;
  private final TerminologyProjector terms;
  private final StudentTerminologyNotebookStore notebook;

  public PublishedTerminologyCatalogService(
      AcademicRevisionStore revisions,
      PublishedPackageProjector packageProjector,
      TerminologyProjector terms,
      StudentTerminologyNotebookStore notebook) {
    this.revisions = revisions;
    this.packageProjector = packageProjector;
    this.terms = terms;
    this.notebook = notebook;
  }

  @Override
  @Transactional(readOnly = true)
  public boolean hasPublishedTermBank(UUID packageRevisionId) {
    return loadContent(packageRevisionId).map(terms::hasPublishedTermBank).orElse(false);
  }

  @Override
  @Transactional(readOnly = true)
  public LanguageHelpProjection languageHelpForQuestion(
      UUID packageRevisionId, UUID questionId, List<JsonNode> stem, UUID accountId) {
    JsonNode content = loadContent(packageRevisionId).orElse(null);
    if (content == null || !terms.hasPublishedTermBank(content)) {
      return new LanguageHelpProjection(List.of());
    }
    List<PublishedTerm> bank = terms.terms(content);
    JsonNode question = terms.questionById(content, questionId);
    Set<UUID> required = new HashSet<>();
    if (question != null) {
      terms
          .terminologyBoundTo(content, uuidList(question.path("outlineItemIds")))
          .ifPresent(resource -> required.addAll(terms.requiredTermIds(resource)));
    }
    Set<UUID> lighting = terms.languageHelpTermIds(question, bank, required);
    List<TermSpanMatch> spans = terms.matchSpans(stem, bank, lighting, 64);
    Set<UUID> owned =
        notebookTermIds(accountId, spans.stream().map(TermSpanMatch::termId).distinct().toList());
    return new LanguageHelpProjection(
        spans.stream()
            .map(
                span ->
                    new LanguageHelpSpanProjection(
                        span.termId(),
                        span.surfaceForm(),
                        span.blockIndex(),
                        span.startOffset(),
                        span.endOffset(),
                        owned.contains(span.termId())))
            .toList());
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<TermMatch> matchSelectedText(UUID packageRevisionId, String selectedText) {
    return loadContent(packageRevisionId)
        .flatMap(content -> terms.matchSelectedText(terms.terms(content), selectedText))
        .map(term -> new TermMatch(term.id(), term.primary().text()));
  }

  private Set<UUID> notebookTermIds(UUID accountId, List<UUID> termIds) {
    if (termIds.isEmpty()) return Set.of();
    Set<UUID> owned = new HashSet<>();
    for (StudentTerminologyNotebook row : notebook.findByAccountIdAndTermIdIn(accountId, termIds)) {
      owned.add(row.getTermId());
    }
    return owned;
  }

  private Optional<JsonNode> loadContent(UUID packageRevisionId) {
    if (packageRevisionId == null) return Optional.empty();
    return revisions
        .findById(packageRevisionId)
        .map(AcademicRevision::getContent)
        .map(packageProjector::parseContent);
  }

  private static List<UUID> uuidList(JsonNode values) {
    if (values == null || !values.isArray()) return List.of();
    return java.util.stream.StreamSupport.stream(values.spliterator(), false)
        .map(
            node -> {
              try {
                return UUID.fromString(node.asText());
              } catch (RuntimeException exception) {
                return null;
              }
            })
        .filter(java.util.Objects::nonNull)
        .toList();
  }
}
