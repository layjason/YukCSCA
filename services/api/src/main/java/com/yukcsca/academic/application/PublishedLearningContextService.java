package com.yukcsca.academic.application;

import com.yukcsca.academic.application.PublishedPackageProjector.LocalizedTextProjection;
import com.yukcsca.academic.application.PublishedPackageProjector.StudyResourceProjection;
import com.yukcsca.academic.application.TerminologyProjector.PublishedTerm;
import com.yukcsca.academic.domain.AcademicPackage;
import com.yukcsca.academic.domain.AcademicPackageStatus;
import com.yukcsca.academic.domain.AcademicRevision;
import com.yukcsca.identity.application.CurrentAuthenticationService;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

@Service
public class PublishedLearningContextService implements PublishedLearningContextPort {
  private final AcademicPackageStore packages;
  private final AcademicRevisionStore revisions;
  private final PublishedPackageProjector projector;
  private final TerminologyProjector terms;
  private final ContentAccessPolicy accessPolicy;
  private final CurrentAuthenticationService authentication;

  public PublishedLearningContextService(
      AcademicPackageStore packages,
      AcademicRevisionStore revisions,
      PublishedPackageProjector projector,
      TerminologyProjector terms,
      ContentAccessPolicy accessPolicy,
      CurrentAuthenticationService authentication) {
    this.packages = packages;
    this.revisions = revisions;
    this.projector = projector;
    this.terms = terms;
    this.accessPolicy = accessPolicy;
    this.authentication = authentication;
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<AuthorisedResourceContext> findPublishedLesson(
      UUID accountId, UUID resourceId, String explanationLanguage) {
    return findPublishedResource(accountId, resourceId, "LESSON", explanationLanguage);
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<AuthorisedResourceContext> findPublishedRemediation(
      UUID accountId, UUID resourceId, String explanationLanguage) {
    return findPublishedResource(accountId, resourceId, "REMEDIATION", explanationLanguage);
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<AuthorisedTermContext> findPublishedTerm(
      UUID accountId, UUID termId, String explanationLanguage) {
    if (!mayRead(accountId) || termId == null) return Optional.empty();
    for (PublishedPackage pkg : publishedPackages()) {
      Optional<PublishedTerm> term = terms.findTerm(terms.terms(pkg.content()), termId);
      if (term.isEmpty()) continue;
      PublishedTerm value = term.get();
      String surface = value.primary() == null ? "" : value.primary().text();
      String definition = definitionFor(value, explanationLanguage);
      return Optional.of(
          new AuthorisedTermContext(
              value.id(),
              pkg.packageId(),
              pkg.revisionId(),
              pkg.subject(),
              examLanguage(pkg.content()),
              surface,
              definition == null ? "" : definition,
              value.example() == null ? "" : value.example()));
    }
    return Optional.empty();
  }

  @Override
  @Transactional(readOnly = true)
  public List<PublishedChunk> listPublishedChunks(UUID packageRevisionId) {
    if (packageRevisionId == null) return List.of();
    AcademicRevision revision = revisions.findById(packageRevisionId).orElse(null);
    if (revision == null) return List.of();
    AcademicPackage academicPackage = packages.findById(revision.getPackageId()).orElse(null);
    if (academicPackage == null
        || academicPackage.getStatus() != AcademicPackageStatus.PUBLISHED
        || !packageRevisionId.equals(academicPackage.getActiveRevisionId())) {
      return List.of();
    }
    JsonNode content = projector.parseContent(revision.getContent());
    List<PublishedChunk> chunks = new ArrayList<>();
    chunks.addAll(resourceChunks(academicPackage, revision.getId(), content, "LESSON"));
    chunks.addAll(resourceChunks(academicPackage, revision.getId(), content, "REMEDIATION"));
    chunks.addAll(termChunks(academicPackage, revision.getId(), content));
    return List.copyOf(chunks);
  }

  private Optional<AuthorisedResourceContext> findPublishedResource(
      UUID accountId, UUID resourceId, String kind, String explanationLanguage) {
    if (!mayRead(accountId) || resourceId == null) return Optional.empty();
    for (PublishedPackage pkg : publishedPackages()) {
      Optional<StudyResourceProjection> match =
          projector.studyResourcesOfKind(pkg.content(), kind).stream()
              .filter(resource -> resource.id().equals(resourceId))
              .findFirst();
      if (match.isEmpty()) continue;
      StudyResourceProjection resource = match.get();
      String language =
          preferredLanguage(resource.availableExplanationLanguages(), explanationLanguage);
      List<JsonNode> blocks =
          language == null
              ? List.of()
              : resource.blocksByLanguage().getOrDefault(language, List.of());
      return Optional.of(
          new AuthorisedResourceContext(
              resource.id(),
              kind,
              pkg.packageId(),
              pkg.revisionId(),
              pkg.subject(),
              examLanguage(pkg.content()),
              title(resource.title(), language),
              resource.availableExplanationLanguages(),
              excerpts(blocks)));
    }
    return Optional.empty();
  }

  private List<PublishedChunk> resourceChunks(
      AcademicPackage academicPackage, UUID revisionId, JsonNode content, String kind) {
    List<PublishedChunk> chunks = new ArrayList<>();
    for (StudyResourceProjection resource : projector.studyResourcesOfKind(content, kind)) {
      for (String language : resource.availableExplanationLanguages()) {
        List<JsonNode> blocks = resource.blocksByLanguage().getOrDefault(language, List.of());
        List<BlockExcerpt> excerpts = excerpts(blocks);
        int i = 0;
        while (i < excerpts.size()) {
          BlockExcerpt first = excerpts.get(i);
          StringBuilder body = new StringBuilder();
          appendExcerpt(body, first);
          Integer blockIndex = first.blockIndex();
          if (i + 1 < excerpts.size()
              && "TEXT".equals(first.kind())
              && "MATH".equals(excerpts.get(i + 1).kind())) {
            appendExcerpt(body, excerpts.get(i + 1));
            i += 2;
          } else {
            i += 1;
          }
          if (body.isEmpty()) continue;
          chunks.add(
              new PublishedChunk(
                  academicPackage.getId(),
                  revisionId,
                  kind,
                  resource.id(),
                  blockIndex,
                  language,
                  clip(title(resource.title(), language), 120),
                  body.toString()));
        }
      }
    }
    return chunks;
  }

  private List<PublishedChunk> termChunks(
      AcademicPackage academicPackage, UUID revisionId, JsonNode content) {
    List<PublishedChunk> chunks = new ArrayList<>();
    for (PublishedTerm term : terms.terms(content)) {
      String surface = term.primary() == null ? "term" : term.primary().text();
      addTermChunk(chunks, academicPackage, revisionId, term, "en", surface, term.definitionEn());
      addTermChunk(chunks, academicPackage, revisionId, term, "id", surface, term.definitionId());
      addTermChunk(
          chunks, academicPackage, revisionId, term, "zh-CN", surface, term.definitionZh());
    }
    return chunks;
  }

  private static void addTermChunk(
      List<PublishedChunk> chunks,
      AcademicPackage academicPackage,
      UUID revisionId,
      PublishedTerm term,
      String language,
      String surface,
      String definition) {
    String body = firstNonBlank(definition, term.example(), surface);
    if (body == null || body.isBlank()) return;
    chunks.add(
        new PublishedChunk(
            academicPackage.getId(),
            revisionId,
            "TERMINOLOGY",
            term.id(),
            null,
            language,
            clip(surface, 120),
            body));
  }

  private List<PublishedPackage> publishedPackages() {
    List<PublishedPackage> result = new ArrayList<>();
    for (AcademicPackage academicPackage :
        packages.findByStatusAndActiveRevisionIdIsNotNullOrderByCreatedAtAsc(
            AcademicPackageStatus.PUBLISHED)) {
      UUID revisionId = academicPackage.getActiveRevisionId();
      AcademicRevision revision = revisions.findById(revisionId).orElse(null);
      if (revision == null) continue;
      result.add(
          new PublishedPackage(
              academicPackage.getId(),
              revision.getId(),
              academicPackage.getSubject(),
              projector.parseContent(revision.getContent())));
    }
    return result;
  }

  private boolean mayRead(UUID accountId) {
    return accessPolicy.mayReadPublishedContent(authentication.requireAccount(accountId));
  }

  private String examLanguage(JsonNode content) {
    List<String> languages = projector.examLanguages(content);
    if (languages.contains("en")) return "en";
    if (!languages.isEmpty()) return languages.getFirst();
    return "en";
  }

  private static List<BlockExcerpt> excerpts(List<JsonNode> blocks) {
    List<BlockExcerpt> excerpts = new ArrayList<>();
    for (int index = 0; index < blocks.size(); index++) {
      JsonNode block = blocks.get(index);
      String kind = block.path("kind").asText("");
      if ("TEXT".equals(kind)) {
        String text = block.path("text").asText("");
        if (!text.isBlank()) {
          excerpts.add(new BlockExcerpt(index, kind, text, null));
        }
      } else if ("MATH".equals(kind)) {
        String latex = block.path("latex").asText("");
        if (!latex.isBlank()) {
          excerpts.add(new BlockExcerpt(index, kind, null, latex));
        }
      }
    }
    return excerpts;
  }

  private static void appendExcerpt(StringBuilder body, BlockExcerpt excerpt) {
    if (excerpt.text() != null && !excerpt.text().isBlank()) {
      if (!body.isEmpty()) body.append('\n');
      body.append(excerpt.text());
    }
    if (excerpt.latex() != null && !excerpt.latex().isBlank()) {
      if (!body.isEmpty()) body.append('\n');
      body.append(excerpt.latex());
    }
  }

  private static String preferredLanguage(List<String> languages, String requested) {
    if (requested != null && !requested.isBlank() && languages.contains(requested)) {
      return requested;
    }
    if (languages.contains("en")) return "en";
    if (languages.contains("id")) return "id";
    if (languages.contains("zh-CN")) return "zh-CN";
    return languages.isEmpty() ? null : languages.getFirst();
  }

  private static String definitionFor(PublishedTerm term, String language) {
    return switch (language == null ? "" : language) {
      case "id" -> firstNonBlank(term.definitionId(), term.definitionEn(), term.definitionZh());
      case "zh-CN" -> firstNonBlank(term.definitionZh(), term.definitionEn(), term.definitionId());
      default -> firstNonBlank(term.definitionEn(), term.definitionId(), term.definitionZh());
    };
  }

  private static String title(LocalizedTextProjection title, String language) {
    if (title == null) return "Content";
    return switch (language == null ? "en" : language) {
      case "id" -> firstNonBlank(title.indonesian(), title.english(), title.simplifiedChinese());
      case "zh-CN" -> firstNonBlank(title.simplifiedChinese(), title.english(), title.indonesian());
      default -> firstNonBlank(title.english(), title.indonesian(), title.simplifiedChinese());
    };
  }

  private static String firstNonBlank(String... values) {
    for (String value : values) {
      if (value != null && !value.isBlank()) return value;
    }
    return "Content";
  }

  private static String clip(String value, int max) {
    if (value == null) return "Content";
    return value.length() <= max ? value : value.substring(0, max);
  }

  private record PublishedPackage(
      UUID packageId, UUID revisionId, String subject, JsonNode content) {}
}
