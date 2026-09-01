package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.AcademicAudit;
import com.yukcsca.academic.domain.AcademicImage;
import com.yukcsca.academic.domain.AcademicPackage;
import com.yukcsca.academic.domain.AcademicPackageStatus;
import com.yukcsca.academic.domain.AcademicRevision;
import com.yukcsca.academic.domain.AcademicSubjectProfile;
import com.yukcsca.academic.domain.AcademicTermPronunciation;
import com.yukcsca.academic.infrastructure.SpeechSynthesisProperties;
import com.yukcsca.identity.application.CurrentAccount;
import com.yukcsca.identity.application.CurrentAccountRole;
import com.yukcsca.identity.application.CurrentAuthenticationService;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

@Service
public class AcademicAdminService {
  private static final Logger LOGGER = LoggerFactory.getLogger(AcademicAdminService.class);
  private static final Set<String> ORIGINS = Set.of("YUKCSCA_ORIGINAL", "LICENSED", "OPEN_LICENSE");

  private final AcademicPackageStore packages;
  private final AcademicRevisionStore revisions;
  private final AcademicImageStore images;
  private final AcademicAuditStore audits;
  private final CurrentAuthenticationService authentication;
  private final AcademicDraftProcessor drafts;
  private final AcademicImageProcessor imageProcessor;
  private final SpeechSynthesisPort speech;
  private final AcademicTermPronunciationStore pronunciations;
  private final SpeechSynthesisProperties speechProperties;
  private final ResourceVideoAttachmentValidator videoAttachments;
  private final PublishedVideoProjector videoProjector;
  private final Clock clock;

  public AcademicAdminService(
      AcademicPackageStore packages,
      AcademicRevisionStore revisions,
      AcademicImageStore images,
      AcademicAuditStore audits,
      CurrentAuthenticationService authentication,
      AcademicDraftProcessor drafts,
      AcademicImageProcessor imageProcessor,
      SpeechSynthesisPort speech,
      AcademicTermPronunciationStore pronunciations,
      SpeechSynthesisProperties speechProperties,
      ResourceVideoAttachmentValidator videoAttachments,
      PublishedVideoProjector videoProjector,
      Clock clock) {
    this.packages = packages;
    this.revisions = revisions;
    this.images = images;
    this.audits = audits;
    this.authentication = authentication;
    this.drafts = drafts;
    this.imageProcessor = imageProcessor;
    this.speech = speech;
    this.pronunciations = pronunciations;
    this.speechProperties = speechProperties;
    this.videoAttachments = videoAttachments;
    this.videoProjector = videoProjector;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<AcademicPackageSummarySnapshot> list(UUID actorId) {
    requireAdmin(actorId);
    return packages.findAllByOrderByCreatedAtAsc().stream().map(this::summary).toList();
  }

  @Transactional
  public AcademicPackageSnapshot create(UUID actorId, String subject) {
    requireAdmin(actorId);
    if (!AcademicSubjectProfile.isSupported(subject)) {
      throw validation("subject", AcademicViolationCode.INCOMPATIBLE);
    }
    if (packages.existsBySubject(subject)) {
      throw new AcademicConflictException(
          "ACADEMIC_PACKAGE_EXISTS", "An academic package for this subject already exists.");
    }
    Instant now = now();
    AcademicPackage academicPackage =
        packages.save(new AcademicPackage(subject, drafts.emptyDraft(subject), now));
    audit(
        actorId,
        "PACKAGE_CREATED",
        "ACADEMIC_PACKAGE",
        academicPackage.getId(),
        "SUCCEEDED",
        null,
        now);
    return snapshot(academicPackage);
  }

  @Transactional(readOnly = true)
  public AcademicPackageSnapshot get(UUID actorId, UUID packageId) {
    requireAdmin(actorId);
    return snapshot(findPackage(packageId));
  }

  @Transactional
  public AcademicPackageSnapshot saveDraft(
      UUID actorId, UUID packageId, long expectedRevision, JsonNode submittedDraft) {
    requireAdmin(actorId);
    AcademicPackage academicPackage = lockPackage(packageId);
    requireRevision(academicPackage, expectedRevision);
    if (academicPackage.getStatus() == AcademicPackageStatus.ARCHIVED) {
      throw new AcademicConflictException(
          "ACADEMIC_PACKAGE_ARCHIVED", "An archived package cannot be edited.");
    }
    ObjectNode normalized =
        drafts.normalizeForSave(
            submittedDraft, academicPackage.getDraft(), actorId, academicPackage.getSubject());
    // Draft-save video-attachment rules are database-dependent (asset/spec existence and
    // language equality), so they run after pure-shape normalization (CR-03/CR-07c).
    videoAttachments.validate(normalized);
    Instant now = now();
    academicPackage.replaceDraft(drafts.serialize(normalized), now);
    packages.save(academicPackage);
    audit(actorId, "DRAFT_SAVED", "ACADEMIC_PACKAGE", packageId, "SUCCEEDED", null, now);
    return snapshot(academicPackage);
  }

  @Transactional(noRollbackFor = AcademicValidationException.class)
  public AcademicImageSnapshot uploadImage(
      UUID actorId, MultipartFile upload, ImageProvenanceCommand provenance) {
    requireAdmin(actorId);
    try {
      validateProvenance(provenance);
      AcademicImageProcessor.ProcessedImage processed = imageProcessor.process(upload);
      Instant now = now();
      AcademicImage image =
          images.save(
              new AcademicImage(
                  processed.mediaType(),
                  processed.bytes(),
                  processed.width(),
                  processed.height(),
                  processed.sha256(),
                  provenance.origin(),
                  trimToNull(provenance.provider()),
                  trimToNull(provenance.sourceLocator()),
                  trimToNull(provenance.permissionReference()),
                  actorId,
                  now));
      audit(actorId, "IMAGE_UPLOADED", "ACADEMIC_IMAGE", image.getId(), "SUCCEEDED", null, now);
      return imageSnapshot(image);
    } catch (AcademicValidationException exception) {
      audit(
          actorId,
          "IMAGE_REJECTED",
          "ACADEMIC_IMAGE",
          null,
          "REJECTED",
          "ACADEMIC_VALIDATION_FAILED",
          now());
      throw exception;
    }
  }

  @Transactional(readOnly = true)
  public AcademicImageContent getImage(UUID actorId, UUID imageId) {
    requireAdmin(actorId);
    AcademicImage image =
        images
            .findById(imageId)
            .orElseThrow(() -> new AcademicNotFoundException("Image not found."));
    if (!image.isSanitized()) {
      throw new IllegalStateException("Academic image has not passed sanitization.");
    }
    return new AcademicImageContent(image.getMediaType(), image.getContent());
  }

  @Transactional(readOnly = true)
  public AcademicImageContent getPublishedTermPronunciation(
      UUID actorId, UUID packageId, UUID termId, String surfaceForm) {
    requireAdmin(actorId);
    AcademicPackage academicPackage = findPackage(packageId);
    if (academicPackage.getActiveRevisionId() == null) {
      throw new AcademicNotFoundException("Pronunciation");
    }
    AcademicRevision revision = activeRevision(academicPackage);
    String surface =
        surfaceForm == null || surfaceForm.isBlank()
            ? primaryPublishedSurface(revision, termId)
            : surfaceForm.trim();
    AcademicTermPronunciation clip =
        pronunciations
            .findByPackageRevisionIdAndTermIdAndSurfaceForm(revision.getId(), termId, surface)
            .orElseThrow(() -> new AcademicNotFoundException("Pronunciation"));
    return new AcademicImageContent(clip.getMediaType(), clip.getContent());
  }

  @Transactional(noRollbackFor = AcademicValidationException.class)
  public AcademicPackageSnapshot publish(UUID actorId, UUID packageId, long expectedRevision) {
    requireAdmin(actorId);
    AcademicPackage academicPackage = lockPackage(packageId);
    requireRevision(academicPackage, expectedRevision);
    if (academicPackage.getStatus() == AcademicPackageStatus.ARCHIVED) {
      throw new AcademicConflictException(
          "ACADEMIC_PACKAGE_ARCHIVED", "An archived package cannot be published.");
    }
    if (academicPackage.getStatus() == AcademicPackageStatus.PUBLISHED) {
      // Missing clips belong to the live revision. An open correction draft must not
      // block filling audio students already should hear; draft publication still
      // validates separately below.
      if (speechProperties.usable()) {
        AcademicRevision live = activeRevision(academicPackage);
        renderTermAudio(live.getId(), drafts.parseObject(live.getContent()), now());
      }
      if (!academicPackage.hasUnpublishedChanges()) {
        return snapshot(academicPackage);
      }
    }

    ObjectNode savedDraft = drafts.parseObject(academicPackage.getDraft());
    Set<UUID> referencedIds = drafts.referencedImageIds(savedDraft);
    List<AcademicImage> referencedImages = images.findByIdIn(referencedIds);
    Set<UUID> availableIds =
        referencedImages.stream().map(AcademicImage::getId).collect(Collectors.toSet());
    try {
      drafts.validateForPublication(savedDraft, availableIds);
    } catch (AcademicValidationException exception) {
      audit(
          actorId,
          "PUBLICATION_REJECTED",
          "ACADEMIC_PACKAGE",
          packageId,
          "REJECTED",
          "ACADEMIC_VALIDATION_FAILED",
          now());
      throw exception;
    }

    Instant now = now();
    ObjectNode reviewed = drafts.reviewForPublication(savedDraft, actorId, now);
    // Only REVIEWED attachments enter the published revision; video state never blocks
    // publication of the complete text/formula/image unit (AC-04).
    videoProjector.projectInto(reviewed);
    Set<UUID> publishedVideoIds = videoProjector.referencedAssetIds(reviewed);
    Set<UUID> supersededVideoIds =
        academicPackage.getActiveRevisionId() == null
            ? Set.of()
            : videoProjector.referencedAssetIds(
                drafts.parseObject(activeRevision(academicPackage).getContent()));
    long revisionNumber =
        academicPackage.getActiveRevisionId() == null
            ? 1
            : activeRevision(academicPackage).getRevisionNumber() + 1;
    AcademicRevision revision =
        revisions.save(
            new AcademicRevision(
                packageId, revisionNumber, drafts.serialize(reviewed), actorId, now));
    referencedImages.forEach(
        image -> {
          image.markReviewed(actorId, now);
          images.save(image);
        });
    academicPackage.activateRevision(revision.getId(), drafts.serialize(reviewed), now);
    packages.save(academicPackage);
    videoProjector.retireReplaced(actorId, supersededVideoIds, publishedVideoIds, now);
    videoProjector.logPublished(publishedVideoIds);
    renderTermAudio(revision.getId(), reviewed, now);
    audit(actorId, "PACKAGE_PUBLISHED", "ACADEMIC_PACKAGE", packageId, "SUCCEEDED", null, now);
    return snapshot(academicPackage);
  }

  @Transactional
  public AcademicPackageSnapshot archive(
      UUID actorId, UUID packageId, long expectedRevision, String reason) {
    requireAdmin(actorId);
    AcademicPackage academicPackage = lockPackage(packageId);
    requireRevision(academicPackage, expectedRevision);
    if (reason == null || reason.isBlank() || reason.length() > 500) {
      throw validation("reason", AcademicViolationCode.REQUIRED);
    }
    if (academicPackage.getStatus() == AcademicPackageStatus.DRAFT) {
      throw new AcademicConflictException(
          "ACADEMIC_PACKAGE_NOT_PUBLISHED", "Only a published package can be archived.");
    }
    if (academicPackage.getStatus() == AcademicPackageStatus.ARCHIVED) {
      return snapshot(academicPackage);
    }
    Instant now = now();
    academicPackage.archive(now);
    packages.save(academicPackage);
    audit(
        actorId,
        "PACKAGE_ARCHIVED",
        "ACADEMIC_PACKAGE",
        packageId,
        "SUCCEEDED",
        reason.trim(),
        now);
    return snapshot(academicPackage);
  }

  private void requireAdmin(UUID actorId) {
    CurrentAccount account = authentication.requireAccount(actorId);
    if (account.role() != CurrentAccountRole.ADMIN) throw new AcademicAccessDeniedException();
  }

  private AcademicPackage findPackage(UUID id) {
    return packages
        .findById(id)
        .orElseThrow(() -> new AcademicNotFoundException("Package not found."));
  }

  private AcademicPackage lockPackage(UUID id) {
    return packages
        .findByIdForUpdate(id)
        .orElseThrow(() -> new AcademicNotFoundException("Package not found."));
  }

  private void requireRevision(AcademicPackage academicPackage, long expected) {
    if (expected < 0 || academicPackage.getDraftRevision() != expected) {
      throw new AcademicConflictException("STALE_REVISION", "The draft revision is stale.");
    }
  }

  private void validateProvenance(ImageProvenanceCommand provenance) {
    if (provenance == null || !ORIGINS.contains(provenance.origin())) {
      throw validation("provenance.origin", AcademicViolationCode.UNSUPPORTED);
    }
    if (!"YUKCSCA_ORIGINAL".equals(provenance.origin())
        && (trimToNull(provenance.provider()) == null
            || trimToNull(provenance.sourceLocator()) == null
            || trimToNull(provenance.permissionReference()) == null)) {
      throw validation("provenance", AcademicViolationCode.MISSING_PERMISSION);
    }
  }

  private AcademicPackageSnapshot snapshot(AcademicPackage value) {
    return new AcademicPackageSnapshot(
        value.getId(),
        value.getSubject(),
        value.getStatus(),
        value.getDraftRevision(),
        revisionSnapshot(value),
        value.hasUnpublishedChanges(),
        value.getDraft(),
        value.getCreatedAt(),
        value.getUpdatedAt());
  }

  private AcademicPackageSummarySnapshot summary(AcademicPackage value) {
    return new AcademicPackageSummarySnapshot(
        value.getId(),
        value.getSubject(),
        value.getStatus(),
        value.getDraftRevision(),
        revisionSnapshot(value),
        value.hasUnpublishedChanges(),
        value.getUpdatedAt());
  }

  private AcademicPackageSnapshot.PublishedRevisionSnapshot revisionSnapshot(
      AcademicPackage value) {
    if (value.getActiveRevisionId() == null) return null;
    AcademicRevision revision = activeRevision(value);
    return new AcademicPackageSnapshot.PublishedRevisionSnapshot(
        revision.getId(),
        revision.getRevisionNumber(),
        revision.getPublishedAt(),
        revision.getPublishedByUserId());
  }

  private AcademicRevision activeRevision(AcademicPackage value) {
    return revisions
        .findById(value.getActiveRevisionId())
        .orElseThrow(() -> new IllegalStateException("Active academic revision is missing."));
  }

  private String primaryPublishedSurface(AcademicRevision revision, UUID termId) {
    JsonNode terms = drafts.parseObject(revision.getContent()).path("terms");
    if (!terms.isArray()) {
      throw new AcademicNotFoundException("Pronunciation");
    }
    for (JsonNode term : terms) {
      if (!termId.toString().equals(term.path("id").asText())) continue;
      JsonNode surfaces = term.path("surfaceForms");
      if (surfaces.isArray() && !surfaces.isEmpty()) {
        String text = surfaces.get(0).path("text").asText(null);
        if (text != null && !text.isBlank()) return text.trim();
      }
      break;
    }
    throw new AcademicNotFoundException("Pronunciation");
  }

  private static AcademicImageSnapshot imageSnapshot(AcademicImage image) {
    return new AcademicImageSnapshot(
        image.getId(),
        image.getMediaType(),
        image.getByteSize(),
        image.getWidth(),
        image.getHeight(),
        image.getSha256(),
        image.getOrigin(),
        image.getProvider(),
        image.getSourceLocator(),
        image.getPermissionReference(),
        image.getAuthorUserId(),
        image.getReviewedByUserId(),
        image.getReviewedAt(),
        image.getCreatedAt());
  }

  private void audit(
      UUID actor,
      String action,
      String targetType,
      UUID target,
      String result,
      String reason,
      Instant now) {
    audits.save(new AcademicAudit(actor, action, targetType, target, result, reason, now));
  }

  private Instant now() {
    return clock.instant().truncatedTo(ChronoUnit.MICROS);
  }

  private static String trimToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private static AcademicValidationException validation(String path, AcademicViolationCode code) {
    return new AcademicValidationException(List.of(new AcademicViolation(path, code)));
  }

  private void renderTermAudio(UUID revisionId, ObjectNode draft, Instant now) {
    JsonNode terms = draft.path("terms");
    if (!terms.isArray() || terms.isEmpty()) return;
    if (!speechProperties.usable()) {
      LOGGER.info("terminology.audio.skipped reason=speech_disabled revisionId={}", revisionId);
      return;
    }
    int budget = Math.max(1, speechProperties.maxClipsPerPublish());
    int rendered = 0;
    int skipped = 0;
    for (JsonNode term : terms) {
      UUID termId;
      try {
        termId = UUID.fromString(term.path("id").asText());
      } catch (RuntimeException exception) {
        continue;
      }
      JsonNode surfaces = term.path("surfaceForms");
      if (!surfaces.isArray()) continue;
      for (JsonNode surface : surfaces) {
        if (rendered >= budget) return;
        String text = surface.path("text").asText(null);
        if (text == null || text.isBlank()) continue;
        text = text.trim();
        if (pronunciations
            .findByPackageRevisionIdAndTermIdAndSurfaceForm(revisionId, termId, text)
            .isPresent()) {
          continue;
        }
        Optional<byte[]> clip = speech.synthesize(text);
        if (clip.isEmpty()) {
          skipped++;
          LOGGER.info("terminology.audio.rendered termId={} status=skipped byteLength=0", termId);
          continue;
        }
        byte[] bytes = clip.get();
        pronunciations.save(
            new AcademicTermPronunciation(revisionId, termId, text, bytes, sha256(bytes), now));
        rendered++;
        LOGGER.info(
            "terminology.audio.rendered termId={} status=stored byteLength={}",
            termId,
            bytes.length);
      }
    }
    if (rendered == 0 && skipped > 0) {
      LOGGER.warn(
          "terminology.audio.rendered revisionId={} status=none_stored skipped={}",
          revisionId,
          skipped);
    }
  }

  private static String sha256(byte[] bytes) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    } catch (java.security.NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is required.", exception);
    }
  }
}
