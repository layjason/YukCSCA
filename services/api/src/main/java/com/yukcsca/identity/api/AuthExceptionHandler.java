package com.yukcsca.identity.api;

import com.yukcsca.identity.application.AuthConflictException;
import com.yukcsca.identity.application.InvalidCredentialException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AuthExceptionHandler {
  @ExceptionHandler(InvalidCredentialException.class)
  ProblemDetail invalidCredential(InvalidCredentialException exception) {
    return problem(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIAL", exception.getMessage());
  }

  @ExceptionHandler(AuthConflictException.class)
  ProblemDetail authConflict(AuthConflictException exception) {
    return problem(HttpStatus.CONFLICT, "AUTH_LINK_REQUIRED", exception.getMessage());
  }

  @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class})
  ProblemDetail invalidRequest(Exception exception) {
    return problem(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Request validation failed.");
  }

  private static ProblemDetail problem(HttpStatus status, String code, String detail) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setTitle(status.getReasonPhrase());
    problem.setProperty("code", code);
    return problem;
  }
}
