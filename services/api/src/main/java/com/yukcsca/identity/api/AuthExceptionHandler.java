package com.yukcsca.identity.api;

import com.yukcsca.identity.application.AuthConflictException;
import com.yukcsca.identity.application.CredentialConfigurationException;
import com.yukcsca.identity.application.CredentialPolicyException;
import com.yukcsca.identity.application.CredentialRateLimitException;
import com.yukcsca.identity.application.CredentialVerificationException;
import com.yukcsca.identity.application.InvalidCredentialException;
import com.yukcsca.identity.application.PasswordPolicyException;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthExceptionHandler {
  private static final Logger LOGGER = LoggerFactory.getLogger(AuthExceptionHandler.class);

  @ExceptionHandler(InvalidCredentialException.class)
  ProblemDetail invalidCredential(InvalidCredentialException exception) {
    return problem(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIAL", exception.getMessage());
  }

  @ExceptionHandler(AuthConflictException.class)
  ProblemDetail authConflict(AuthConflictException exception) {
    return problem(HttpStatus.CONFLICT, "AUTH_LINK_REQUIRED", exception.getMessage());
  }

  @ExceptionHandler(CredentialVerificationException.class)
  ProblemDetail invalidVerification(CredentialVerificationException exception) {
    return problem(HttpStatus.BAD_REQUEST, "VERIFICATION_INVALID", exception.getMessage());
  }

  @ExceptionHandler(PasswordPolicyException.class)
  ProblemDetail invalidPassword(PasswordPolicyException exception) {
    return problem(HttpStatus.BAD_REQUEST, "PASSWORD_POLICY_REJECTED", exception.getMessage());
  }

  @ExceptionHandler(CredentialPolicyException.class)
  ProblemDetail invalidPolicy(CredentialPolicyException exception) {
    return problem(HttpStatus.BAD_REQUEST, "POLICY_VERSION_STALE", exception.getMessage());
  }

  @ExceptionHandler(CredentialConfigurationException.class)
  ProblemDetail credentialConfiguration(CredentialConfigurationException exception) {
    return problem(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "CREDENTIAL_REGISTRATION_UNAVAILABLE",
        "Credential registration is temporarily unavailable.");
  }

  @ExceptionHandler(CredentialRateLimitException.class)
  ResponseEntity<ProblemDetail> credentialRateLimit(CredentialRateLimitException exception) {
    ProblemDetail body =
        problem(
            HttpStatus.TOO_MANY_REQUESTS,
            "AUTH_RATE_LIMITED",
            "Credential request limit exceeded.");
    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
        .header(HttpHeaders.RETRY_AFTER, Long.toString(exception.retryAfterSeconds()))
        .body(body);
  }

  @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class})
  ProblemDetail invalidRequest(Exception exception) {
    return problem(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Request validation failed.");
  }

  @ExceptionHandler(Exception.class)
  ProblemDetail internalFailure(Exception exception) {
    // Exception messages can contain provider or persistence details, so log only the type.
    LOGGER.error(
        "Unexpected authentication operation failure ({})", exception.getClass().getName());
    return problem(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        "Authentication could not be completed.");
  }

  private static ProblemDetail problem(HttpStatus status, String code, String detail) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setTitle(status.getReasonPhrase());
    problem.setProperty("code", code);
    return problem;
  }
}
