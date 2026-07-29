package com.yukcsca.identity.application;

public record PasswordRecoveryEmail(String recipient, String recoveryUrl) {}
