package com.yukcsca.agent.application;

import com.yukcsca.academic.application.ContentAccessPolicy;
import com.yukcsca.academic.application.FormalAssistanceDisabledException;
import com.yukcsca.academic.application.FormalAssistancePolicy;
import com.yukcsca.academic.application.PublishedLearningContextPort;
import com.yukcsca.academic.application.PublishedLearningContextPort.AuthorisedResourceContext;
import com.yukcsca.academic.application.PublishedLearningContextPort.AuthorisedTermContext;
import com.yukcsca.academic.application.PublishedLearningContextPort.BlockExcerpt;
import com.yukcsca.agent.application.AgentChatPort.AgentChatCommand;
import com.yukcsca.agent.application.AgentChatPort.AgentChatResult;
import com.yukcsca.agent.application.AgentChatPort.AuthorisedAskGrounding;
import com.yukcsca.agent.application.AgentChatPort.GroundedLocator;
import com.yukcsca.agent.application.AgentChatPort.PriorTurn;
import com.yukcsca.agent.application.AgentViews.AvailabilityView;
import com.yukcsca.agent.application.AgentViews.ConversationStartResult;
import com.yukcsca.agent.application.AgentViews.ConversationView;
import com.yukcsca.agent.application.AgentViews.LocatorView;
import com.yukcsca.agent.application.AgentViews.StepView;
import com.yukcsca.agent.application.AgentViews.TurnView;
import com.yukcsca.agent.domain.AgentAnswerKind;
import com.yukcsca.agent.domain.AgentContextType;
import com.yukcsca.agent.domain.AgentConversation;
import com.yukcsca.agent.domain.AgentFlag;
import com.yukcsca.agent.domain.AgentFlagSource;
import com.yukcsca.agent.domain.AgentTrace;
import com.yukcsca.agent.domain.AgentTurn;
import com.yukcsca.agent.domain.AgentTurnStatus;
import com.yukcsca.agent.infrastructure.AgentProperties;
import com.yukcsca.assessment.application.AgentAssessmentContextPort;
import com.yukcsca.assessment.application.AgentAssessmentContextPort.AuthorisedItemContext;
import com.yukcsca.assessment.application.AgentAssessmentContextPort.AuthorisedMistakeContext;
import com.yukcsca.assessment.application.LearningEvidencePort;
import com.yukcsca.identity.application.CurrentAccount;
import com.yukcsca.identity.application.CurrentAuthenticationService;
import com.yukcsca.profile.application.StudentExplanationLanguageQuery;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class AgentStudentService {
  private static final Logger LOGGER = LoggerFactory.getLogger(AgentStudentService.class);
  private static final int TURN_PAYLOAD_CAP = 20;
  private static final Duration IDEMPOTENCY_TTL = Duration.ofHours(24);
  private static final Duration PENDING_WAIT = Duration.ofSeconds(12);
  private static final ZoneId JAKARTA = ZoneId.of("Asia/Jakarta");

  private final AgentProperties properties;
  private final AgentEnablement enablement;
  private final AgentChatPort chat;
  private final AgentConversationStore conversations;
  private final AgentTurnStore turns;
  private final AgentTraceStore traces;
  private final AgentFlagStore flags;
  private final AgentContentSearchPort search;
  private final PublishedLearningContextPort learning;
  private final AgentAssessmentContextPort assessment;
  private final LearningEvidencePort evidence;
  private final StudentExplanationLanguageQuery explanationLanguages;
  private final FormalAssistancePolicy formalPolicy;
  private final ContentAccessPolicy accessPolicy;
  private final CurrentAuthenticationService authentication;
  private final JsonMapper json;
  private final Clock clock;
  private final TransactionTemplate requiresNew;

  public AgentStudentService(
      AgentProperties properties,
      AgentEnablement enablement,
      AgentChatPort chat,
      AgentConversationStore conversations,
      AgentTurnStore turns,
      AgentTraceStore traces,
      AgentFlagStore flags,
      AgentContentSearchPort search,
      PublishedLearningContextPort learning,
      AgentAssessmentContextPort assessment,
      LearningEvidencePort evidence,
      StudentExplanationLanguageQuery explanationLanguages,
      FormalAssistancePolicy formalPolicy,
      ContentAccessPolicy accessPolicy,
      CurrentAuthenticationService authentication,
      JsonMapper json,
      Clock clock,
      PlatformTransactionManager transactionManager) {
    this.properties = properties;
    this.enablement = enablement;
    this.chat = chat;
    this.conversations = conversations;
    this.turns = turns;
    this.traces = traces;
    this.flags = flags;
    this.search = search;
    this.learning = learning;
    this.assessment = assessment;
    this.evidence = evidence;
    this.explanationLanguages = explanationLanguages;
    this.formalPolicy = formalPolicy;
    this.accessPolicy = accessPolicy;
    this.authentication = authentication;
    this.json = json;
    this.clock = clock;
    this.requiresNew = new TransactionTemplate(transactionManager);
    this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
  }

  @Transactional(readOnly = true)
  public AvailabilityView availability(
      UUID actorId, AgentContextType contextType, UUID contextId, UUID sessionId, UUID itemId) {
    requireStudent(actorId);
    AuthorisedContext context = authorize(actorId, contextType, contextId, sessionId, itemId);
    if (context == null) {
      throw new AgentNotFoundException();
    }
    if (!agentUsable()) {
      return new AvailabilityView(false, "AGENT_DISABLED");
    }
    if (formalPolicy.isDisabled(actorId)) {
      return new AvailabilityView(false, "FORMAL_ASSISTANCE_DISABLED");
    }
    return new AvailabilityView(true, null);
  }

  @Transactional
  public ConversationStartResult startConversation(
      UUID actorId, AgentContextType contextType, UUID contextId, UUID sessionId, UUID itemId) {
    requireStudent(actorId);
    denyIfDisabled();
    denyIfFormal(actorId);
    AuthorisedContext context = requireContext(actorId, contextType, contextId, sessionId, itemId);
    AgentConversation existing =
        conversations
            .findByAccountIdAndContextTypeAndContextId(actorId, contextType, context.contextId())
            .orElse(null);
    if (existing != null) {
      return new ConversationStartResult(toConversationView(existing), false);
    }
    Instant now = now();
    String explanationLanguage = explanationLanguages.explanationLanguage(actorId).orElse("en");
    AgentConversation created;
    try {
      created =
          requiresNew.execute(
              status ->
                  conversations.save(
                      new AgentConversation(
                          actorId,
                          contextType,
                          context.contextId(),
                          context.subject(),
                          context.packageId(),
                          context.packageRevisionId(),
                          context.sessionId(),
                          context.itemId(),
                          explanationLanguage,
                          context.examLanguage(),
                          now)));
    } catch (DataIntegrityViolationException exception) {
      AgentConversation winner =
          conversations
              .findByAccountIdAndContextTypeAndContextId(actorId, contextType, context.contextId())
              .orElseThrow(AgentNotFoundException::new);
      return new ConversationStartResult(toConversationView(winner), false);
    }
    if (created == null) {
      throw new AgentNotFoundException();
    }
    LOGGER.info(
        "agent.conversation.started conversationId={} contextType={}",
        created.getId(),
        contextType);
    try {
      search.ensureIndexed(created.getPackageRevisionId());
    } catch (RuntimeException exception) {
      LOGGER.warn("agent.index.failed revisionId={}", created.getPackageRevisionId());
    }
    return new ConversationStartResult(toConversationView(created), true);
  }

  @Transactional(readOnly = true)
  public ConversationView getConversation(UUID actorId, UUID conversationId) {
    requireStudent(actorId);
    AgentConversation conversation = requireOwnedConversation(actorId, conversationId);
    return toConversationView(conversation);
  }

  public TurnView askTurn(
      UUID actorId, UUID conversationId, UUID idempotencyKey, String questionText, String quote) {
    requireStudent(actorId);
    denyIfDisabled();
    denyIfFormal(actorId);
    validateTurn(questionText, quote);
    AgentConversation conversation = requireOwnedConversation(actorId, conversationId);
    enforceBudget(actorId);
    AuthorisedContext context =
        requireContext(
            actorId,
            conversation.getContextType(),
            conversation.getContextId(),
            conversation.getSessionId(),
            conversation.getItemId());
    try {
      search.ensureIndexed(context.packageRevisionId());
    } catch (RuntimeException exception) {
      LOGGER.warn("agent.index.failed revisionId={}", context.packageRevisionId());
    }

    AgentTurn reserved = reserveTurn(conversation, actorId, idempotencyKey, questionText, quote);
    if (reserved.getStatus() == AgentTurnStatus.COMPLETED) {
      return toTurnView(reserved);
    }
    if (reserved.getStatus() == AgentTurnStatus.FAILED) {
      throw new AgentProviderUnavailableException();
    }
    if (reserved.getStatus() == AgentTurnStatus.PENDING
        && !reserved.getQuestionText().equals(questionText)) {
      AgentTurn waited = waitForPending(conversation.getId(), idempotencyKey);
      if (waited.getStatus() == AgentTurnStatus.COMPLETED) {
        return toTurnView(waited);
      }
      throw new AgentProviderUnavailableException();
    }

    Instant started = now();
    try {
      AgentChatResult result =
          chat.complete(
              new AgentChatCommand(
                  actorId,
                  conversation.getId(),
                  conversation.getContextType(),
                  conversation.getContextId(),
                  context.packageId(),
                  context.packageRevisionId(),
                  conversation.getSubject(),
                  conversation.getExplanationLanguage(),
                  conversation.getExamLanguage(),
                  questionText,
                  quote,
                  priorTurns(conversation.getId()),
                  grounding(actorId, context),
                  properties.turnTimeout()));
      int latency = elapsedMs(started);
      AgentTurn completed = persistCompleted(reserved, conversation, result, latency, now());
      if (conversation.getContextType() == AgentContextType.ITEM
          && context.itemOpen()
          && completed.getStatus() == AgentTurnStatus.COMPLETED) {
        boolean wrote =
            assessment.recordAgentQaIfOpen(
                actorId, conversation.getSessionId(), conversation.getItemId());
        if (wrote) {
          LOGGER.info(
              "agent.assistance.recorded sessionId={} itemId={} kind=AGENT_QA",
              conversation.getSessionId(),
              conversation.getItemId());
        }
      }
      LOGGER.info(
          "agent.turn.completed conversationId={} turnId={} kind={} latencyMs={} tokenUsage={}",
          conversation.getId(),
          completed.getId(),
          completed.getKind(),
          latency,
          result.tokenUsage());
      return toTurnView(completed);
    } catch (AgentProviderUnavailableException exception) {
      persistFailed(reserved, elapsedMs(started), now());
      LOGGER.info(
          "agent.turn.failed conversationId={} turnId={} errorCode=AGENT_PROVIDER_UNAVAILABLE",
          conversation.getId(),
          reserved.getId());
      throw exception;
    } catch (RuntimeException exception) {
      persistFailed(reserved, elapsedMs(started), now());
      LOGGER.warn(
          "agent.turn.failed conversationId={} turnId={} errorCode=AGENT_PROVIDER_UNAVAILABLE",
          conversation.getId(),
          reserved.getId());
      throw new AgentProviderUnavailableException(exception);
    }
  }

  private AgentTurn reserveTurn(
      AgentConversation conversation,
      UUID actorId,
      UUID idempotencyKey,
      String questionText,
      String quote) {
    AgentTurn existing =
        turns
            .findByConversationIdAndIdempotencyKey(conversation.getId(), idempotencyKey)
            .orElse(null);
    if (existing != null) {
      if (existing.getStatus() == AgentTurnStatus.PENDING) {
        existing = expireIfStale(existing);
      }
      return replayOrWait(existing);
    }
    AgentTurn otherPending =
        turns
            .findFirstByConversationIdAndStatus(conversation.getId(), AgentTurnStatus.PENDING)
            .orElse(null);
    if (otherPending != null) {
      AgentTurn expired = expireIfStale(otherPending);
      if (expired.getStatus() == AgentTurnStatus.PENDING) {
        throw new AgentConflictException(
            "CONCURRENT_TURN_PENDING", "Another Ask is already in progress for this conversation.");
      }
    }
    try {
      return requiresNew.execute(
          status ->
              turns.save(
                  AgentTurn.pending(
                      conversation.getId(), actorId, idempotencyKey, questionText, quote, now())));
    } catch (DataIntegrityViolationException exception) {
      AgentTurn raced =
          turns
              .findByConversationIdAndIdempotencyKey(conversation.getId(), idempotencyKey)
              .orElse(null);
      if (raced != null) {
        return replayOrWait(raced);
      }
      throw new AgentConflictException(
          "CONCURRENT_TURN_PENDING", "Another Ask is already in progress for this conversation.");
    }
  }

  private AgentTurn expireIfStale(AgentTurn pending) {
    if (pending.getStatus() != AgentTurnStatus.PENDING || !isStalePending(pending)) {
      return pending;
    }
    persistFailed(pending, elapsedMs(pending.getCreatedAt()), now());
    LOGGER.info(
        "agent.turn.failed conversationId={} turnId={} errorCode=STALE_PENDING",
        pending.getConversationId(),
        pending.getId());
    return turns.findById(pending.getId()).orElse(pending);
  }

  private boolean isStalePending(AgentTurn pending) {
    Duration staleAfter = properties.turnTimeout().multipliedBy(3).plusSeconds(8);
    return Duration.between(pending.getCreatedAt(), now()).compareTo(staleAfter) > 0;
  }

  private AgentTurn replayOrWait(AgentTurn existing) {
    if (existing.getStatus() == AgentTurnStatus.COMPLETED) {
      Instant completed =
          existing.getCompletedAt() == null ? existing.getCreatedAt() : existing.getCompletedAt();
      if (Duration.between(completed, now()).compareTo(IDEMPOTENCY_TTL) <= 0) {
        return existing;
      }
    }
    if (existing.getStatus() == AgentTurnStatus.PENDING) {
      return waitForPending(existing.getConversationId(), existing.getIdempotencyKey());
    }
    return existing;
  }

  private AgentTurn waitForPending(UUID conversationId, UUID idempotencyKey) {
    Instant deadline = now().plus(PENDING_WAIT);
    while (now().isBefore(deadline)) {
      AgentTurn current =
          turns
              .findByConversationIdAndIdempotencyKey(conversationId, idempotencyKey)
              .orElseThrow(AgentNotFoundException::new);
      if (current.getStatus() != AgentTurnStatus.PENDING) {
        return current;
      }
      try {
        Thread.sleep(50);
      } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new AgentProviderUnavailableException(exception);
      }
    }
    throw new AgentConflictException(
        "CONCURRENT_TURN_PENDING", "Another Ask is already in progress for this conversation.");
  }

  private AgentTurn persistCompleted(
      AgentTurn pending,
      AgentConversation conversation,
      AgentChatResult result,
      int latencyMs,
      Instant now) {
    return requiresNew.execute(
        status -> {
          AgentTurn turn = turns.findById(pending.getId()).orElseThrow(AgentNotFoundException::new);
          if (turn.getStatus() == AgentTurnStatus.COMPLETED) {
            return turn;
          }
          List<LocatorView> locators = toLocatorViews(result.locators());
          List<StepView> steps = toStepViews(result.steps());
          List<String> followUps = sanitizeFollowUps(result.suggestedFollowUps());
          if (!turn.complete(
              result.kind(),
              clip(result.body(), 12000),
              writeJson(locators),
              writeJson(steps),
              writeJson(followUps),
              latencyMs,
              now)) {
            throw new AgentProviderUnavailableException();
          }
          turns.save(turn);
          traces.save(
              new AgentTrace(
                  turn.getId(),
                  conversation.getId(),
                  conversation.getAccountId(),
                  result.modelVersion(),
                  properties.promptVersion(),
                  result.tokenUsage(),
                  writeJson(steps),
                  now));
          if (result.kind() == AgentAnswerKind.INSUFFICIENT_EVIDENCE) {
            flags.save(
                new AgentFlag(
                    turn.getId(),
                    conversation.getId(),
                    conversation.getAccountId(),
                    AgentFlagSource.INSUFFICIENT_EVIDENCE,
                    now));
          } else if (result.lowConfidence()) {
            flags.save(
                new AgentFlag(
                    turn.getId(),
                    conversation.getId(),
                    conversation.getAccountId(),
                    AgentFlagSource.LOW_CONFIDENCE,
                    now));
          }
          AgentConversation owned =
              conversations.findById(conversation.getId()).orElseThrow(AgentNotFoundException::new);
          owned.touch(now);
          conversations.save(owned);
          return turn;
        });
  }

  private void persistFailed(AgentTurn pending, int latencyMs, Instant now) {
    requiresNew.executeWithoutResult(
        status -> {
          AgentTurn turn = turns.findById(pending.getId()).orElseThrow(AgentNotFoundException::new);
          if (!turn.fail(latencyMs, now)) {
            return;
          }
          turns.save(turn);
          AgentConversation owned =
              conversations
                  .findById(turn.getConversationId())
                  .orElseThrow(AgentNotFoundException::new);
          owned.touch(now);
          conversations.save(owned);
        });
  }

  private AuthorisedContext requireContext(
      UUID actorId, AgentContextType contextType, UUID contextId, UUID sessionId, UUID itemId) {
    AuthorisedContext context = authorize(actorId, contextType, contextId, sessionId, itemId);
    if (context == null) {
      throw new AgentNotFoundException();
    }
    return context;
  }

  private AuthorisedContext authorize(
      UUID actorId, AgentContextType contextType, UUID contextId, UUID sessionId, UUID itemId) {
    if (contextType == null || contextId == null) {
      throw new AgentValidationException(List.of(new AgentViolation("contextType", "REQUIRED")));
    }
    if (contextType == AgentContextType.ITEM) {
      if (sessionId == null || itemId == null) {
        throw new AgentValidationException(
            List.of(
                new AgentViolation("sessionId", "REQUIRED"),
                new AgentViolation("itemId", "REQUIRED")));
      }
      if (!itemId.equals(contextId)) {
        throw new AgentConflictException(
            "CONTEXT_CONFLICT", "itemId must equal contextId for ITEM Ask.");
      }
      AuthorisedItemContext item =
          assessment.findOwnedItem(actorId, sessionId, itemId).orElse(null);
      if (item == null) {
        return null;
      }
      String itemLabel = clip(item.stemText(), 120);
      if (itemLabel.isBlank()) {
        itemLabel = "Item";
      }
      return new AuthorisedContext(
          AgentContextType.ITEM,
          item.itemId(),
          item.packageId(),
          item.packageRevisionId(),
          item.subject(),
          item.examLanguage(),
          item.sessionId(),
          item.itemId(),
          item.open(),
          item.stemText(),
          item.reviewedExplanation(),
          "Item",
          List.of(
              new GroundedLocator(
                  AgentContextType.ITEM,
                  item.itemId(),
                  itemLabel,
                  null,
                  item.packageRevisionId())));
    }
    if (sessionId != null || itemId != null) {
      throw new AgentValidationException(List.of(new AgentViolation("sessionId", "INVALID")));
    }
    return switch (contextType) {
      case LESSON ->
          learning
              .findPublishedLesson(actorId, contextId)
              .map(resource -> fromResource(AgentContextType.LESSON, resource))
              .orElse(null);
      case REMEDIATION ->
          learning
              .findPublishedRemediation(actorId, contextId)
              .map(resource -> fromResource(AgentContextType.REMEDIATION, resource))
              .orElse(null);
      case TERMINOLOGY ->
          learning.findPublishedTerm(actorId, contextId).map(this::fromTerm).orElse(null);
      case MISTAKE ->
          assessment.findOwnedMistake(actorId, contextId).map(this::fromMistake).orElse(null);
      case ITEM -> null;
    };
  }

  private AuthorisedContext fromResource(
      AgentContextType type, AuthorisedResourceContext resource) {
    return new AuthorisedContext(
        type,
        resource.resourceId(),
        resource.packageId(),
        resource.packageRevisionId(),
        resource.subject(),
        resource.examLanguage(),
        null,
        null,
        false,
        excerpt(resource.blocks()),
        "",
        resource.title(),
        locatorsFor(type, resource));
  }

  private AuthorisedContext fromTerm(AuthorisedTermContext term) {
    String excerpt = (term.surfaceForm() + "\n" + term.definition() + "\n" + term.example()).trim();
    return new AuthorisedContext(
        AgentContextType.TERMINOLOGY,
        term.termId(),
        term.packageId(),
        term.packageRevisionId(),
        term.subject(),
        term.examLanguage(),
        null,
        null,
        false,
        excerpt,
        "",
        term.surfaceForm(),
        List.of(
            new GroundedLocator(
                AgentContextType.TERMINOLOGY,
                term.termId(),
                clip(term.surfaceForm(), 120),
                null,
                term.packageRevisionId())));
  }

  private AuthorisedContext fromMistake(AuthorisedMistakeContext mistake) {
    return new AuthorisedContext(
        AgentContextType.MISTAKE,
        mistake.mistakeId(),
        mistake.packageId(),
        mistake.packageRevisionId(),
        mistake.subject(),
        mistake.examLanguage(),
        null,
        null,
        false,
        mistake.stemText(),
        mistake.reviewedExplanation(),
        "Mistake",
        List.of(
            new GroundedLocator(
                AgentContextType.MISTAKE,
                mistake.mistakeId(),
                "Mistake",
                null,
                mistake.packageRevisionId())));
  }

  private AuthorisedAskGrounding grounding(UUID accountId, AuthorisedContext context) {
    StringBuilder excerpt = new StringBuilder(context.excerpt());
    if (context.type() == AgentContextType.ITEM && !context.itemOpen()) {
      if (!context.reviewedExplanation().isBlank()) {
        excerpt.append('\n').append(context.reviewedExplanation());
      }
    }
    evidence
        .listRecentByAccount(accountId, 5)
        .forEach(
            snapshot ->
                excerpt
                    .append("\nEvidence ")
                    .append(snapshot.signal())
                    .append(' ')
                    .append(snapshot.objectiveId()));
    return new AuthorisedAskGrounding(
        context.label(),
        clip(excerpt.toString(), 8000),
        context.itemOpen(),
        List.copyOf(context.locators()));
  }

  private List<PriorTurn> priorTurns(UUID conversationId) {
    List<AgentTurn> recent = turns.findTop20ByConversationIdOrderByCreatedAtDesc(conversationId);
    recent = new ArrayList<>(recent);
    recent.sort(Comparator.comparing(AgentTurn::getCreatedAt));
    List<PriorTurn> result = new ArrayList<>();
    for (AgentTurn turn : recent) {
      if (turn.getStatus() != AgentTurnStatus.COMPLETED) continue;
      result.add(
          new PriorTurn(
              turn.getQuestionText(),
              turn.getQuote(),
              turn.getKind() == null ? null : turn.getKind().name(),
              turn.getBody()));
    }
    return result;
  }

  private ConversationView toConversationView(AgentConversation conversation) {
    List<AgentTurn> recent =
        turns.findTop20ByConversationIdOrderByCreatedAtDesc(conversation.getId());
    recent = new ArrayList<>(recent);
    recent.sort(Comparator.comparing(AgentTurn::getCreatedAt));
    if (recent.size() > TURN_PAYLOAD_CAP) {
      recent = recent.subList(recent.size() - TURN_PAYLOAD_CAP, recent.size());
    }
    return new ConversationView(
        conversation.getId(),
        conversation.getContextType(),
        conversation.getContextId(),
        conversation.getSubject(),
        conversation.getPackageId(),
        conversation.getPackageRevisionId(),
        conversation.getSessionId(),
        conversation.getItemId(),
        conversation.getExplanationLanguage(),
        conversation.getExamLanguage(),
        recent.stream().map(this::toTurnView).toList(),
        conversation.getCreatedAt(),
        conversation.getUpdatedAt());
  }

  private TurnView toTurnView(AgentTurn turn) {
    return new TurnView(
        turn.getId(),
        turn.getStatus(),
        turn.getQuestionText(),
        turn.getQuote(),
        turn.getCreatedAt(),
        turn.getKind(),
        turn.getBody(),
        readLocators(turn.getLocators()),
        readSteps(turn.getSteps()),
        readFollowUps(turn.getSuggestedFollowUps()),
        turn.getLatencyMs());
  }

  private List<LocatorView> readLocators(String raw) {
    if (raw == null || raw.isBlank()) return List.of();
    JsonNode node = json.readTree(raw);
    if (!node.isArray()) return List.of();
    List<LocatorView> values = new ArrayList<>();
    for (JsonNode item : node) {
      AgentContextType kind = parseContext(item.path("sourceKind").asText(null));
      UUID sourceId = parseUuid(item.path("sourceId").asText(null));
      if (kind == null || sourceId == null) continue;
      values.add(
          new LocatorView(
              kind,
              sourceId,
              item.path("label").asText("Source"),
              item.path("blockIndex").isIntegralNumber() ? item.path("blockIndex").asInt() : null,
              parseUuid(item.path("packageRevisionId").asText(null))));
    }
    return List.copyOf(values);
  }

  private List<StepView> readSteps(String raw) {
    if (raw == null || raw.isBlank()) return List.of();
    JsonNode node = json.readTree(raw);
    if (!node.isArray()) return List.of();
    List<StepView> values = new ArrayList<>();
    for (JsonNode item : node) {
      String kind = item.path("kind").asText("MODEL");
      values.add(
          new StepView(
              "TOOL".equals(kind)
                  ? com.yukcsca.agent.domain.AgentTraceStepKind.TOOL
                  : com.yukcsca.agent.domain.AgentTraceStepKind.MODEL,
              item.path("label").asText("Worked"),
              readLocators(item.path("locators").toString()),
              item.path("latencyMs").asInt(0)));
    }
    return List.copyOf(values);
  }

  private List<String> readFollowUps(String raw) {
    if (raw == null || raw.isBlank()) return List.of();
    JsonNode node = json.readTree(raw);
    if (!node.isArray()) return List.of();
    List<String> values = new ArrayList<>();
    for (JsonNode item : node) {
      if (item.isTextual() && !item.asText().isBlank()) {
        values.add(item.asText());
      }
    }
    return List.copyOf(values);
  }

  private String writeJson(Object value) {
    return json.writeValueAsString(value);
  }

  private static List<LocatorView> toLocatorViews(List<GroundedLocator> locators) {
    if (locators == null) return List.of();
    return locators.stream()
        .map(
            locator ->
                new LocatorView(
                    locator.sourceKind(),
                    locator.sourceId(),
                    clip(locator.label(), 120),
                    locator.blockIndex(),
                    locator.packageRevisionId()))
        .limit(12)
        .toList();
  }

  private static List<StepView> toStepViews(List<AgentChatPort.TraceStep> steps) {
    if (steps == null) return List.of();
    return steps.stream()
        .map(
            step ->
                new StepView(
                    step.kind(),
                    clip(step.label(), 200),
                    toLocatorViews(step.locators()),
                    Math.max(0, step.latencyMs())))
        .limit(16)
        .toList();
  }

  private static List<String> sanitizeFollowUps(List<String> followUps) {
    if (followUps == null) return List.of();
    List<String> values = new ArrayList<>();
    for (String followUp : followUps) {
      if (followUp == null) continue;
      String trimmed = followUp.trim();
      if (trimmed.isEmpty() || trimmed.length() > 80) continue;
      values.add(trimmed);
      if (values.size() == 3) break;
    }
    return List.copyOf(values);
  }

  private static List<GroundedLocator> locatorsFor(
      AgentContextType type, AuthorisedResourceContext resource) {
    List<GroundedLocator> locators = new ArrayList<>();
    if (resource.blocks().isEmpty()) {
      locators.add(
          new GroundedLocator(
              type,
              resource.resourceId(),
              clip(resource.title(), 120),
              null,
              resource.packageRevisionId()));
      return locators;
    }
    for (BlockExcerpt block : resource.blocks()) {
      locators.add(
          new GroundedLocator(
              type,
              resource.resourceId(),
              clip(resource.title(), 120),
              block.blockIndex(),
              resource.packageRevisionId()));
      if (locators.size() == 12) break;
    }
    return locators;
  }

  private static String excerpt(List<BlockExcerpt> blocks) {
    StringBuilder text = new StringBuilder();
    for (BlockExcerpt block : blocks) {
      if (block.text() != null && !block.text().isBlank()) {
        if (!text.isEmpty()) text.append('\n');
        text.append(block.text());
      }
      if (block.latex() != null && !block.latex().isBlank()) {
        if (!text.isEmpty()) text.append('\n');
        text.append(block.latex());
      }
    }
    return text.toString();
  }

  private void validateTurn(String questionText, String quote) {
    List<AgentViolation> violations = new ArrayList<>();
    if (questionText == null || questionText.isBlank()) {
      violations.add(new AgentViolation("questionText", "REQUIRED"));
    } else if (questionText.length() > 2000) {
      violations.add(new AgentViolation("questionText", "OUT_OF_RANGE"));
    }
    if (quote != null && (quote.isBlank() || quote.length() > 4000)) {
      violations.add(new AgentViolation("quote", "OUT_OF_RANGE"));
    }
    if (!violations.isEmpty()) {
      throw new AgentValidationException(violations);
    }
  }

  private void enforceBudget(UUID actorId) {
    Instant startOfDay = now().atZone(JAKARTA).toLocalDate().atStartOfDay(JAKARTA).toInstant();
    long used = turns.countByAccountIdAndCreatedAtGreaterThanEqual(actorId, startOfDay);
    if (used >= properties.dailyTurnCap()) {
      Instant resetAt = startOfDay.plus(1, ChronoUnit.DAYS);
      long retry = Duration.between(now(), resetAt).toSeconds();
      LOGGER.info("agent.budget.exceeded accountId={} capName=dailyTurn", actorId);
      throw new AgentBudgetExceededException(Math.max(1, retry));
    }
  }

  private AgentConversation requireOwnedConversation(UUID actorId, UUID conversationId) {
    AgentConversation conversation =
        conversations.findById(conversationId).orElseThrow(AgentNotFoundException::new);
    if (!conversation.getAccountId().equals(actorId)) {
      throw new AgentNotFoundException();
    }
    return conversation;
  }

  private CurrentAccount requireStudent(UUID actorId) {
    CurrentAccount account = authentication.requireAccount(actorId);
    if (!accessPolicy.mayReadPublishedContent(account)) {
      throw new AgentAccessDeniedException();
    }
    return account;
  }

  private void denyIfDisabled() {
    if (!agentUsable()) {
      throw new AgentDisabledException();
    }
  }

  private void denyIfFormal(UUID actorId) {
    if (formalPolicy.isDisabled(actorId)) {
      throw new FormalAssistanceDisabledException();
    }
  }

  private boolean agentUsable() {
    return enablement.enabled() && chat.available();
  }

  private Instant now() {
    return clock.instant().truncatedTo(ChronoUnit.MICROS);
  }

  private int elapsedMs(Instant started) {
    return (int) Math.max(0, Duration.between(started, now()).toMillis());
  }

  private static String clip(String value, int max) {
    if (value == null) return "";
    return value.length() <= max ? value : value.substring(0, max);
  }

  private static AgentContextType parseContext(String raw) {
    if (raw == null) return null;
    try {
      return AgentContextType.valueOf(raw);
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  private static UUID parseUuid(String raw) {
    if (raw == null || raw.isBlank()) return null;
    try {
      return UUID.fromString(raw);
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  private record AuthorisedContext(
      AgentContextType type,
      UUID contextId,
      UUID packageId,
      UUID packageRevisionId,
      String subject,
      String examLanguage,
      UUID sessionId,
      UUID itemId,
      boolean itemOpen,
      String excerpt,
      String reviewedExplanation,
      String label,
      List<GroundedLocator> locators) {}
}
