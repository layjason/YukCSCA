package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.UserRole;
import java.util.UUID;

public record CurrentAccount(
    UUID id,
    String email,
    String displayName,
    String avatarUrl,
    UserRole role,
    boolean onboardingCompleted) {}
