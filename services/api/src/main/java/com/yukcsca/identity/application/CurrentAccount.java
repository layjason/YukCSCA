package com.yukcsca.identity.application;

import java.util.UUID;

public record CurrentAccount(
    UUID id,
    String email,
    String displayName,
    String avatarUrl,
    CurrentAccountRole role,
    boolean onboardingCompleted) {}
