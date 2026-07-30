package com.yukcsca.profile.api;

import com.yukcsca.identity.application.InvalidCredentialException;
import com.yukcsca.profile.application.ProfileAccessDeniedException;
import com.yukcsca.profile.application.ProfileField;
import com.yukcsca.profile.application.ProfileValidationException;
import com.yukcsca.profile.application.ProfileViolation;
import com.yukcsca.profile.application.ProfileViolationCode;
import com.yukcsca.profile.application.RoleAlreadyAssignedException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import tools.jackson.databind.exc.InvalidNullException;
import tools.jackson.databind.exc.MismatchedInputException;

@RestControllerAdvice(assignableTypes = StudentProfileController.class)
public class StudentProfileExceptionHandler {
  private static final Logger LOGGER =
      LoggerFactory.getLogger(StudentProfileExceptionHandler.class);

  @ExceptionHandler(ProfileValidationException.class)
  ResponseEntity<ValidationProblemResponse> invalidProfile(ProfileValidationException exception) {
    return validationProblemResponse(exception.violations());
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<ValidationProblemResponse> malformedRequest(
      HttpMessageNotReadableException exception) {
    if (exception.getMostSpecificCause() instanceof MismatchedInputException mismatchedInput
        && !mismatchedInput.getPath().isEmpty()) {
      String wireName = mismatchedInput.getPath().getLast().getPropertyName();
      for (ProfileField field : ProfileField.values()) {
        if (field.wireName().equals(wireName)) {
          return validationProblemResponse(
              List.of(
                  new ProfileViolation(
                      field,
                      mismatchedInput instanceof InvalidNullException
                          ? ProfileViolationCode.REQUIRED
                          : ProfileViolationCode.UNSUPPORTED)));
        }
      }
    }
    return validationProblemResponse(List.of());
  }

  @ExceptionHandler(InvalidCredentialException.class)
  ProblemDetail invalidCredential(InvalidCredentialException exception) {
    return problem(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIAL", exception.getMessage());
  }

  @ExceptionHandler(ProfileAccessDeniedException.class)
  ProblemDetail forbidden(ProfileAccessDeniedException exception) {
    return problem(HttpStatus.FORBIDDEN, "STUDENT_PROFILE_FORBIDDEN", exception.getMessage());
  }

  @ExceptionHandler(RoleAlreadyAssignedException.class)
  ProblemDetail roleConflict(RoleAlreadyAssignedException exception) {
    return problem(HttpStatus.CONFLICT, "ROLE_ALREADY_ASSIGNED", exception.getMessage());
  }

  @ExceptionHandler(Exception.class)
  ProblemDetail internalFailure(Exception exception) {
    LOGGER.error(
        "Unexpected student-profile operation failure ({})", exception.getClass().getName());
    return problem(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        "Student profile operation could not be completed.");
  }

  private static ValidationProblemResponse validationProblem(List<ProfileViolation> violations) {
    return new ValidationProblemResponse(
        HttpStatus.BAD_REQUEST.value(),
        HttpStatus.BAD_REQUEST.getReasonPhrase(),
        "Student profile validation failed.",
        "VALIDATION_FAILED",
        violations.stream()
            .map(
                violation ->
                    new FieldViolationResponse(
                        violation.field().wireName(), violation.code().name()))
            .toList());
  }

  private static ResponseEntity<ValidationProblemResponse> validationProblemResponse(
      List<ProfileViolation> violations) {
    return ResponseEntity.badRequest()
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(validationProblem(violations));
  }

  private static ProblemDetail problem(HttpStatus status, String code, String detail) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setTitle(status.getReasonPhrase());
    problem.setProperty("code", code);
    return problem;
  }
}
