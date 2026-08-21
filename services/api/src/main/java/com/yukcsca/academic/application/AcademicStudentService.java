package com.yukcsca.academic.application;

import com.yukcsca.academic.application.PublishedPackageProjector.ContentProgressProjection;
import com.yukcsca.academic.application.PublishedPackageProjector.LessonResourceProjection;
import com.yukcsca.academic.application.PublishedPackageProjector.LessonSummaryProjection;
import com.yukcsca.academic.application.PublishedPackageProjector.OfficialSourceProjection;
import com.yukcsca.academic.application.PublishedPackageProjector.OutlineNodeProjection;
import com.yukcsca.academic.application.PublishedPackageProjector.PublishedPackageSummaryProjection;
import com.yukcsca.academic.domain.AcademicImage;
import com.yukcsca.academic.domain.AcademicPackage;
import com.yukcsca.academic.domain.AcademicPackageStatus;
import com.yukcsca.academic.domain.AcademicRevision;
import com.yukcsca.academic.domain.StudentContentProgress;
import com.yukcsca.academic.domain.StudentContentProgressStatus;
import com.yukcsca.identity.application.CurrentAccount;
import com.yukcsca.identity.application.CurrentAuthenticationService;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

@Service
public class AcademicStudentService {
  private static final Logger LOGGER = LoggerFactory.getLogger(AcademicStudentService.class);
  private static final Set<String> EXPLANATION_LANGUAGES = Set.of("id", "en", "zh-CN");
  private static final Set<String> WRITABLE_STATUSES =
      Set.of(
          StudentContentProgressStatus.IN_PROGRESS.name(),
          StudentContentProgressStatus.CONTENT_COMPLETE.name());

  private final AcademicPackageStore packages;
  private final AcademicRevisionStore revisions;
  private final AcademicImageStore images;
  private final StudentContentProgressStore progressStore;
  private final PublishedPackageProjector projector;
  private final ContentAccessPolicy accessPolicy;
  private final CurrentAuthenticationService authentication;
  private final AcademicTerminologyService terminology;
  private final Clock clock;

  public AcademicStudentService(
      AcademicPackageStore packages,
      AcademicRevisionStore revisions,
      AcademicImageStore images,
      StudentContentProgressStore progressStore,
      PublishedPackageProjector projector,
      ContentAccessPolicy accessPolicy,
      CurrentAuthenticationService authentication,
      AcademicTerminologyService terminology,
      Clock clock) {
    this.packages = packages;
    this.revisions = revisions;
    this.images = images;
    this.progressStore = progressStore;
    this.projector = projector;
    this.accessPolicy = accessPolicy;
    this.authentication = authentication;
    this.terminology = terminology;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<PublishedPackageSummaryProjection> listPublishedPackages(UUID actorId) {
    requireStudent(actorId);
    return packages
        .findByStatusAndActiveRevisionIdIsNotNullOrderByCreatedAtAsc(
            AcademicPackageStatus.PUBLISHED)
        .stream()
        .map(
            academicPackage -> {
              AcademicRevision revision = requireActiveRevision(academicPackage);
              JsonNode content = projector.parseContent(revision.getContent());
              return projector.packageSummary(academicPackage, revision, content);
            })
        .toList();
  }

  @Transactional(readOnly = true)
  public PublishedPackageBrowseResult getPublishedPackageBrowse(UUID actorId, String subject) {
    requireStudent(actorId);
    AcademicPackage academicPackage = requirePublishedPackage(subject);
    AcademicRevision revision = requireActiveRevision(academicPackage);
    JsonNode content = projector.parseContent(revision.getContent());
    List<LessonResourceProjection> lessons = projector.lessons(content);
    List<StudentContentProgress> progressRows =
        progressStore.findByAccountIdAndPackageId(actorId, academicPackage.getId());
    Map<UUID, StudentContentProgress> progressByResource = indexProgress(progressRows);
    UUID activeRevisionId = revision.getId();
    Map<UUID, JsonNode> historicalContent =
        loadHistoricalRevisionContent(progressRows, activeRevisionId);
    List<OutlineNodeProjection> outline =
        attachTerminologyPreviews(
            actorId,
            academicPackage.getId(),
            content,
            projector.outline(
                content, lessons, progressByResource, activeRevisionId, historicalContent));
    LessonSummaryProjection continueLesson =
        attachTerminologyPreview(
            actorId,
            academicPackage.getId(),
            content,
            projector.continueLesson(
                lessons, progressRows, activeRevisionId, content, historicalContent));
    LOGGER.info(
        "academic.student.browse subject={} packageId={} revisionId={}",
        academicPackage.getSubject(),
        academicPackage.getId(),
        revision.getId());
    return new PublishedPackageBrowseResult(
        projector.packageSummary(academicPackage, revision, content),
        projector.officialSource(academicPackage.getSubject(), content),
        outline,
        continueLesson);
  }

  @Transactional(readOnly = true)
  public PublishedLessonResult getPublishedLesson(
      UUID actorId, String subject, UUID resourceId, String explanationLanguage) {
    return getPublishedStudyResource(
        actorId, subject, resourceId, explanationLanguage, "LESSON", "Lesson not found.");
  }

  @Transactional(readOnly = true)
  public PublishedRemediationResult getPublishedRemediation(
      UUID actorId, String subject, UUID resourceId, String explanationLanguage) {
    PublishedLessonResult base =
        getPublishedStudyResource(
            actorId,
            subject,
            resourceId,
            explanationLanguage,
            "REMEDIATION",
            "Remediation not found.");
    PublishedPackageProjector.StudyResourceProjection resource =
        loadStudyResource(subject, resourceId, "REMEDIATION", "Remediation not found.");
    return new PublishedRemediationResult(
        base.packageId(),
        base.packageRevisionId(),
        base.subject(),
        base.resourceId(),
        base.title(),
        base.availableExplanationLanguages(),
        base.requestedExplanationLanguage(),
        base.languageAvailable(),
        base.blocks(),
        base.contentProgress(),
        resource.outlineItemIds(),
        resource.objectiveIds());
  }

  @Transactional
  public ContentProgressProjection upsertContentProgress(
      UUID actorId,
      String subject,
      UUID resourceId,
      String status,
      Integer resumeBlockIndex,
      UUID expectedPackageRevisionId) {
    return upsertStudyResourceProgress(
        actorId,
        subject,
        resourceId,
        status,
        resumeBlockIndex,
        expectedPackageRevisionId,
        "LESSON",
        "Lesson not found.");
  }

  @Transactional
  public ContentProgressProjection upsertRemediationContentProgress(
      UUID actorId,
      String subject,
      UUID resourceId,
      String status,
      Integer resumeBlockIndex,
      UUID expectedPackageRevisionId) {
    return upsertStudyResourceProgress(
        actorId,
        subject,
        resourceId,
        status,
        resumeBlockIndex,
        expectedPackageRevisionId,
        "REMEDIATION",
        "Remediation not found.");
  }

  private PublishedLessonResult getPublishedStudyResource(
      UUID actorId,
      String subject,
      UUID resourceId,
      String explanationLanguage,
      String kind,
      String notFoundMessage) {
    requireStudent(actorId);
    if (explanationLanguage == null || !EXPLANATION_LANGUAGES.contains(explanationLanguage)) {
      throw new InvalidStudentAcademicRequestException(
          "explanationLanguage must be one of id, en, or zh-CN.");
    }
    AcademicPackage academicPackage = requirePublishedPackage(subject);
    AcademicRevision revision = requireActiveRevision(academicPackage);
    JsonNode content = projector.parseContent(revision.getContent());
    PublishedPackageProjector.StudyResourceProjection resource =
        projector.studyResourcesOfKind(content, kind).stream()
            .filter(value -> value.id().equals(resourceId))
            .findFirst()
            .orElseThrow(() -> new AcademicNotFoundException(notFoundMessage));
    StudentContentProgress progress =
        progressStore
            .findByAccountIdAndPackageIdAndResourceId(actorId, academicPackage.getId(), resourceId)
            .orElse(null);
    boolean available = resource.blocksByLanguage().containsKey(explanationLanguage);
    List<JsonNode> blocks =
        available ? resource.blocksByLanguage().get(explanationLanguage) : List.of();
    Map<UUID, JsonNode> historicalContent =
        progress == null
            ? Map.of()
            : loadHistoricalRevisionContent(List.of(progress), revision.getId());
    ContentProgressProjection progressProjection =
        projector.contentProgress(
            progress,
            available ? blocks.size() : null,
            revision.getId(),
            resourceId,
            content,
            historicalContent);
    LOGGER.info(
        "academic.student.{}_open subject={} resourceId={} explanationLanguage={}",
        kind.toLowerCase(),
        academicPackage.getSubject(),
        resourceId,
        explanationLanguage);
    AcademicTerminologyService.LessonTerminologyView lessonTerminology = null;
    if ("LESSON".equals(kind)) {
      lessonTerminology =
          terminology.lessonTerminology(
              actorId,
              academicPackage,
              revision,
              content,
              resource.id(),
              explanationLanguage,
              available ? blocks : List.of());
    }
    return new PublishedLessonResult(
        academicPackage.getId(),
        revision.getId(),
        academicPackage.getSubject(),
        resource.id(),
        resource.title(),
        resource.availableExplanationLanguages(),
        explanationLanguage,
        available,
        available ? blocks : null,
        progressProjection,
        lessonTerminology);
  }

  private List<OutlineNodeProjection> attachTerminologyPreviews(
      UUID actorId, UUID packageId, JsonNode content, List<OutlineNodeProjection> outline) {
    return outline.stream()
        .map(
            node ->
                new OutlineNodeProjection(
                    node.id(),
                    node.parentId(),
                    node.order(),
                    node.summary(),
                    node.productCoverage(),
                    node.lessons().stream()
                        .map(
                            lesson -> attachTerminologyPreview(actorId, packageId, content, lesson))
                        .toList()))
        .toList();
  }

  private LessonSummaryProjection attachTerminologyPreview(
      UUID actorId, UUID packageId, JsonNode content, LessonSummaryProjection lesson) {
    if (lesson == null) return null;
    AcademicTerminologyService.PreviewRefView ref =
        terminology.lessonPreviewRef(actorId, packageId, content, lesson.resourceId());
    if (ref == null) return lesson;
    return new LessonSummaryProjection(
        lesson.resourceId(),
        lesson.title(),
        lesson.outlineItemIds(),
        lesson.contentProgress(),
        new PublishedPackageProjector.TerminologyPreviewRefProjection(
            ref.resourceId(),
            new PublishedPackageProjector.PreviewProgressProjection(
                ref.progress().status(),
                ref.progress().updatedAt(),
                ref.progress().requiredSetUpdatedSinceCompleted())));
  }

  private PublishedPackageProjector.StudyResourceProjection loadStudyResource(
      String subject, UUID resourceId, String kind, String notFoundMessage) {
    AcademicPackage academicPackage = requirePublishedPackage(subject);
    AcademicRevision revision = requireActiveRevision(academicPackage);
    JsonNode content = projector.parseContent(revision.getContent());
    return projector.studyResourcesOfKind(content, kind).stream()
        .filter(value -> value.id().equals(resourceId))
        .findFirst()
        .orElseThrow(() -> new AcademicNotFoundException(notFoundMessage));
  }

  private ContentProgressProjection upsertStudyResourceProgress(
      UUID actorId,
      String subject,
      UUID resourceId,
      String status,
      Integer resumeBlockIndex,
      UUID expectedPackageRevisionId,
      String kind,
      String notFoundMessage) {
    requireStudent(actorId);
    if (status == null || !WRITABLE_STATUSES.contains(status)) {
      throw validation("status", "UNSUPPORTED");
    }
    StudentContentProgressStatus progressStatus = StudentContentProgressStatus.valueOf(status);
    if (progressStatus == StudentContentProgressStatus.IN_PROGRESS) {
      if (resumeBlockIndex == null) {
        throw validation("resumeBlockIndex", "REQUIRED");
      }
      if (resumeBlockIndex < 0) {
        throw validation("resumeBlockIndex", "OUT_OF_RANGE");
      }
    } else if (resumeBlockIndex != null && resumeBlockIndex < 0) {
      throw validation("resumeBlockIndex", "OUT_OF_RANGE");
    }

    AcademicPackage academicPackage = requirePublishedPackage(subject);
    AcademicRevision revision = requireActiveRevision(academicPackage);
    JsonNode content = projector.parseContent(revision.getContent());
    boolean resourceExists =
        projector.studyResourcesOfKind(content, kind).stream()
            .anyMatch(value -> value.id().equals(resourceId));
    if (!resourceExists) {
      throw new AcademicNotFoundException(notFoundMessage);
    }

    Instant now = now();
    // Soft diagnostic only: never fail the student loop on expected revision mismatches (slice
    // concurrency rules). Persist the active revision id so last_revision_id FK always resolves.
    if (expectedPackageRevisionId != null && !expectedPackageRevisionId.equals(revision.getId())) {
      LOGGER.info(
          "academic.student.progress revision_mismatch subject={} resourceId={} expected={} active={}",
          academicPackage.getSubject(),
          resourceId,
          expectedPackageRevisionId,
          revision.getId());
    }
    UUID activeRevisionId = revision.getId();
    StudentContentProgress existing =
        progressStore
            .findByAccountIdAndPackageIdAndResourceId(actorId, academicPackage.getId(), resourceId)
            .orElse(null);
    // CONTENT_COMPLETE stays complete on re-read. Preserve last_revision_id from the last
    // explicit CONTENT_COMPLETE write so republish can soft-signal updatedSinceCompleted until the
    // student marks complete again on the new active revision.
    boolean wasComplete =
        existing != null && existing.getStatus() == StudentContentProgressStatus.CONTENT_COMPLETE;
    boolean explicitComplete =
        progressStatus == StudentContentProgressStatus.CONTENT_COMPLETE
            && status != null
            && status.equals(StudentContentProgressStatus.CONTENT_COMPLETE.name());
    if (wasComplete && progressStatus == StudentContentProgressStatus.IN_PROGRESS) {
      progressStatus = StudentContentProgressStatus.CONTENT_COMPLETE;
    }
    UUID lastRevisionId;
    if (explicitComplete) {
      lastRevisionId = activeRevisionId;
    } else if (wasComplete && existing != null && existing.getLastRevisionId() != null) {
      lastRevisionId = existing.getLastRevisionId();
    } else {
      lastRevisionId = activeRevisionId;
    }
    StudentContentProgress saved;
    if (existing == null) {
      saved =
          progressStore.save(
              new StudentContentProgress(
                  actorId,
                  academicPackage.getId(),
                  academicPackage.getSubject(),
                  resourceId,
                  progressStatus,
                  resumeBlockIndex,
                  lastRevisionId,
                  now));
    } else {
      existing.replace(progressStatus, resumeBlockIndex, lastRevisionId, now);
      saved = progressStore.save(existing);
    }
    LOGGER.info(
        "academic.student.progress subject={} resourceId={} kind={} status={}",
        academicPackage.getSubject(),
        resourceId,
        kind,
        progressStatus);
    Map<UUID, JsonNode> historicalContent =
        loadHistoricalRevisionContent(List.of(saved), activeRevisionId);
    return projector.contentProgress(
        saved, null, activeRevisionId, resourceId, content, historicalContent);
  }

  /**
   * Loads prior published revision JSON for completed progress rows whose last complete revision
   * differs from the active one. Used to soft-signal only when that resource actually changed.
   */
  private Map<UUID, JsonNode> loadHistoricalRevisionContent(
      List<StudentContentProgress> progressRows, UUID activeRevisionId) {
    Set<UUID> needed = new HashSet<>();
    for (StudentContentProgress row : progressRows) {
      if (row.getStatus() != StudentContentProgressStatus.CONTENT_COMPLETE) {
        continue;
      }
      UUID last = row.getLastRevisionId();
      if (last != null && activeRevisionId != null && !last.equals(activeRevisionId)) {
        needed.add(last);
      }
    }
    if (needed.isEmpty()) {
      return Map.of();
    }
    Map<UUID, JsonNode> byRevision = new HashMap<>();
    for (UUID revisionId : needed) {
      revisions
          .findById(revisionId)
          .ifPresent(
              historical -> {
                try {
                  byRevision.put(revisionId, projector.parseContent(historical.getContent()));
                } catch (RuntimeException exception) {
                  LOGGER.warn(
                      "academic.student.progress historical_revision_unreadable revisionId={}",
                      revisionId);
                }
              });
    }
    return byRevision;
  }

  @Transactional(readOnly = true)
  public AcademicImageContent getPublishedImage(UUID actorId, UUID imageId) {
    requireStudent(actorId);
    AcademicImage image =
        images
            .findById(imageId)
            .orElseThrow(() -> new AcademicNotFoundException("Image not found."));
    if (!image.isSanitized()) {
      throw new IllegalStateException("Academic image has not passed sanitization.");
    }
    boolean referenced =
        packages
            .findByStatusAndActiveRevisionIdIsNotNullOrderByCreatedAtAsc(
                AcademicPackageStatus.PUBLISHED)
            .stream()
            .anyMatch(
                academicPackage -> {
                  AcademicRevision revision = requireActiveRevision(academicPackage);
                  JsonNode content = projector.parseContent(revision.getContent());
                  return projector.referencesImage(content, imageId);
                });
    if (!referenced) {
      throw new AcademicNotFoundException("Image not found.");
    }
    return new AcademicImageContent(image.getMediaType(), image.getContent());
  }

  private CurrentAccount requireStudent(UUID actorId) {
    CurrentAccount account = authentication.requireAccount(actorId);
    if (!accessPolicy.mayReadPublishedContent(account)) {
      throw new AcademicAccessDeniedException();
    }
    return account;
  }

  private AcademicPackage requirePublishedPackage(String subject) {
    if (subject == null || subject.isBlank()) {
      throw new AcademicNotFoundException("Published package not found.");
    }
    return packages
        .findBySubjectAndStatusAndActiveRevisionIdIsNotNull(
            subject, AcademicPackageStatus.PUBLISHED)
        .orElseThrow(() -> new AcademicNotFoundException("Published package not found."));
  }

  private AcademicRevision requireActiveRevision(AcademicPackage academicPackage) {
    UUID revisionId = academicPackage.getActiveRevisionId();
    if (revisionId == null) {
      throw new AcademicNotFoundException("Published package not found.");
    }
    return revisions
        .findById(revisionId)
        .orElseThrow(() -> new IllegalStateException("Active academic revision is missing."));
  }

  private static Map<UUID, StudentContentProgress> indexProgress(
      List<StudentContentProgress> rows) {
    Map<UUID, StudentContentProgress> index = new HashMap<>();
    for (StudentContentProgress row : rows) {
      index.put(row.getResourceId(), row);
    }
    return index;
  }

  private Instant now() {
    return clock.instant().truncatedTo(ChronoUnit.MICROS);
  }

  private static ContentProgressValidationException validation(String path, String code) {
    return new ContentProgressValidationException(
        List.of(new ContentProgressViolation(path, code)));
  }

  public record PublishedPackageBrowseResult(
      PublishedPackageSummaryProjection packageSummary,
      OfficialSourceProjection officialSource,
      List<OutlineNodeProjection> outline,
      LessonSummaryProjection continueLesson) {}

  public record PublishedLessonResult(
      UUID packageId,
      UUID packageRevisionId,
      String subject,
      UUID resourceId,
      PublishedPackageProjector.LocalizedTextProjection title,
      List<String> availableExplanationLanguages,
      String requestedExplanationLanguage,
      boolean languageAvailable,
      List<JsonNode> blocks,
      ContentProgressProjection contentProgress,
      AcademicTerminologyService.LessonTerminologyView terminology) {}

  public record PublishedRemediationResult(
      UUID packageId,
      UUID packageRevisionId,
      String subject,
      UUID resourceId,
      PublishedPackageProjector.LocalizedTextProjection title,
      List<String> availableExplanationLanguages,
      String requestedExplanationLanguage,
      boolean languageAvailable,
      List<JsonNode> blocks,
      ContentProgressProjection contentProgress,
      List<UUID> outlineItemIds,
      List<UUID> objectiveIds) {}
}
