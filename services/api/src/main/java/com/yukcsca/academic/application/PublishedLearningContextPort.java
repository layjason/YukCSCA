package com.yukcsca.academic.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Application-facing published-content reads for the agent module. Agent must not import academic
 * JPA. Academic never imports agent.
 */
public interface PublishedLearningContextPort {
  Optional<AuthorisedResourceContext> findPublishedLesson(UUID accountId, UUID resourceId);

  Optional<AuthorisedResourceContext> findPublishedRemediation(UUID accountId, UUID resourceId);

  Optional<AuthorisedTermContext> findPublishedTerm(UUID accountId, UUID termId);

  List<PublishedChunk> listPublishedChunks(UUID packageRevisionId);

  record AuthorisedResourceContext(
      UUID resourceId,
      String kind,
      UUID packageId,
      UUID packageRevisionId,
      String subject,
      String examLanguage,
      String title,
      List<String> availableExplanationLanguages,
      List<BlockExcerpt> blocks) {}

  record AuthorisedTermContext(
      UUID termId,
      UUID packageId,
      UUID packageRevisionId,
      String subject,
      String examLanguage,
      String surfaceForm,
      String definition,
      String example) {}

  record BlockExcerpt(int blockIndex, String kind, String text, String latex) {}

  record PublishedChunk(
      UUID packageId,
      UUID packageRevisionId,
      String sourceKind,
      UUID sourceId,
      Integer blockIndex,
      String explanationLanguage,
      String label,
      String body) {}
}
