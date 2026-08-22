package com.yukcsca.assessment.application;

import com.yukcsca.academic.application.AssessmentItemContextPort;
import com.yukcsca.assessment.domain.AssessmentItemAttempt;
import com.yukcsca.assessment.domain.AssessmentSession;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class AssessmentItemContextService implements AssessmentItemContextPort {
  private final AssessmentSessionStore sessions;
  private final AssessmentItemAttemptStore items;
  private final JsonMapper json;

  public AssessmentItemContextService(
      AssessmentSessionStore sessions, AssessmentItemAttemptStore items, JsonMapper json) {
    this.sessions = sessions;
    this.items = items;
    this.json = json;
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<ItemContext> findOwnedItem(UUID accountId, UUID sessionId, UUID itemId) {
    if (accountId == null || sessionId == null || itemId == null) return Optional.empty();
    Optional<AssessmentSession> session = sessions.findById(sessionId);
    if (session.isEmpty() || !accountId.equals(session.get().getAccountId())) {
      return Optional.empty();
    }
    Optional<AssessmentItemAttempt> item = items.findByIdAndSessionId(itemId, sessionId);
    if (item.isEmpty()) return Optional.empty();
    JsonNode copy;
    try {
      copy = json.readTree(item.get().getQuestionCopyJson());
    } catch (RuntimeException exception) {
      copy = null;
    }
    String examLanguage =
        copy != null && copy.path("examLanguage").isTextual()
            ? copy.path("examLanguage").asText()
            : session.get().getExamLanguage();
    return Optional.of(
        new ItemContext(
            session.get().getId(),
            item.get().getId(),
            session.get().getPackageRevisionId(),
            item.get().getQuestionId(),
            examLanguage,
            session.get().getPurpose().name(),
            stemTexts(copy)));
  }

  private static List<String> stemTexts(JsonNode copy) {
    if (copy == null) return List.of();
    JsonNode stem = copy.path("stem");
    if (!stem.isArray()) return List.of();
    List<String> texts = new ArrayList<>();
    for (JsonNode block : stem) {
      if (!"TEXT".equals(block.path("kind").asText(null))) continue;
      String body = block.path("text").asText(null);
      if (body != null && !body.isBlank()) {
        texts.add(body);
      }
    }
    return List.copyOf(texts);
  }
}
