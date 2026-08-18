package com.yukcsca.assessment.api;

import com.yukcsca.academic.application.FormalAssistanceDisabledException;
import com.yukcsca.assessment.application.AssessmentAccessDeniedException;
import com.yukcsca.assessment.application.AssessmentConflictException;
import com.yukcsca.assessment.application.AssessmentNotFoundException;
import com.yukcsca.assessment.application.AssessmentValidationException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = AssessmentStudentController.class)
public class AssessmentExceptionHandler {
  private static final Logger LOGGER = LoggerFactory.getLogger(AssessmentExceptionHandler.class);

  @ExceptionHandler(AssessmentValidationException.class)
  ProblemDetail validation(AssessmentValidationException exception) {
    ProblemDetail problem =
        problem(
            HttpStatus.BAD_REQUEST,
            "ASSESSMENT_VALIDATION_FAILED",
            "Assessment request validation failed.");
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
            .map(error -> Map.of("path", error.getField(), "code", "INVALID"))
            .toList();
    ProblemDetail problem =
        problem(
            HttpStatus.BAD_REQUEST,
            "ASSESSMENT_VALIDATION_FAILED",
            "Assessment request validation failed.");
    problem.setProperty("violations", violations);
    return problem;
  }

  @ExceptionHandler(AssessmentConflictException.class)
  ProblemDetail conflict(AssessmentConflictException exception) {
    ProblemDetail problem = problem(HttpStatus.CONFLICT, exception.code(), exception.getMessage());
    if (exception.lockReason() != null) {
      problem.setProperty("lockReason", exception.lockReason());
    }
    return problem;
  }

  @ExceptionHandler(AssessmentNotFoundException.class)
  ProblemDetail notFound(AssessmentNotFoundException exception) {
    return problem(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage());
  }

  @ExceptionHandler(FormalAssistanceDisabledException.class)
  ProblemDetail formalDisabled(FormalAssistanceDisabledException exception) {
    return problem(HttpStatus.FORBIDDEN, "FORMAL_ASSISTANCE_DISABLED", exception.getMessage());
  }

  @ExceptionHandler(AssessmentAccessDeniedException.class)
  ProblemDetail forbidden(AssessmentAccessDeniedException exception) {
    return problem(
        HttpStatus.FORBIDDEN, "ACCESS_DENIED", "The account cannot access assessment resources.");
  }

  @ExceptionHandler(Exception.class)
  ProblemDetail unexpected(Exception exception) {
    LOGGER.error("assessment.unexpected", exception);
    return problem(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        "An unexpected assessment error occurred.");
  }

  private static ProblemDetail problem(HttpStatus status, String code, String detail) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setTitle(status.getReasonPhrase());
    problem.setProperty("code", code);
    Map<String, Object> properties = new LinkedHashMap<>();
    properties.put("code", code);
    return problem;
  }
}
