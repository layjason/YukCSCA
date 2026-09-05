package com.yukcsca.agent.api;

import com.yukcsca.agent.application.AgentStudentService;
import com.yukcsca.agent.application.AgentViews.AvailabilityView;
import com.yukcsca.agent.application.AgentViews.ConversationStartResult;
import com.yukcsca.agent.application.AgentViews.ConversationView;
import com.yukcsca.agent.application.AgentViews.LocatorView;
import com.yukcsca.agent.application.AgentViews.StepView;
import com.yukcsca.agent.application.AgentViews.TurnView;
import com.yukcsca.agent.domain.AgentContextType;
import com.yukcsca.agent.domain.AgentTurnStatus;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agent")
public class AgentStudentController {
  private final AgentStudentService agent;

  public AgentStudentController(AgentStudentService agent) {
    this.agent = agent;
  }

  @GetMapping("/availability")
  public Map<String, Object> getAvailability(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam AgentContextType contextType,
      @RequestParam UUID contextId,
      @RequestParam(required = false) UUID sessionId,
      @RequestParam(required = false) UUID itemId,
      HttpServletResponse response) {
    noStore(response);
    AvailabilityView view =
        agent.availability(actor(jwt), contextType, contextId, sessionId, itemId);
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("available", view.available());
    body.put("unavailableCode", view.unavailableCode());
    return body;
  }

  @PostMapping("/conversations")
  public ResponseEntity<Map<String, Object>> startConversation(
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody StartConversationRequest request,
      HttpServletResponse response) {
    noStore(response);
    ConversationStartResult result =
        agent.startConversation(
            actor(jwt),
            request.contextType(),
            request.contextId(),
            request.sessionId(),
            request.itemId());
    return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
        .cacheControl(CacheControl.noStore())
        .header(HttpHeaders.PRAGMA, "no-cache")
        .body(conversationBody(result.conversation()));
  }

  @GetMapping("/conversations/{conversationId}")
  public Map<String, Object> getConversation(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID conversationId,
      HttpServletResponse response) {
    noStore(response);
    return conversationBody(agent.getConversation(actor(jwt), conversationId));
  }

  @PostMapping("/conversations/{conversationId}/turns")
  public ResponseEntity<Map<String, Object>> askTurn(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID conversationId,
      @RequestHeader("Idempotency-Key") UUID idempotencyKey,
      @Valid @RequestBody AskTurnRequest request,
      HttpServletResponse response) {
    noStore(response);
    TurnView turn =
        agent.askTurn(
            actor(jwt), conversationId, idempotencyKey, request.questionText(), request.quote());
    return ResponseEntity.status(HttpStatus.CREATED)
        .cacheControl(CacheControl.noStore())
        .header(HttpHeaders.PRAGMA, "no-cache")
        .body(completedTurnBody(turn));
  }

  private static Map<String, Object> conversationBody(ConversationView conversation) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("id", conversation.id());
    body.put("contextType", conversation.contextType().name());
    body.put("contextId", conversation.contextId());
    body.put("subject", conversation.subject());
    body.put("packageId", conversation.packageId());
    body.put("packageRevisionId", conversation.packageRevisionId());
    body.put("sessionId", conversation.sessionId());
    body.put("itemId", conversation.itemId());
    body.put("explanationLanguage", conversation.explanationLanguage());
    body.put("examLanguage", conversation.examLanguage());
    body.put("turns", conversation.turns().stream().map(AgentStudentController::turnBody).toList());
    body.put("createdAt", conversation.createdAt());
    body.put("updatedAt", conversation.updatedAt());
    return body;
  }

  private static Map<String, Object> turnBody(TurnView turn) {
    if (turn.status() == AgentTurnStatus.COMPLETED) {
      return completedTurnBody(turn);
    }
    Map<String, Object> body = identity(turn);
    body.put("status", turn.status().name());
    return body;
  }

  private static Map<String, Object> completedTurnBody(TurnView turn) {
    Map<String, Object> body = identity(turn);
    body.put("status", "COMPLETED");
    body.put("kind", turn.kind() == null ? null : turn.kind().name());
    body.put("body", turn.body());
    body.put(
        "locators", turn.locators().stream().map(AgentStudentController::locatorBody).toList());
    body.put("steps", turn.steps().stream().map(AgentStudentController::stepBody).toList());
    body.put("suggestedFollowUps", turn.suggestedFollowUps());
    body.put("latencyMs", turn.latencyMs());
    return body;
  }

  private static Map<String, Object> identity(TurnView turn) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("id", turn.id());
    body.put("questionText", turn.questionText());
    body.put("quote", turn.quote());
    body.put("createdAt", turn.createdAt());
    return body;
  }

  private static Map<String, Object> locatorBody(LocatorView locator) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("sourceKind", locator.sourceKind().name());
    body.put("sourceId", locator.sourceId());
    body.put("label", locator.label());
    body.put("blockIndex", locator.blockIndex());
    body.put("packageRevisionId", locator.packageRevisionId());
    return body;
  }

  private static Map<String, Object> stepBody(StepView step) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("kind", step.kind().name());
    body.put("label", step.label());
    body.put(
        "locators", step.locators().stream().map(AgentStudentController::locatorBody).toList());
    body.put("latencyMs", step.latencyMs());
    return body;
  }

  private static UUID actor(Jwt jwt) {
    return UUID.fromString(jwt.getSubject());
  }

  private static void noStore(HttpServletResponse response) {
    response.setHeader(HttpHeaders.CACHE_CONTROL, CacheControl.noStore().getHeaderValue());
    response.setHeader(HttpHeaders.PRAGMA, "no-cache");
  }

  public record StartConversationRequest(
      @NotNull AgentContextType contextType,
      @NotNull UUID contextId,
      UUID sessionId,
      UUID itemId) {}

  public record AskTurnRequest(
      @NotBlank @Size(min = 1, max = 2000) String questionText,
      @Size(min = 1, max = 4000) String quote) {}
}
