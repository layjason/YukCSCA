package com.yukcsca.identity.api;

import com.yukcsca.identity.application.AccessTokenService;
import com.yukcsca.identity.application.AuthService;
import com.yukcsca.identity.application.AuthSettings;
import com.yukcsca.identity.application.InvalidCredentialException;
import com.yukcsca.identity.application.SecurityEventService;
import com.yukcsca.identity.application.SessionService;
import com.yukcsca.identity.domain.SecurityEventType;
import com.yukcsca.identity.domain.UserAccount;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.Arrays;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private static final String REFRESH_COOKIE = "yukcsca_refresh";

  private final AuthService authService;
  private final SessionService sessionService;
  private final AccessTokenService accessTokenService;
  private final AuthSettings properties;
  private final SecurityEventService securityEvents;

  public AuthController(
      AuthService authService,
      SessionService sessionService,
      AccessTokenService accessTokenService,
      AuthSettings properties,
      SecurityEventService securityEvents) {
    this.authService = authService;
    this.sessionService = sessionService;
    this.accessTokenService = accessTokenService;
    this.properties = properties;
    this.securityEvents = securityEvents;
  }

  @PostMapping("/google")
  public AuthResponse googleLogin(
      @Valid @RequestBody GoogleLoginRequest request, HttpServletResponse response) {
    UserAccount user = authService.loginWithGoogle(request.credential());
    AuthResponse authResponse = responseFor(user);
    SessionService.SessionToken session = sessionService.create(user);
    securityEvents.record(SecurityEventType.GOOGLE_LOGIN_SUCCEEDED, user.getId());
    setRefreshCookie(response, session.rawToken(), properties.refreshTokenTtl());
    disableCaching(response);
    return authResponse;
  }

  @PostMapping("/refresh")
  public AuthResponse refresh(HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = requiredCookie(request, REFRESH_COOKIE);
    try {
      SessionService.SessionToken rotated = sessionService.rotate(refreshToken);
      securityEvents.record(SecurityEventType.REFRESH_ROTATED, rotated.user().getId());
      setRefreshCookie(response, rotated.rawToken(), properties.refreshTokenTtl());
      disableCaching(response);
      return responseFor(rotated.user());
    } catch (InvalidCredentialException exception) {
      setRefreshCookie(response, "", Duration.ZERO);
      disableCaching(response);
      throw exception;
    }
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(HttpServletRequest request, HttpServletResponse response) {
    UUID userId = sessionService.revoke(cookieOrNull(request, REFRESH_COOKIE));
    securityEvents.record(SecurityEventType.LOGOUT, userId);
    setRefreshCookie(response, "", Duration.ZERO);
    disableCaching(response);
  }

  @GetMapping("/me")
  public CurrentUserResponse me(@AuthenticationPrincipal Jwt jwt, HttpServletResponse response) {
    UserAccount user = authService.requireUser(UUID.fromString(jwt.getSubject()));
    disableCaching(response);
    return CurrentUserResponse.from(user);
  }

  private AuthResponse responseFor(UserAccount user) {
    AccessTokenService.IssuedAccessToken token = accessTokenService.issue(user);
    return new AuthResponse(
        token.value(), "Bearer", token.expiresInSeconds(), CurrentUserResponse.from(user));
  }

  private void setRefreshCookie(HttpServletResponse response, String value, Duration maxAge) {
    ResponseCookie cookie =
        ResponseCookie.from(REFRESH_COOKIE, value)
            .httpOnly(true)
            .secure(properties.cookieSecure())
            .sameSite(properties.cookieSameSite())
            .path("/api/v1/auth")
            .maxAge(maxAge)
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }

  private static void disableCaching(HttpServletResponse response) {
    response.setHeader(HttpHeaders.CACHE_CONTROL, CacheControl.noStore().getHeaderValue());
    response.setHeader(HttpHeaders.PRAGMA, "no-cache");
  }

  private static String requiredCookie(HttpServletRequest request, String name) {
    String value = cookieOrNull(request, name);
    if (value == null || value.isBlank()) {
      throw new InvalidCredentialException("Refresh session is missing.");
    }
    return value;
  }

  private static String cookieOrNull(HttpServletRequest request, String name) {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) return null;
    return Arrays.stream(cookies)
        .filter(cookie -> name.equals(cookie.getName()))
        .map(Cookie::getValue)
        .findFirst()
        .orElse(null);
  }
}
