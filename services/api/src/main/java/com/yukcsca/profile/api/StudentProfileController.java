package com.yukcsca.profile.api;

import com.yukcsca.identity.api.AuthResponse;
import com.yukcsca.identity.api.CurrentUserResponse;
import com.yukcsca.identity.application.CurrentAuthenticationService;
import com.yukcsca.identity.application.CurrentAuthenticationService.IssuedAuthentication;
import com.yukcsca.identity.application.SecurityEventService;
import com.yukcsca.profile.application.ProfileField;
import com.yukcsca.profile.application.ProfileValidationException;
import com.yukcsca.profile.application.ProfileViolation;
import com.yukcsca.profile.application.ProfileViolationCode;
import com.yukcsca.profile.application.StudentActivationCommand;
import com.yukcsca.profile.application.StudentActivationResult;
import com.yukcsca.profile.application.StudentProfileService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/student-profile")
public class StudentProfileController {
  private final StudentProfileService profiles;
  private final CurrentAuthenticationService authentication;
  private final SecurityEventService securityEvents;

  public StudentProfileController(
      StudentProfileService profiles,
      CurrentAuthenticationService authentication,
      SecurityEventService securityEvents) {
    this.profiles = profiles;
    this.authentication = authentication;
    this.securityEvents = securityEvents;
  }

  @PostMapping
  public ResponseEntity<StudentActivationResponse> activate(
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody ActivateStudentProfileRequest request,
      BindingResult validation,
      HttpServletResponse response) {
    if (validation.hasErrors()) {
      throw new ProfileValidationException(
          validation.getFieldErrors().stream()
              .map(
                  error ->
                      new ProfileViolation(
                          ProfileField.fromWireName(error.getField()),
                          "Size".equals(error.getCode())
                              ? ProfileViolationCode.TOO_LONG
                              : ProfileViolationCode.REQUIRED))
              .toList());
    }
    UUID accountId = UUID.fromString(jwt.getSubject());
    StudentActivationResult result =
        profiles.activate(
            accountId,
            new StudentActivationCommand(
                request.preferredName(),
                request.birthYear(),
                request.currentGrade(),
                request.city(),
                request.defaultExplanationLanguage()));
    if (result.created()) securityEvents.recordStudentActivation(accountId);

    IssuedAuthentication issued = authentication.issueFor(accountId);
    AuthResponse auth =
        new AuthResponse(
            issued.accessToken(),
            "Bearer",
            issued.expiresInSeconds(),
            CurrentUserResponse.from(issued.account()));
    disableCaching(response);
    return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
        .body(new StudentActivationResponse(StudentProfileResponse.from(result.profile()), auth));
  }

  @GetMapping("/me")
  public StudentProfileResponse getMyProfile(
      @AuthenticationPrincipal Jwt jwt, HttpServletResponse response) {
    disableCaching(response);
    return StudentProfileResponse.from(profiles.getOwnProfile(UUID.fromString(jwt.getSubject())));
  }

  private static void disableCaching(HttpServletResponse response) {
    response.setHeader(HttpHeaders.CACHE_CONTROL, CacheControl.noStore().getHeaderValue());
    response.setHeader(HttpHeaders.PRAGMA, "no-cache");
  }
}
