package com.yukcsca.academic.application;

import com.yukcsca.academic.application.TerminologyProjector.LocalizedText;
import com.yukcsca.academic.application.TerminologyProjector.PublishedTerm;
import com.yukcsca.academic.application.TerminologyProjector.Surface;
import com.yukcsca.academic.application.TerminologyProjector.TermSpanMatch;
import com.yukcsca.academic.domain.AcademicPackage;
import com.yukcsca.academic.domain.AcademicPackageStatus;
import com.yukcsca.academic.domain.AcademicRevision;
import com.yukcsca.academic.domain.AcademicTermPronunciation;
import com.yukcsca.academic.domain.StudentTerminologyNotebook;
import com.yukcsca.academic.domain.StudentTerminologyPreviewProgress;
import com.yukcsca.academic.domain.StudentTerminologyReview;
import com.yukcsca.identity.application.CurrentAccount;
import com.yukcsca.identity.application.CurrentAuthenticationService;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

@Service
public class AcademicTerminologyService {
  private static final Logger LOGGER = LoggerFactory.getLogger(AcademicTerminologyService.class);
  private static final Set<String> EXPLANATION_LANGUAGES = Set.of("id", "en", "zh-CN");
  private static final Set<String> WRITABLE_PREVIEW =
      Set.of(
          StudentTerminologyPreviewProgress.IN_PROGRESS,
          StudentTerminologyPreviewProgress.PREVIEW_COMPLETE);
  private static final Set<String> LOOKUP_SOURCES =
      Set.of("PREVIEW", "LESSON", "ITEM", "NOTEBOOK", "LANGUAGE_MISTAKE");
  private static final Set<String> SUBJECTS = Set.of("MATHEMATICS");

  private final AcademicPackageStore packages;
  private final AcademicRevisionStore revisions;
  private final PublishedPackageProjector projector;
  private final TerminologyProjector terms;
  private final StudentTerminologyPreviewProgressStore previewProgress;
  private final StudentTerminologyNotebookStore notebook;
  private final StudentTerminologyReviewStore reviews;
  private final AcademicTermPronunciationStore pronunciations;
  private final FormalAssistancePolicy formalPolicy;
  private final AssessmentItemContextPort itemContext;
  private final ContentAccessPolicy accessPolicy;
  private final CurrentAuthenticationService authentication;
  private final JsonMapper json;
  private final Clock clock;

  public AcademicTerminologyService(
      AcademicPackageStore packages,
      AcademicRevisionStore revisions,
      PublishedPackageProjector projector,
      TerminologyProjector terms,
      StudentTerminologyPreviewProgressStore previewProgress,
      StudentTerminologyNotebookStore notebook,
      StudentTerminologyReviewStore reviews,
      AcademicTermPronunciationStore pronunciations,
      FormalAssistancePolicy formalPolicy,
      AssessmentItemContextPort itemContext,
      ContentAccessPolicy accessPolicy,
      CurrentAuthenticationService authentication,
      JsonMapper json,
      Clock clock) {
    this.packages = packages;
    this.revisions = revisions;
    this.projector = projector;
    this.terms = terms;
    this.previewProgress = previewProgress;
    this.notebook = notebook;
    this.reviews = reviews;
    this.pronunciations = pronunciations;
    this.formalPolicy = formalPolicy;
    this.itemContext = itemContext;
    this.accessPolicy = accessPolicy;
    this.authentication = authentication;
    this.json = json;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public TerminologyPreviewResult getPreview(
      UUID actorId, String subject, UUID resourceId, String explanationLanguage) {
    requireStudent(actorId);
    String language = requireExplanationLanguage(explanationLanguage);
    PublishedContext ctx = requirePublished(subject);
    JsonNode resource = terms.resourceById(ctx.content(), resourceId);
    if (resource == null || !"TERMINOLOGY".equals(text(resource, "kind"))) {
      throw new AcademicNotFoundException("Terminology preview not found.");
    }
    List<PublishedTerm> bank = terms.terms(ctx.content());
    Set<UUID> requiredIds = terms.requiredTermIds(resource);
    List<PublishedTerm> required = terms.requiredTerms(bank, requiredIds);
    Set<String> audio = audioTermIds(ctx.revision().getId(), required);
    List<TermCardView> cards =
        required.stream().map(term -> card(term, language, ctx.pkg(), audio)).toList();
    boolean pairs = required.size() >= 2;
    List<MatchTargetView> targets =
        pairs
            ? required.stream()
                .map(
                    term ->
                        new MatchTargetView(
                            term.id(),
                            term.id().toString(),
                            term.primary().text(),
                            term.englishEquivalent()))
                .toList()
            : List.of();
    return new TerminologyPreviewResult(
        ctx.pkg().getId(),
        ctx.revision().getId(),
        ctx.pkg().getSubject(),
        resourceId,
        terms.localized(resource.path("title")),
        projectorUuidList(resource.path("outlineItemIds")),
        terms.lessonResourceIdsSharingOutline(ctx.content(), resource),
        language,
        cards,
        pairs,
        targets,
        previewProgressView(actorId, ctx.pkg().getId(), resourceId, requiredIds));
  }

  @Transactional
  public PreviewProgressView upsertPreviewProgress(
      UUID actorId,
      String subject,
      UUID resourceId,
      String status,
      UUID expectedPackageRevisionId) {
    requireStudent(actorId);
    denyFormal(actorId);
    if (status == null || !WRITABLE_PREVIEW.contains(status)) {
      throw terminology("status", "UNSUPPORTED");
    }
    PublishedContext ctx = requirePublished(subject);
    JsonNode resource = terms.resourceById(ctx.content(), resourceId);
    if (resource == null || !"TERMINOLOGY".equals(text(resource, "kind"))) {
      throw new AcademicNotFoundException("Terminology preview not found.");
    }
    if (expectedPackageRevisionId != null
        && !expectedPackageRevisionId.equals(ctx.revision().getId())) {
      LOGGER.info(
          "academic.student.terminology.progress revision_mismatch resourceId={} expected={} active={}",
          resourceId,
          expectedPackageRevisionId,
          ctx.revision().getId());
    }
    Set<UUID> requiredIds = terms.requiredTermIds(resource);
    Instant now = now();
    StudentTerminologyPreviewProgress existing =
        previewProgress
            .findByAccountIdAndPackageIdAndResourceId(actorId, ctx.pkg().getId(), resourceId)
            .orElse(null);
    String snapshotJson = existing == null ? null : existing.getRequiredTermIdsJson();
    if (StudentTerminologyPreviewProgress.PREVIEW_COMPLETE.equals(status)) {
      snapshotJson = writeUuidArray(requiredIds);
    }
    if (existing == null) {
      existing =
          previewProgress.save(
              new StudentTerminologyPreviewProgress(
                  actorId,
                  ctx.pkg().getId(),
                  resourceId,
                  status,
                  ctx.revision().getId(),
                  snapshotJson,
                  now));
    } else {
      existing.replace(status, ctx.revision().getId(), snapshotJson, now);
      previewProgress.save(existing);
    }
    LocalizedText topic = terms.localized(resource.path("title"));
    UUID outlineId = firstUuid(resource.path("outlineItemIds"));
    List<PublishedTerm> required = terms.requiredTerms(terms.terms(ctx.content()), requiredIds);
    for (PublishedTerm term : required) {
      upsertNotebook(
          actorId,
          ctx.pkg(),
          term,
          StudentTerminologyNotebook.SOURCE_REQUIRED_COURSE,
          "PREVIEW",
          topic,
          outlineId,
          term.example(),
          now);
    }
    LOGGER.info(
        "academic.student.terminology.progress resourceId={} status={} collected={}",
        resourceId,
        status,
        required.size());
    return toPreviewProgress(existing, requiredIds);
  }

  @Transactional
  public PreviewCheckView submitPreviewCheck(
      UUID actorId, String subject, UUID resourceId, List<PreviewPair> pairs) {
    requireStudent(actorId);
    denyFormal(actorId);
    if (pairs == null || pairs.isEmpty() || pairs.size() > 64) {
      throw terminology("pairs", "OUT_OF_RANGE");
    }
    PublishedContext ctx = requirePublished(subject);
    JsonNode resource = terms.resourceById(ctx.content(), resourceId);
    if (resource == null || !"TERMINOLOGY".equals(text(resource, "kind"))) {
      throw new AcademicNotFoundException("Terminology preview not found.");
    }
    Set<UUID> requiredIds = terms.requiredTermIds(resource);
    int correct = 0;
    for (int i = 0; i < pairs.size(); i++) {
      PreviewPair pair = pairs.get(i);
      if (pair.termId() == null
          || pair.selectedMatchKey() == null
          || pair.selectedMatchKey().isBlank()) {
        throw terminology("pairs[" + i + "]", "INVALID");
      }
      if (pair.termId().toString().equals(pair.selectedMatchKey())
          && requiredIds.contains(pair.termId())) {
        correct++;
      }
    }
    return new PreviewCheckView(
        "MATCH_PAIRS",
        correct,
        pairs.size(),
        previewProgressView(actorId, ctx.pkg().getId(), resourceId, requiredIds));
  }

  @Transactional
  public TermLookupView resolveLookup(UUID actorId, TermLookupCommand command) {
    requireStudent(actorId);
    denyFormal(actorId);
    validateLookup(command);
    PublishedContext ctx = requirePublished(command.subject());
    UUID revisionId = ctx.revision().getId();
    String place = "NOTEBOOK";
    LocalizedText topic = null;
    UUID outlineId = null;
    String snippet = null;
    List<String> itemStemTexts = List.of();
    if ("PREVIEW".equals(command.source()) || "LESSON".equals(command.source())) {
      JsonNode resource = terms.resourceById(ctx.content(), command.resourceId());
      if (resource == null) {
        throw new AcademicNotFoundException("Resource not found.");
      }
      String expectedKind = "PREVIEW".equals(command.source()) ? "TERMINOLOGY" : "LESSON";
      if (!expectedKind.equals(text(resource, "kind"))) {
        throw new AcademicNotFoundException("Resource not found.");
      }
      place = "PREVIEW".equals(command.source()) ? "PREVIEW" : "LESSON";
      topic = terms.localized(resource.path("title"));
      outlineId = firstUuid(resource.path("outlineItemIds"));
      snippet = lessonSnippet(resource, command.selectedText(), command.explanationLanguage());
    } else if ("ITEM".equals(command.source())
        || ("LANGUAGE_MISTAKE".equals(command.source())
            && command.sessionId() != null
            && command.itemId() != null)) {
      AssessmentItemContextPort.ItemContext item =
          itemContext
              .findOwnedItem(actorId, command.sessionId(), command.itemId())
              .orElseThrow(() -> new AcademicNotFoundException("Item not found."));
      revisionId = item.packageRevisionId();
      AcademicRevision pinned =
          revisions
              .findById(revisionId)
              .orElseThrow(() -> new AcademicNotFoundException("Published package not found."));
      ctx = new PublishedContext(ctx.pkg(), pinned, projector.parseContent(pinned.getContent()));
      place = "CHECKPOINT".equals(item.purpose()) ? "CHECKPOINT" : "PRACTICE";
      itemStemTexts = item.stemTexts() == null ? List.of() : item.stemTexts();
    }
    List<PublishedTerm> bank = terms.terms(ctx.content());
    Optional<PublishedTerm> matched;
    if (command.termId() != null) {
      matched = terms.findTerm(bank, command.termId());
    } else {
      matched = terms.matchSelectedText(bank, command.selectedText());
    }
    boolean hit = matched.isPresent();
    LOGGER.info(
        "terminology.lookup.resolved termId={} matched={} source={} sessionId={}",
        matched.map(PublishedTerm::id).orElse(null),
        hit,
        command.source(),
        command.sessionId());
    if (matched.isEmpty()) {
      return new TermLookupView("NOT_IN_BANK", null, false, null);
    }
    PublishedTerm term = matched.get();
    String source =
        "LANGUAGE_MISTAKE".equals(command.source())
            ? StudentTerminologyNotebook.SOURCE_LANGUAGE_MISTAKE
            : StudentTerminologyNotebook.SOURCE_CLICKED;
    if (snippet == null) snippet = stemSnippet(itemStemTexts, term);
    if (snippet == null) snippet = term.example();
    Instant now = now();
    boolean existed = notebook.findByAccountIdAndTermId(actorId, term.id()).isPresent();
    StudentTerminologyNotebook entry =
        upsertNotebook(actorId, ctx.pkg(), term, source, place, topic, outlineId, snippet, now);
    Set<String> audio = audioTermIds(revisionId, List.of(term));
    TermCardView card = card(term, command.explanationLanguage(), ctx.pkg(), audio);
    return new TermLookupView(
        "MATCHED",
        card,
        existed,
        notebookEntry(entry, term, command.explanationLanguage(), ctx, audio));
  }

  @Transactional(readOnly = true)
  public NotebookListView listNotebook(
      UUID actorId,
      String explanationLanguage,
      Boolean dueOnly,
      String q,
      String classGroup,
      String subject,
      String cursor,
      Integer limit) {
    requireStudent(actorId);
    String language = requireExplanationLanguage(explanationLanguage);
    if (classGroup != null
        && !"EXAM_WORDING".equals(classGroup)
        && !"TOPIC_TERM".equals(classGroup)) {
      throw terminology("classGroup", "UNSUPPORTED");
    }
    if (subject != null && !SUBJECTS.contains(subject)) {
      throw terminology("subject", "UNSUPPORTED");
    }
    int pageSize = limit == null ? 20 : limit;
    if (pageSize < 1 || pageSize > 100) {
      throw terminology("limit", "OUT_OF_RANGE");
    }
    List<StudentTerminologyNotebook> rows = notebook.findByAccountIdOrderByUpdatedAtDesc(actorId);
    NotebookCursor after = decodeCursor(cursor);
    List<NotebookEntryView> items = new ArrayList<>();
    String next = null;
    for (StudentTerminologyNotebook row : rows) {
      if (Boolean.TRUE.equals(dueOnly) && !row.isDue()) continue;
      if (subject != null && !subject.equals(row.getSubject())) continue;
      if ("EXAM_WORDING".equals(classGroup)
          && !TerminologyProjector.EXAM_WORDING_CLASSES.contains(row.getTermClass())) {
        continue;
      }
      if ("TOPIC_TERM".equals(classGroup) && !"TOPIC_TERM".equals(row.getTermClass())) {
        continue;
      }
      if (after != null && !isAfter(row, after)) {
        continue;
      }
      PublishedContext ctx = loadPackage(row.getPackageId()).orElse(null);
      if (ctx == null) continue;
      Optional<PublishedTerm> term = terms.findTerm(terms.terms(ctx.content()), row.getTermId());
      if (term.isEmpty()) continue;
      if (q != null && !q.isBlank() && !matchesQuery(term.get(), q)) continue;
      Set<String> audio = audioTermIds(ctx.revision().getId(), List.of(term.get()));
      items.add(notebookEntry(row, term.get(), language, ctx, audio));
      if (items.size() == pageSize + 1) {
        NotebookEntryView lastKept = items.get(pageSize - 1);
        items = new ArrayList<>(items.subList(0, pageSize));
        next = encodeCursor(lastKept.updatedAt(), lastKept.termId());
        break;
      }
    }
    return new NotebookListView(items, next);
  }

  @Transactional(readOnly = true)
  public NotebookDetailView getNotebookEntry(
      UUID actorId, UUID termId, String explanationLanguage) {
    requireStudent(actorId);
    String language = requireExplanationLanguage(explanationLanguage);
    StudentTerminologyNotebook row =
        notebook
            .findByAccountIdAndTermId(actorId, termId)
            .orElseThrow(() -> new AcademicNotFoundException("Notebook entry not found."));
    PublishedContext ctx =
        loadPackage(row.getPackageId())
            .orElseThrow(() -> new AcademicNotFoundException("Notebook entry not found."));
    PublishedTerm term =
        terms
            .findTerm(terms.terms(ctx.content()), termId)
            .orElseThrow(() -> new AcademicNotFoundException("Notebook entry not found."));
    Set<String> audio = audioTermIds(ctx.revision().getId(), List.of(term));
    return new NotebookDetailView(
        notebookEntry(row, term, language, ctx, audio), card(term, language, ctx.pkg(), audio));
  }

  @Transactional
  public TermReviewResultView submitReview(
      UUID actorId, UUID termId, String kind, String selectedOptionKey) {
    requireStudent(actorId);
    denyFormal(actorId);
    if (!"CONTEXT_CLOZE".equals(kind) && !"MATCH_PAIRS".equals(kind)) {
      throw terminology("kind", "UNSUPPORTED");
    }
    if (selectedOptionKey == null
        || selectedOptionKey.isBlank()
        || selectedOptionKey.length() > 40) {
      throw terminology("selectedOptionKey", "INVALID");
    }
    StudentTerminologyNotebook row =
        notebook
            .findByAccountIdAndTermId(actorId, termId)
            .orElseThrow(() -> new AcademicNotFoundException("Notebook entry not found."));
    if (!row.isDue()) {
      throw terminology("termId", "INCOMPATIBLE");
    }
    PublishedContext ctx =
        loadPackage(row.getPackageId())
            .orElseThrow(() -> new AcademicNotFoundException("Notebook entry not found."));
    PublishedTerm term =
        terms
            .findTerm(terms.terms(ctx.content()), termId)
            .orElseThrow(() -> new AcademicNotFoundException("Notebook entry not found."));
    String explanationLanguage = "zh-CN";
    TermReviewPromptView prompt = pendingReview(row, term, ctx, explanationLanguage);
    if (prompt == null) {
      throw terminology("kind", "INCOMPATIBLE");
    }
    if (!kind.equals(prompt.kind())) {
      throw terminology("kind", "INCOMPATIBLE");
    }
    boolean correct = selectedOptionKey.equals(prompt.correctOptionKey());
    Instant now = now();
    row.applyReview(correct, now);
    notebook.save(row);
    reviews.save(
        new StudentTerminologyReview(
            actorId,
            termId,
            kind,
            selectedOptionKey,
            correct,
            prompt.correctOptionKey(),
            row.getFamiliarity(),
            now));
    LOGGER.info(
        "terminology.review.recorded termId={} result={} familiarity={}",
        termId,
        correct ? "correct" : "incorrect",
        row.getFamiliarity());
    Set<String> audio = audioTermIds(ctx.revision().getId(), List.of(term));
    return new TermReviewResultView(
        termId,
        kind,
        correct,
        prompt.correctOptionKey(),
        row.getFamiliarity(),
        row.isDue(),
        notebookEntry(row, term, explanationLanguage, ctx, audio));
  }

  @Transactional(readOnly = true)
  public AcademicImageContent getPronunciation(UUID actorId, UUID termId, String surfaceForm) {
    requireStudent(actorId);
    for (AcademicPackage academicPackage :
        packages.findByStatusAndActiveRevisionIdIsNotNullOrderByCreatedAtAsc(
            AcademicPackageStatus.PUBLISHED)) {
      AcademicRevision revision = requireActiveRevision(academicPackage);
      JsonNode content = projector.parseContent(revision.getContent());
      Optional<PublishedTerm> term = terms.findTerm(terms.terms(content), termId);
      if (term.isEmpty()) continue;
      String surface =
          surfaceForm == null || surfaceForm.isBlank()
              ? term.get().primary().text()
              : surfaceForm.trim();
      Optional<AcademicTermPronunciation> clip =
          pronunciations.findByPackageRevisionIdAndTermIdAndSurfaceForm(
              revision.getId(), termId, surface);
      if (clip.isPresent()) {
        return new AcademicImageContent(clip.get().getMediaType(), clip.get().getContent());
      }
    }
    throw new AcademicNotFoundException("Pronunciation");
  }

  public LessonTerminologyView lessonTerminology(
      UUID actorId,
      AcademicPackage academicPackage,
      AcademicRevision revision,
      JsonNode content,
      UUID lessonResourceId,
      String explanationLanguage,
      List<JsonNode> blocks) {
    if (!terms.hasPublishedTermBank(content)) return null;
    JsonNode lesson = terms.resourceById(content, lessonResourceId);
    if (lesson == null) return null;
    Optional<JsonNode> preview =
        terms.terminologyBoundTo(content, projectorUuidList(lesson.path("outlineItemIds")));
    List<PublishedTerm> bank = terms.terms(content);
    Set<UUID> requiredIds = preview.map(terms::requiredTermIds).orElseGet(LinkedHashSet::new);
    List<PublishedTerm> railTerms = terms.requiredTerms(bank, requiredIds);
    Set<String> audio = audioTermIds(revision.getId(), railTerms);
    List<TermCardView> rail =
        railTerms.stream()
            .map(term -> card(term, explanationLanguage, academicPackage, audio))
            .toList();
    Set<UUID> auto = terms.autoMatchTermIds(bank, requiredIds);
    List<TermSpanMatch> spans =
        terms.matchSpans(blocks == null ? List.of() : blocks, bank, auto, 200);
    return new LessonTerminologyView(
        preview.map(node -> uuid(node.path("id"))).orElse(null),
        rail,
        spans.stream()
            .map(
                span ->
                    new TermSpanView(
                        span.termId(),
                        span.surfaceForm(),
                        span.blockIndex(),
                        span.startOffset(),
                        span.endOffset()))
            .toList());
  }

  public PreviewRefView lessonPreviewRef(
      UUID actorId, UUID packageId, JsonNode content, List<UUID> lessonOutlineIds) {
    if (!terms.hasPublishedTermBank(content)) return null;
    Optional<JsonNode> preview = terms.terminologyBoundTo(content, lessonOutlineIds);
    if (preview.isEmpty()) return null;
    UUID resourceId = uuid(preview.get().path("id"));
    if (resourceId == null) return null;
    return new PreviewRefView(
        resourceId,
        previewProgressView(actorId, packageId, resourceId, terms.requiredTermIds(preview.get())));
  }

  public StudentTerminologyNotebook upsertNotebook(
      UUID accountId,
      AcademicPackage academicPackage,
      PublishedTerm term,
      String source,
      String place,
      LocalizedText topic,
      UUID outlineItemId,
      String encounterSnippet,
      Instant now) {
    String metIn = writeMetIn(source, place, topic, outlineItemId, now);
    String snippet = terms.encounterSnippet(term, encounterSnippet);
    Optional<StudentTerminologyNotebook> existing =
        notebook.findByAccountIdAndTermId(accountId, term.id());
    if (existing.isPresent()) {
      StudentTerminologyNotebook row = existing.get();
      if (StudentTerminologyNotebook.SOURCE_LANGUAGE_MISTAKE.equals(source)) {
        row.markLanguageMistake(now);
      }
      row.refreshEncounter(source, metIn, snippet, now);
      return notebook.save(row);
    }
    StudentTerminologyNotebook created =
        new StudentTerminologyNotebook(
            accountId,
            term.id(),
            academicPackage.getId(),
            academicPackage.getSubject(),
            term.termClass(),
            source,
            metIn,
            snippet,
            now);
    if (StudentTerminologyNotebook.SOURCE_LANGUAGE_MISTAKE.equals(source)) {
      created.markLanguageMistake(now);
    }
    return notebook.save(created);
  }

  private void validateLookup(TermLookupCommand command) {
    if (command.subject() == null || !SUBJECTS.contains(command.subject())) {
      throw terminology("subject", "UNSUPPORTED");
    }
    requireExplanationLanguage(command.explanationLanguage());
    if (command.source() == null || !LOOKUP_SOURCES.contains(command.source())) {
      throw terminology("source", "UNSUPPORTED");
    }
    boolean hasTerm = command.termId() != null;
    boolean hasText = command.selectedText() != null && !command.selectedText().isBlank();
    if (hasTerm == hasText) {
      throw terminology("termId", "INVALID");
    }
    if (hasText && command.selectedText().length() > 40) {
      throw terminology("selectedText", "OUT_OF_RANGE");
    }
    if (("PREVIEW".equals(command.source()) || "LESSON".equals(command.source()))
        && command.resourceId() == null) {
      throw terminology("resourceId", "REQUIRED");
    }
    if ("ITEM".equals(command.source())
        && (command.sessionId() == null || command.itemId() == null)) {
      throw terminology("sessionId", "REQUIRED");
    }
  }

  private TermCardView card(
      PublishedTerm term,
      String explanationLanguage,
      AcademicPackage academicPackage,
      Set<String> audio) {
    String definition = terms.definitionText(term, explanationLanguage);
    TermDefinitionView definitionView =
        definition == null
            ? new TermDefinitionView("LANGUAGE_UNAVAILABLE", explanationLanguage, null)
            : new TermDefinitionView("AVAILABLE", explanationLanguage, definition);
    return new TermCardView(
        term.id(),
        academicPackage.getSubject(),
        academicPackage.getId(),
        term.termClass(),
        surface(term.primary(), hasAudio(audio, term.id(), term.primary().text())),
        term.aliases().stream()
            .map(alias -> surface(alias, hasAudio(audio, term.id(), alias.text())))
            .toList(),
        definitionView,
        term.englishEquivalent(),
        term.symbols(),
        term.example(),
        term.outlineItemIds());
  }

  private TermSurfaceView surface(Surface surface, boolean audio) {
    return new TermSurfaceView(surface.text(), surface.pinyin(), audio);
  }

  private Set<String> audioTermIds(UUID revisionId, List<PublishedTerm> required) {
    if (required.isEmpty()) return Set.of();
    List<AcademicTermPronunciation> clips =
        pronunciations.findByPackageRevisionIdAndTermIdIn(
            revisionId, required.stream().map(PublishedTerm::id).toList());
    Set<String> keys = new HashSet<>();
    for (AcademicTermPronunciation clip : clips) {
      keys.add(clip.getTermId() + "\0" + clip.getSurfaceForm());
    }
    return keys;
  }

  private static boolean hasAudio(Set<String> keys, UUID termId, String surface) {
    return keys.contains(termId + "\0" + surface);
  }

  private PreviewProgressView previewProgressView(
      UUID actorId, UUID packageId, UUID resourceId, Set<UUID> requiredIds) {
    return previewProgress
        .findByAccountIdAndPackageIdAndResourceId(actorId, packageId, resourceId)
        .map(row -> toPreviewProgress(row, requiredIds))
        .orElse(new PreviewProgressView("NOT_STARTED", null, false));
  }

  private PreviewProgressView toPreviewProgress(
      StudentTerminologyPreviewProgress row, Set<UUID> currentRequired) {
    boolean updated = false;
    if (StudentTerminologyPreviewProgress.PREVIEW_COMPLETE.equals(row.getStatus())) {
      Set<UUID> snapshot = readUuidArray(row.getRequiredTermIdsJson());
      updated = !snapshot.equals(currentRequired);
    }
    return new PreviewProgressView(row.getStatus(), row.getUpdatedAt(), updated);
  }

  private NotebookEntryView notebookEntry(
      StudentTerminologyNotebook row,
      PublishedTerm term,
      String explanationLanguage,
      PublishedContext ctx,
      Set<String> audio) {
    TermReviewPromptView pending =
        row.isDue() ? pendingReview(row, term, ctx, explanationLanguage) : null;
    return new NotebookEntryView(
        row.getTermId(),
        row.getSubject(),
        row.getPackageId(),
        row.getTermClass(),
        surface(term.primary(), hasAudio(audio, term.id(), term.primary().text())),
        row.getFamiliarity(),
        row.isDue(),
        row.getLastReviewAt(),
        row.getSources(),
        readMetIn(row.getMetInJson()),
        pending,
        row.getUpdatedAt());
  }

  private TermReviewPromptView pendingReview(
      StudentTerminologyNotebook row,
      PublishedTerm term,
      PublishedContext ctx,
      String explanationLanguage) {
    List<PublishedTerm> bank = terms.terms(ctx.content());
    Optional<String> cloze = terms.clozeSnippet(term, row.getEncounterSnippet());
    List<PublishedTerm> distractors = TermReviewOptionPicker.pickDistractors(term, bank);
    if (cloze.isPresent() && distractors.size() + 1 >= 2) {
      List<ReviewOptionView> options = reviewOptions(term, distractors, true);
      return new TermReviewPromptView(
          "CONTEXT_CLOZE", cloze.get(), null, options, term.id().toString());
    }
    if (distractors.size() + 1 >= 2) {
      List<ReviewOptionView> options = reviewOptions(term, distractors, false);
      return new TermReviewPromptView(
          "MATCH_PAIRS", null, term.primary().text(), options, term.id().toString());
    }
    return null;
  }

  private List<ReviewOptionView> reviewOptions(
      PublishedTerm term, List<PublishedTerm> distractors, boolean cloze) {
    List<ReviewOptionView> options = new ArrayList<>();
    options.add(
        new ReviewOptionView(
            term.id().toString(), cloze ? term.primary().text() : term.englishEquivalent()));
    for (PublishedTerm other : distractors) {
      options.add(
          new ReviewOptionView(
              other.id().toString(), cloze ? other.primary().text() : other.englishEquivalent()));
      if (options.size() == TermReviewOptionPicker.CHOICE_COUNT) break;
    }
    options.sort(Comparator.comparing(ReviewOptionView::key));
    return List.copyOf(options);
  }

  private boolean matchesQuery(PublishedTerm term, String q) {
    String needle = q.trim();
    if (needle.isEmpty()) return true;
    if (term.primary().text().contains(needle)) return true;
    if (term.primary().pinyin().toLowerCase().contains(needle.toLowerCase())) return true;
    if (term.englishEquivalent().toLowerCase().contains(needle.toLowerCase())) return true;
    for (Surface alias : term.aliases()) {
      if (alias.text().contains(needle)
          || alias.pinyin().toLowerCase().contains(needle.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private static String stemSnippet(List<String> stemTexts, PublishedTerm term) {
    if (stemTexts == null || stemTexts.isEmpty()) return null;
    for (String body : stemTexts) {
      if (body == null || body.isBlank()) continue;
      if (body.contains(term.primary().text())) {
        return body.length() > 400 ? body.substring(0, 400) : body;
      }
      for (Surface alias : term.aliases()) {
        if (body.contains(alias.text())) {
          return body.length() > 400 ? body.substring(0, 400) : body;
        }
      }
    }
    return null;
  }

  private String lessonSnippet(JsonNode resource, String selectedText, String explanationLanguage) {
    if (selectedText == null || selectedText.isBlank()) return null;
    JsonNode versions = resource.path("versions");
    if (!versions.isArray()) return null;
    for (JsonNode version : versions) {
      if (!explanationLanguage.equals(text(version, "language"))
          && !"zh-CN".equals(text(version, "language"))) {
        continue;
      }
      JsonNode blocks = version.path("blocks");
      if (!blocks.isArray()) continue;
      for (JsonNode block : blocks) {
        if (!"TEXT".equals(text(block, "kind"))) continue;
        String body = text(block, "text");
        if (body != null && body.contains(selectedText.trim())) {
          return body.length() > 400 ? body.substring(0, 400) : body;
        }
      }
    }
    return null;
  }

  private void denyFormal(UUID actorId) {
    if (formalPolicy.isDisabled(actorId)) {
      throw new FormalAssistanceDisabledException();
    }
  }

  private CurrentAccount requireStudent(UUID actorId) {
    CurrentAccount account = authentication.requireAccount(actorId);
    if (!accessPolicy.mayReadPublishedContent(account)) {
      throw new AcademicAccessDeniedException();
    }
    return account;
  }

  private String requireExplanationLanguage(String explanationLanguage) {
    if (explanationLanguage == null || !EXPLANATION_LANGUAGES.contains(explanationLanguage)) {
      throw new InvalidStudentAcademicRequestException(
          "explanationLanguage must be one of id, en, or zh-CN.");
    }
    return explanationLanguage;
  }

  private PublishedContext requirePublished(String subject) {
    if (subject == null || subject.isBlank()) {
      throw new AcademicNotFoundException("Published package not found.");
    }
    AcademicPackage academicPackage =
        packages
            .findBySubjectAndStatusAndActiveRevisionIdIsNotNull(
                subject, AcademicPackageStatus.PUBLISHED)
            .orElseThrow(() -> new AcademicNotFoundException("Published package not found."));
    AcademicRevision revision = requireActiveRevision(academicPackage);
    return new PublishedContext(
        academicPackage, revision, projector.parseContent(revision.getContent()));
  }

  private Optional<PublishedContext> loadPackage(UUID packageId) {
    return packages
        .findById(packageId)
        .filter(pkg -> pkg.getStatus() == AcademicPackageStatus.PUBLISHED)
        .flatMap(
            pkg -> {
              if (pkg.getActiveRevisionId() == null) return Optional.empty();
              return revisions
                  .findById(pkg.getActiveRevisionId())
                  .map(
                      revision ->
                          new PublishedContext(
                              pkg, revision, projector.parseContent(revision.getContent())));
            });
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

  private Instant now() {
    return clock.instant().truncatedTo(ChronoUnit.MICROS);
  }

  private static TerminologyValidationException terminology(String path, String code) {
    return new TerminologyValidationException(List.of(new TerminologyViolation(path, code)));
  }

  private String writeMetIn(
      String source, String place, LocalizedText topic, UUID outlineItemId, Instant at) {
    ObjectNode node = json.createObjectNode();
    node.put("source", source);
    node.put("place", place);
    if (topic == null) {
      node.putNull("topicTitle");
    } else {
      ObjectNode title = node.putObject("topicTitle");
      title.put("indonesian", topic.indonesian());
      title.put("english", topic.english());
      title.put("simplifiedChinese", topic.simplifiedChinese());
    }
    if (outlineItemId == null) node.putNull("outlineItemId");
    else node.put("outlineItemId", outlineItemId.toString());
    node.put("at", at.toString());
    return write(node);
  }

  private TermMetInView readMetIn(String raw) {
    try {
      JsonNode node = json.readTree(raw);
      UUID outline =
          node.path("outlineItemId").isTextual() ? uuid(node.path("outlineItemId")) : null;
      LocalizedText topic = null;
      if (node.path("topicTitle").isObject()) {
        topic = terms.localized(node.path("topicTitle"));
      }
      Instant at = Instant.parse(node.path("at").asText());
      return new TermMetInView(text(node, "source"), text(node, "place"), topic, outline, at);
    } catch (RuntimeException exception) {
      return new TermMetInView("CLICKED", "NOTEBOOK", null, null, now());
    }
  }

  private String writeUuidArray(Set<UUID> ids) {
    ArrayNode array = json.createArrayNode();
    for (UUID id : ids) {
      array.add(id.toString());
    }
    return write(array);
  }

  private Set<UUID> readUuidArray(String raw) {
    if (raw == null || raw.isBlank()) return Set.of();
    try {
      JsonNode node = json.readTree(raw);
      Set<UUID> ids = new LinkedHashSet<>();
      if (node.isArray()) {
        for (JsonNode item : node) {
          UUID id = uuid(item);
          if (id != null) ids.add(id);
        }
      }
      return ids;
    } catch (RuntimeException exception) {
      return Set.of();
    }
  }

  private String write(JsonNode node) {
    try {
      return json.writeValueAsString(node);
    } catch (RuntimeException exception) {
      throw new IllegalStateException("Unable to serialize terminology JSON.", exception);
    }
  }

  private String encodeCursor(Instant updatedAt, UUID termId) {
    String raw = updatedAt + "|" + termId;
    return Base64.getUrlEncoder()
        .withoutPadding()
        .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
  }

  private NotebookCursor decodeCursor(String cursor) {
    if (cursor == null || cursor.isBlank()) return null;
    try {
      String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
      int split = raw.indexOf('|');
      Instant at = Instant.parse(raw.substring(0, split));
      UUID termId = UUID.fromString(raw.substring(split + 1));
      return new NotebookCursor(at, termId);
    } catch (RuntimeException exception) {
      throw terminology("cursor", "INVALID");
    }
  }

  private static boolean isAfter(StudentTerminologyNotebook row, NotebookCursor cursor) {
    int cmp = row.getUpdatedAt().compareTo(cursor.updatedAt());
    if (cmp < 0) return true;
    if (cmp > 0) return false;
    return row.getTermId().compareTo(cursor.termId()) > 0;
  }

  private static List<UUID> projectorUuidList(JsonNode node) {
    if (node == null || !node.isArray()) return List.of();
    List<UUID> ids = new ArrayList<>();
    for (JsonNode item : node) {
      UUID id = uuid(item);
      if (id != null) ids.add(id);
    }
    return ids;
  }

  private static UUID firstUuid(JsonNode node) {
    List<UUID> ids = projectorUuidList(node);
    return ids.isEmpty() ? null : ids.getFirst();
  }

  private static UUID uuid(JsonNode node) {
    if (node == null || !node.isTextual()) return null;
    try {
      return UUID.fromString(node.asText());
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  private static String text(JsonNode node, String field) {
    if (node == null || !node.isObject()) return null;
    JsonNode value = node.get(field);
    return value == null || !value.isTextual() ? null : value.asText();
  }

  private record PublishedContext(
      AcademicPackage pkg, AcademicRevision revision, JsonNode content) {}

  private record NotebookCursor(Instant updatedAt, UUID termId) {}

  public record PreviewPair(UUID termId, String selectedMatchKey) {}

  public record TermLookupCommand(
      String subject,
      String explanationLanguage,
      String source,
      UUID termId,
      String selectedText,
      UUID resourceId,
      UUID sessionId,
      UUID itemId) {}

  public record TermSurfaceView(String text, String pinyin, boolean audioAvailable) {}

  public record TermDefinitionView(String availability, String language, String text) {}

  public record TermCardView(
      UUID termId,
      String subject,
      UUID packageId,
      String termClass,
      TermSurfaceView primarySurface,
      List<TermSurfaceView> aliases,
      TermDefinitionView definition,
      String englishEquivalent,
      String symbols,
      String example,
      List<UUID> outlineItemIds) {}

  public record TermSpanView(
      UUID termId, String surfaceForm, int blockIndex, int startOffset, int endOffset) {}

  public record PreviewProgressView(
      String status, Instant updatedAt, boolean requiredSetUpdatedSinceCompleted) {}

  public record PreviewRefView(UUID resourceId, PreviewProgressView progress) {}

  public record MatchTargetView(
      UUID termId, String matchKey, String promptSurface, String matchLabel) {}

  public record TerminologyPreviewResult(
      UUID packageId,
      UUID packageRevisionId,
      String subject,
      UUID resourceId,
      LocalizedText title,
      List<UUID> outlineItemIds,
      List<UUID> lessonResourceIds,
      String requestedExplanationLanguage,
      List<TermCardView> terms,
      boolean matchingPairsAvailable,
      List<MatchTargetView> matchTargets,
      PreviewProgressView previewProgress) {}

  public record PreviewCheckView(
      String kind, int correctCount, int totalCount, PreviewProgressView previewProgress) {}

  public record TermMetInView(
      String source, String place, LocalizedText topicTitle, UUID outlineItemId, Instant at) {}

  public record ReviewOptionView(String key, String label) {}

  public record TermReviewPromptView(
      String kind,
      String snippet,
      String promptSurface,
      List<ReviewOptionView> options,
      String correctOptionKey) {}

  public record NotebookEntryView(
      UUID termId,
      String subject,
      UUID packageId,
      String termClass,
      TermSurfaceView primarySurface,
      String familiarity,
      boolean due,
      Instant lastReviewAt,
      List<String> sources,
      TermMetInView metIn,
      TermReviewPromptView pendingReview,
      Instant updatedAt) {}

  public record NotebookDetailView(NotebookEntryView entry, TermCardView card) {}

  public record NotebookListView(List<NotebookEntryView> items, String nextCursor) {}

  public record TermLookupView(
      String outcome, TermCardView card, boolean alreadyInNotebook, NotebookEntryView entry) {}

  public record TermReviewResultView(
      UUID termId,
      String kind,
      boolean correct,
      String correctOptionKey,
      String familiarity,
      boolean due,
      NotebookEntryView entry) {}

  public record LessonTerminologyView(
      UUID previewResourceId, List<TermCardView> rail, List<TermSpanView> spans) {}
}
