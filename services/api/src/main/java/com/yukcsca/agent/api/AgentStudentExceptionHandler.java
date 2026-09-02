package com.yukcsca.agent.api;

import com.yukcsca.academic.application.FormalAssistanceDisabledException;
import com.yukcsca.agent.application.AgentAccessDeniedException;
import com.yukcsca.agent.application.AgentBudgetExceededException;
import com.yukcsca.agent.application.AgentConflictException;
import com.yukcsca.agent.application.AgentDisabledException;
import com.yukcsca.agent.application.AgentNotFoundException;
import com.yukcsca.agent.application.AgentProviderUnavailableException;
import com.yukcsca.agent.application.AgentValidationException;
import com.yukcsca.identity.application.InvalidCredentialException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(assignableTypes = AgentStudentController.class)
public class AgentStudentExceptionHandler {
  private static final Logger LOGGER = LoggerFactory.getLogger(AgentStudentExceptionHandler.class);

  @ExceptionHandler(AgentValidationException.class)
  ProblemDetail validation(AgentValidationException exception) {
    ProblemDetail problem =
        problem(HttpStatus.BAD_REQUEST, "AGENT_VALIDATION_FAILED", exception.getMessage());
    problem.setProperty(
        "violations",
        exception.violations().stream()
            .map(value -> Map.of("path", value.path(), "code", value.code()))
            .toList());
    return problem;
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ProblemDetail invalidRequest(MethodArgumentNotValidException exception) {
    List<Map<String, String>> violations =
        exception.getBindingResult().getFieldErrors().stream()
            .map(error -> Map.of("path", error.getField(), "code", validationCode(error)))
            .toList();
    ProblemDetail problem =
        problem(
            HttpStatus.BAD_REQUEST, "AGENT_VALIDATION_FAILED", "Agent request validation failed.");
    problem.setProperty("violations", violations);
    return problem;
  }

  @ExceptionHandler(ConstraintViolationException.class)
  ProblemDetail constraintViolation(ConstraintViolationException exception) {
    List<Map<String, String>> violations =
        exception.getConstraintViolations().stream()
            .map(
                violation ->
                    Map.of("path", violation.getPropertyPath().toString(), "code", "INVALID"))
            .toList();
    ProblemDetail problem =
        problem(
            HttpStatus.BAD_REQUEST, "AGENT_VALIDATION_FAILED", "Agent request validation failed.");
    problem.setProperty("violations", violations);
    return problem;
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MissingServletRequestParameterException.class,
    MissingRequestHeaderException.class,
    MethodArgumentTypeMismatchException.class
  })
  ProblemDetail malformed(Exception exception) {
    return problem(HttpStatus.BAD_REQUEST, "AGENT_VALIDATION_FAILED", "The request is invalid.");
  }

  @ExceptionHandler(AgentDisabledException.class)
  ProblemDetail disabled(AgentDisabledException exception) {
    return problem(HttpStatus.FORBIDDEN, "AGENT_DISABLED", exception.getMessage());
  }

  @ExceptionHandler(FormalAssistanceDisabledException.class)
  ProblemDetail formalDisabled(FormalAssistanceDisabledException exception) {
    return problem(HttpStatus.FORBIDDEN, "FORMAL_ASSISTANCE_DISABLED", exception.getMessage());
  }

  @ExceptionHandler(AgentConflictException.class)
  ProblemDetail conflict(AgentConflictException exception) {
    return problem(HttpStatus.CONFLICT, exception.code(), exception.getMessage());
  }

  @ExceptionHandler(AgentBudgetExceededException.class)
  ResponseEntity<ProblemDetail> budget(AgentBudgetExceededException exception) {
    ProblemDetail problem =
        problem(HttpStatus.TOO_MANY_REQUESTS, "AGENT_BUDGET_EXCEEDED", exception.getMessage());
    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
        .cacheControl(CacheControl.noStore())
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .header(HttpHeaders.RETRY_AFTER, Long.toString(exception.retryAfterSeconds()))
        .body(problem);
  }

  @ExceptionHandler(AgentProviderUnavailableException.class)
  ProblemDetail providerUnavailable(AgentProviderUnavailableException exception) {
    return problem(
        HttpStatus.SERVICE_UNAVAILABLE, "AGENT_PROVIDER_UNAVAILABLE", exception.getMessage());
  }

  @ExceptionHandler(AgentNotFoundException.class)
  ResponseEntity<ProblemDetail> notFound(AgentNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .cacheControl(CacheControl.noStore())
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problem(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage()));
  }

  @ExceptionHandler(AgentAccessDeniedException.class)
  ProblemDetail forbidden(AgentAccessDeniedException exception) {
    return problem(
        HttpStatus.FORBIDDEN, "ACCESS_DENIED", "The account cannot access agent resources.");
  }

  @ExceptionHandler(InvalidCredentialException.class)
  ProblemDetail unauthorized(InvalidCredentialException exception) {
    return problem(
        HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Authentication is required.");
  }

  @ExceptionHandler(Exception.class)
  ProblemDetail unexpected(Exception exception, HttpServletRequest request) {
    LOGGER.error("agent.unexpected path={}", request.getRequestURI(), exception);
    return problem(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Agent operation failed.");
  }

  private static ProblemDetail problem(HttpStatus status, String code, String detail) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setTitle(status.getReasonPhrase());
    problem.setProperty("code", code);
    return problem;
  }

  private static String validationCode(FieldError error) {
    return switch (error.getCode() == null ? "" : error.getCode()) {
      case "NotBlank", "NotNull" -> "REQUIRED";
      case "Min", "Max", "Size" -> "OUT_OF_RANGE";
      default -> "INVALID";
    };
  }
}
