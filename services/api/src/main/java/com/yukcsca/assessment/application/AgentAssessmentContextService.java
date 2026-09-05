package com.yukcsca.assessment.application;

import com.yukcsca.academic.application.ContentAccessPolicy;
import com.yukcsca.assessment.domain.AssessmentAssistanceEvent;
import com.yukcsca.assessment.domain.AssessmentItemAttempt;
import com.yukcsca.assessment.domain.AssessmentMistake;
import com.yukcsca.assessment.domain.AssessmentSession;
import com.yukcsca.assessment.domain.ItemAttemptStatus;
import com.yukcsca.identity.application.CurrentAuthenticationService;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class AgentAssessmentContextService implements AgentAssessmentContextPort {
  private static final Logger LOGGER = LoggerFactory.getLogger(AgentAssessmentContextService.class);

  private final AssessmentSessionStore sessions;
  private final AssessmentItemAttemptStore items;
  private final AssessmentMistakeStore mistakes;
  private final AssessmentAssistanceEventStore assistance;
  private final ContentAccessPolicy accessPolicy;
  private final CurrentAuthenticationService authentication;
  private final JsonMapper json;
  private final Clock clock;

  public AgentAssessmentContextService(
      AssessmentSessionStore sessions,
      AssessmentItemAttemptStore items,
      AssessmentMistakeStore mistakes,
      AssessmentAssistanceEventStore assistance,
      ContentAccessPolicy accessPolicy,
      CurrentAuthenticationService authentication,
      JsonMapper json,
      Clock clock) {
    this.sessions = sessions;
    this.items = items;
    this.mistakes = mistakes;
    this.assistance = assistance;
    this.accessPolicy = accessPolicy;
    this.authentication = authentication;
    this.json = json;
    this.clock = clock;
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<AuthorisedItemContext> findOwnedItem(
      UUID accountId, UUID sessionId, UUID itemId) {
    if (!mayRead(accountId) || sessionId == null || itemId == null) return Optional.empty();
    Optional<AssessmentSession> session = sessions.findById(sessionId);
    if (session.isEmpty() || !accountId.equals(session.get().getAccountId())) {
      return Optional.empty();
    }
    Optional<AssessmentItemAttempt> item = items.findByIdAndSessionId(itemId, sessionId);
    if (item.isEmpty()) return Optional.empty();
    AssessmentSession owned = session.get();
    AssessmentItemAttempt attempt = item.get();
    JsonNode copy = parse(attempt.getQuestionCopyJson());
    boolean open = attempt.getStatus() == ItemAttemptStatus.OPEN;
    return Optional.of(
        new AuthorisedItemContext(
            owned.getId(),
            attempt.getId(),
            owned.getPackageId(),
            owned.getPackageRevisionId(),
            owned.getSubject(),
            owned.getExamLanguage(),
            owned.getPurpose().name(),
            open,
            stemText(copy),
            open ? "" : explanationText(copy)));
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<AuthorisedMistakeContext> findOwnedMistake(UUID accountId, UUID mistakeId) {
    if (!mayRead(accountId) || mistakeId == null) return Optional.empty();
    Optional<AssessmentMistake> mistake = mistakes.findById(mistakeId);
    if (mistake.isEmpty() || !accountId.equals(mistake.get().getAccountId())) {
      return Optional.empty();
    }
    AssessmentMistake owned = mistake.get();
    JsonNode copy = parse(owned.getAttemptQuestionJson());
    return Optional.of(
        new AuthorisedMistakeContext(
            owned.getId(),
            owned.getPackageId(),
            owned.getPackageRevisionId(),
            owned.getSubject(),
            owned.getExamLanguage(),
            stemText(copy),
            explanationText(copy),
            uuidArray(copy.path("objectiveIds"))));
  }

  @Override
  @Transactional
  public boolean recordAgentQaIfOpen(UUID accountId, UUID sessionId, UUID itemId) {
    if (!mayRead(accountId) || sessionId == null || itemId == null) return false;
    AssessmentSession session = sessions.findById(sessionId).orElse(null);
    if (session == null || !accountId.equals(session.getAccountId())) return false;
    AssessmentItemAttempt item = items.findByIdAndSessionId(itemId, sessionId).orElse(null);
    if (item == null || item.getStatus() != ItemAttemptStatus.OPEN) return false;
    Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
    if (assistance
        .findByItemAttemptIdAndKindAndTierIndex(item.getId(), "AGENT_QA", 0)
        .isPresent()) {
      return false;
    }
    assistance.save(
        new AssessmentAssistanceEvent(
            session.getId(), item.getId(), accountId, "AGENT_QA", 0, "STRONG", now));
    item.recordStrongAgentAssistance(now);
    items.save(item);
    session.recordAssistance(0, true, now);
    sessions.save(session);
    LOGGER.info(
        "agent.assistance.recorded sessionId={} itemId={} kind=AGENT_QA", sessionId, itemId);
    return true;
  }

  private boolean mayRead(UUID accountId) {
    return accessPolicy.mayReadPublishedContent(authentication.requireAccount(accountId));
  }

  private JsonNode parse(String raw) {
    try {
      return json.readTree(raw);
    } catch (RuntimeException exception) {
      return json.createObjectNode();
    }
  }

  private static String stemText(JsonNode copy) {
    return joinTextBlocks(copy.path("stem"));
  }

  private static String explanationText(JsonNode copy) {
    JsonNode explanations = copy.path("explanations");
    if (!explanations.isArray() || explanations.isEmpty()) return "";
    return joinTextBlocks(explanations.get(0).path("blocks"));
  }

  private static String joinTextBlocks(JsonNode blocks) {
    if (!blocks.isArray()) return "";
    StringBuilder text = new StringBuilder();
    for (JsonNode block : blocks) {
      String kind = block.path("kind").asText("");
      if ("TEXT".equals(kind)) {
        String body = block.path("text").asText("");
        if (!body.isBlank()) {
          if (!text.isEmpty()) text.append('\n');
          text.append(body);
        }
      } else if ("MATH".equals(kind)) {
        String latex = block.path("latex").asText("");
        if (!latex.isBlank()) {
          if (!text.isEmpty()) text.append('\n');
          text.append(latex);
        }
      }
    }
    return text.toString();
  }

  private static List<UUID> uuidArray(JsonNode node) {
    if (!node.isArray()) return List.of();
    List<UUID> values = new ArrayList<>();
    for (JsonNode item : node) {
      if (!item.isTextual()) continue;
      try {
        values.add(UUID.fromString(item.asText()));
      } catch (IllegalArgumentException ignored) {
        // skip malformed ids
      }
    }
    return List.copyOf(values);
  }
}
