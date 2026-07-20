package com.yukcsca.identity.api;

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
}
