package com.yukcsca.academic.api;

import com.yukcsca.academic.api.video.AcademicVideoResponses.RenderJobResponse;
import com.yukcsca.academic.application.AcademicAccessDeniedException;
import com.yukcsca.academic.application.AcademicConflictException;
import com.yukcsca.academic.application.AcademicNotFoundException;
import com.yukcsca.academic.application.AcademicValidationException;
import com.yukcsca.academic.application.AcademicViolation;
import com.yukcsca.academic.application.MediaStorageUnavailableException;
import com.yukcsca.academic.application.RenderJobConflictException;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Problem mapping for the admin reviewed-video endpoints (VS-010B). */
@RestControllerAdvice(assignableTypes = AcademicVideoAdminController.class)
public class AcademicVideoExceptionHandler {
  private static final Logger LOGGER = LoggerFactory.getLogger(AcademicVideoExceptionHandler.class);

  @ExceptionHandler(AcademicValidationException.class)
  ProblemDetail validation(AcademicValidationException exception) {
    ProblemDetail problem =
        problem(
            HttpStatus.BAD_REQUEST,
            "ACADEMIC_VALIDATION_FAILED",
            "Academic content validation failed.");
    problem.setProperty("violations", violationMaps(exception.violations()));
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
            HttpStatus.BAD_REQUEST,
            "ACADEMIC_VALIDATION_FAILED",
            "Academic content validation failed.");
    problem.setProperty("violations", violations);
    return problem;
  }

  @ExceptionHandler(ConstraintViolationException.class)
  ProblemDetail constraintViolation(ConstraintViolationException exception) {
    ProblemDetail problem =
        problem(
            HttpStatus.BAD_REQUEST,
            "ACADEMIC_VALIDATION_FAILED",
            "Academic content validation failed.");
    problem.setProperty(
        "violations",
        exception.getConstraintViolations().stream()
            .map(
                violation ->
                    Map.of("path", violation.getPropertyPath().toString(), "code", "INVALID"))
            .toList());
    return problem;
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ProblemDetail malformedRequest(HttpMessageNotReadableException exception) {
    ProblemDetail problem =
        problem(
            HttpStatus.BAD_REQUEST,
            "ACADEMIC_VALIDATION_FAILED",
            "Academic content validation failed.");
    problem.setProperty("violations", List.of(Map.of("path", "request", "code", "INVALID")));
    return problem;
  }

  @ExceptionHandler(AcademicAccessDeniedException.class)
  ProblemDetail forbidden(AcademicAccessDeniedException exception) {
    return problem(
        HttpStatus.FORBIDDEN,
        "ACCESS_DENIED",
        "The account cannot access academic administration.");
  }

  @ExceptionHandler(AcademicNotFoundException.class)
  ResponseEntity<ProblemDetail> notFound(AcademicNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .cacheControl(CacheControl.noStore())
        .body(problem(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage()));
  }

  @ExceptionHandler(AcademicConflictException.class)
  ProblemDetail conflict(AcademicConflictException exception) {
    return problem(HttpStatus.CONFLICT, exception.code(), exception.getMessage());
  }

  /** 409 RENDER_JOB_ACTIVE carries the active job so a lost enqueue is recoverable. */
  @ExceptionHandler(RenderJobConflictException.class)
  ProblemDetail renderJobConflict(RenderJobConflictException exception) {
    ProblemDetail problem =
        problem(
            HttpStatus.CONFLICT,
            "RENDER_JOB_ACTIVE",
            "An asynchronous job is already active for this work.");
    problem.setProperty("job", RenderJobResponse.from(exception.activeJob()));
    return problem;
  }

  @ExceptionHandler(MediaStorageUnavailableException.class)
  ProblemDetail storageUnavailable(MediaStorageUnavailableException exception) {
    LOGGER.warn("video.storage.unavailable reason={}", exception.getMessage());
    return problem(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "MEDIA_STORAGE_UNAVAILABLE",
        "Reviewed-video object storage is not configured.");
  }

  @ExceptionHandler(Exception.class)
  ProblemDetail internal(Exception exception) {
    LOGGER.error(
        "Unexpected academic video operation failure ({})", exception.getClass().getName());
    return problem(
        HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Academic video operation failed.");
  }

  private static ProblemDetail problem(HttpStatus status, String code, String detail) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setTitle(status.getReasonPhrase());
    problem.setProperty("code", code);
    return problem;
  }

  private static List<Map<String, String>> violationMaps(List<AcademicViolation> violations) {
    return violations.stream()
        .map(value -> Map.of("path", value.path(), "code", value.code().name()))
        .toList();
  }

  private static String validationCode(FieldError error) {
    return switch (error.getCode() == null ? "" : error.getCode()) {
      case "NotBlank", "NotNull" -> "REQUIRED";
      case "Min", "Max", "Size" -> "OUT_OF_RANGE";
      default -> "INVALID";
    };
  }
}
