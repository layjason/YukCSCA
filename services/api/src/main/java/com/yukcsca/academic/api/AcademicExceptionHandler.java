package com.yukcsca.academic.api;

import com.yukcsca.academic.application.AcademicAccessDeniedException;
import com.yukcsca.academic.application.AcademicConflictException;
import com.yukcsca.academic.application.AcademicNotFoundException;
import com.yukcsca.academic.application.AcademicValidationException;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice(assignableTypes = AcademicAdminController.class)
public class AcademicExceptionHandler {
  private static final Logger LOGGER = LoggerFactory.getLogger(AcademicExceptionHandler.class);

  @ExceptionHandler(AcademicValidationException.class)
  ProblemDetail validation(AcademicValidationException exception) {
    ProblemDetail problem =
        problem(
            HttpStatus.BAD_REQUEST,
            "ACADEMIC_VALIDATION_FAILED",
            "Academic content validation failed.");
    problem.setProperty(
        "violations",
        exception.violations().stream()
            .map(value -> Map.of("path", value.path(), "code", value.code().name()))
            .toList());
    return problem;
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ProblemDetail invalidRequest(MethodArgumentNotValidException exception) {
    List<Map<String, String>> violations =
        exception.getBindingResult().getFieldErrors().stream()
            .map(error -> Map.of("path", error.getField(), "code", validationCode(error)))
            .toList();
    return academicValidation(violations);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  ProblemDetail constraintViolation(ConstraintViolationException exception) {
    return academicValidation(
        exception.getConstraintViolations().stream()
            .map(
                violation ->
                    Map.of("path", violation.getPropertyPath().toString(), "code", "INVALID"))
            .toList());
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MissingServletRequestPartException.class
  })
  ProblemDetail malformedRequest(Exception exception) {
    return academicValidation(List.of(Map.of("path", "request", "code", "INVALID")));
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  ProblemDetail uploadTooLarge(MaxUploadSizeExceededException exception) {
    return academicValidation(List.of(Map.of("path", "file", "code", "OUT_OF_RANGE")));
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

  @ExceptionHandler(DataIntegrityViolationException.class)
  ProblemDetail persistenceConflict(DataIntegrityViolationException exception) {
    return problem(
        HttpStatus.CONFLICT, "ACADEMIC_CONFLICT", "Academic state changed concurrently.");
  }

  @ExceptionHandler(Exception.class)
  ProblemDetail internal(Exception exception) {
    LOGGER.error("Unexpected academic operation failure ({})", exception.getClass().getName());
    return problem(
        HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Academic administration failed.");
  }

  private static ProblemDetail problem(HttpStatus status, String code, String detail) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setTitle(status.getReasonPhrase());
    problem.setProperty("code", code);
    return problem;
  }

  private static ProblemDetail academicValidation(List<Map<String, String>> violations) {
    ProblemDetail problem =
        problem(
            HttpStatus.BAD_REQUEST,
            "ACADEMIC_VALIDATION_FAILED",
            "Academic content validation failed.");
    problem.setProperty("violations", violations);
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
