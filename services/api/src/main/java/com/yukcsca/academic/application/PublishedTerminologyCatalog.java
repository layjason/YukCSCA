package com.yukcsca.academic.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import tools.jackson.databind.JsonNode;

/**
 * Application-facing term bank for assessment Language help. Assessment must not import academic
 * JPA.
 */
public interface PublishedTerminologyCatalog {
  boolean hasPublishedTermBank(UUID packageRevisionId);

  LanguageHelpProjection languageHelpForQuestion(
      UUID packageRevisionId, UUID questionId, List<JsonNode> stem, UUID accountId);

  Optional<TermMatch> matchSelectedText(UUID packageRevisionId, String selectedText);

  record LanguageHelpProjection(List<LanguageHelpSpanProjection> spans) {}

  record LanguageHelpSpanProjection(
      UUID termId,
      String surfaceForm,
      int blockIndex,
      int startOffset,
      int endOffset,
      boolean alreadyInNotebook) {}

  record TermMatch(UUID termId, String surfaceForm) {}
}
