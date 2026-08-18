package com.yukcsca.academic.api.student;

import com.yukcsca.academic.application.AcademicAccessDeniedException;
import com.yukcsca.academic.application.AcademicNotFoundException;
import com.yukcsca.academic.application.ContentProgressValidationException;
import com.yukcsca.academic.application.FormalAssistanceDisabledException;
import com.yukcsca.academic.application.InvalidStudentAcademicRequestException;
import com.yukcsca.academic.application.TerminologyValidationException;
import com.yukcsca.identity.application.InvalidCredentialException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(assignableTypes = AcademicStudentController.class)
public class AcademicStudentExceptionHandler {
  private static final Logger LOGGER =
      LoggerFactory.getLogger(AcademicStudentExceptionHandler.class);

  @ExceptionHandler(TerminologyValidationException.class)
  ProblemDetail terminologyValidation(TerminologyValidationException exception) {
    ProblemDetail problem =
        problem(
            HttpStatus.BAD_REQUEST,
            "TERMINOLOGY_VALIDATION_FAILED",
            "Terminology request validation failed.");
    problem.setProperty(
        "violations",
        exception.violations().stream()
            .map(value -> Map.of("path", value.path(), "code", value.code()))
            .toList());
    return problem;
  }

  @ExceptionHandler(FormalAssistanceDisabledException.class)
  ProblemDetail formalDisabled(FormalAssistanceDisabledException exception) {
    return problem(HttpStatus.FORBIDDEN, "FORMAL_ASSISTANCE_DISABLED", exception.getMessage());
  }

  @ExceptionHandler(ContentProgressValidationException.class)
  ProblemDetail progressValidation(ContentProgressValidationException exception) {
    ProblemDetail problem =
        problem(
            HttpStatus.BAD_REQUEST,
            "CONTENT_PROGRESS_VALIDATION_FAILED",
            "Content progress validation failed.");
    problem.setProperty(
        "violations",
        exception.violations().stream()
            .map(value -> Map.of("path", value.path(), "code", value.code()))
            .toList());
    return problem;
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ProblemDetail invalidRequest(
      MethodArgumentNotValidException exception, HttpServletRequest request) {
    List<Map<String, String>> violations =
        exception.getBindingResult().getFieldErrors().stream()
            .map(error -> Map.of("path", error.getField(), "code", validationCode(error)))
            .toList();
    if (isTerminologyPath(request.getRequestURI())) {
      return terminologyValidationProblem(violations);
    }
    return progressValidationProblem(violations);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  ProblemDetail constraintViolation(
      ConstraintViolationException exception, HttpServletRequest request) {
    List<Map<String, String>> violations =
        exception.getConstraintViolations().stream()
            .map(
                violation ->
                    Map.of("path", violation.getPropertyPath().toString(), "code", "INVALID"))
            .toList();
    if (isTerminologyPath(request.getRequestURI())) {
      return terminologyValidationProblem(violations);
    }
    return progressValidationProblem(violations);
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MissingServletRequestParameterException.class,
    MethodArgumentTypeMismatchException.class,
    InvalidStudentAcademicRequestException.class
  })
  ProblemDetail malformedRequest(Exception exception) {
    return problem(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "The request is invalid.");
  }

  @ExceptionHandler(AcademicAccessDeniedException.class)
  ProblemDetail forbidden(AcademicAccessDeniedException exception) {
    return problem(
        HttpStatus.FORBIDDEN,
        "ACCESS_DENIED",
        "The account cannot access student academic content.");
  }

  @ExceptionHandler(InvalidCredentialException.class)
  ProblemDetail unauthorized(InvalidCredentialException exception) {
    return problem(
        HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Authentication is required.");
  }

  @ExceptionHandler(AcademicNotFoundException.class)
  ProblemDetail notFound(AcademicNotFoundException exception) {
    return problem(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage());
  }

  @ExceptionHandler(Exception.class)
  ProblemDetail internal(Exception exception) {
    LOGGER.error(
        "Unexpected student academic operation failure ({})", exception.getClass().getName());
    return problem(
        HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Student academic operation failed.");
  }

  private static boolean isTerminologyPath(String uri) {
    return uri != null
        && (uri.contains("/terminology")
            || uri.contains("/term-lookups")
            || uri.contains("/terms/"));
  }

  private static ProblemDetail terminologyValidationProblem(List<Map<String, String>> violations) {
    ProblemDetail problem =
        problem(
            HttpStatus.BAD_REQUEST,
            "TERMINOLOGY_VALIDATION_FAILED",
            "Terminology request validation failed.");
    problem.setProperty("violations", violations);
    return problem;
  }

  private static ProblemDetail progressValidationProblem(List<Map<String, String>> violations) {
    ProblemDetail problem =
        problem(
            HttpStatus.BAD_REQUEST,
            "CONTENT_PROGRESS_VALIDATION_FAILED",
            "Content progress validation failed.");
    problem.setProperty("violations", violations);
    return problem;
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
