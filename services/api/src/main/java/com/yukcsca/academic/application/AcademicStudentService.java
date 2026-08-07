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
  private final Clock clock;

  public AcademicStudentService(
      AcademicPackageStore packages,
      AcademicRevisionStore revisions,
      AcademicImageStore images,
      StudentContentProgressStore progressStore,
      PublishedPackageProjector projector,
      ContentAccessPolicy accessPolicy,
      CurrentAuthenticationService authentication,
      Clock clock) {
    this.packages = packages;
    this.revisions = revisions;
    this.images = images;
    this.progressStore = progressStore;
    this.projector = projector;
    this.accessPolicy = accessPolicy;
    this.authentication = authentication;
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
    List<OutlineNodeProjection> outline = projector.outline(content, lessons, progressByResource);
    LessonSummaryProjection continueLesson = projector.continueLesson(lessons, progressRows);
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
    requireStudent(actorId);
    if (explanationLanguage == null || !EXPLANATION_LANGUAGES.contains(explanationLanguage)) {
      throw new InvalidStudentAcademicRequestException(
          "explanationLanguage must be one of id, en, or zh-CN.");
    }
    AcademicPackage academicPackage = requirePublishedPackage(subject);
    AcademicRevision revision = requireActiveRevision(academicPackage);
    JsonNode content = projector.parseContent(revision.getContent());
    LessonResourceProjection lesson =
        projector.lessons(content).stream()
            .filter(value -> value.id().equals(resourceId))
            .findFirst()
            .orElseThrow(() -> new AcademicNotFoundException("Lesson not found."));
    StudentContentProgress progress =
        progressStore
            .findByAccountIdAndPackageIdAndResourceId(actorId, academicPackage.getId(), resourceId)
            .orElse(null);
    boolean available = lesson.blocksByLanguage().containsKey(explanationLanguage);
    List<JsonNode> blocks =
        available ? lesson.blocksByLanguage().get(explanationLanguage) : List.of();
    ContentProgressProjection progressProjection =
        projector.contentProgress(progress, available ? blocks.size() : null);
    LOGGER.info(
        "academic.student.lesson_open subject={} resourceId={} explanationLanguage={}",
        academicPackage.getSubject(),
        resourceId,
        explanationLanguage);
    return new PublishedLessonResult(
        academicPackage.getId(),
        revision.getId(),
        academicPackage.getSubject(),
        lesson.id(),
        lesson.title(),
        lesson.availableExplanationLanguages(),
        explanationLanguage,
        available,
        available ? blocks : null,
        progressProjection);
  }

  @Transactional
  public ContentProgressProjection upsertContentProgress(
      UUID actorId,
      String subject,
      UUID resourceId,
      String status,
      Integer resumeBlockIndex,
      UUID expectedPackageRevisionId) {
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
    boolean lessonExists =
        projector.lessons(content).stream().anyMatch(value -> value.id().equals(resourceId));
    if (!lessonExists) {
      throw new AcademicNotFoundException("Lesson not found.");
    }

    Instant now = now();
    UUID lastRevisionId =
        expectedPackageRevisionId != null ? expectedPackageRevisionId : revision.getId();
    StudentContentProgress existing =
        progressStore
            .findByAccountIdAndPackageIdAndResourceId(actorId, academicPackage.getId(), resourceId)
            .orElse(null);
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
        "academic.student.progress subject={} resourceId={} status={}",
        academicPackage.getSubject(),
        resourceId,
        progressStatus);
    return projector.contentProgress(saved, null);
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
      ContentProgressProjection contentProgress) {}
}
