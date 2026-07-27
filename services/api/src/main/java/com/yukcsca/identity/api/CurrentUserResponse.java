package com.yukcsca.identity.api;

import com.yukcsca.identity.application.CurrentAccount;
import com.yukcsca.identity.domain.UserAccount;
import com.yukcsca.identity.domain.UserRole;
import java.util.UUID;

public record CurrentUserResponse(
    UUID id,
    String email,
    String displayName,
    String avatarUrl,
    UserRole role,
    boolean onboardingCompleted) {
  static CurrentUserResponse from(UserAccount user) {
    return new CurrentUserResponse(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        user.getAvatarUrl(),
        user.getRole(),
        user.isOnboardingCompleted());
  }

  public static CurrentUserResponse from(CurrentAccount account) {
    return new CurrentUserResponse(
        account.id(),
        account.email(),
        account.displayName(),
        account.avatarUrl(),
        UserRole.valueOf(account.role().name()),
        account.onboardingCompleted());
  }

  @Override
  public String toString() {
    return "CurrentUserResponse[identity=<redacted>, role="
        + role
        + ", onboardingCompleted="
        + onboardingCompleted
        + "]";
  }
}
