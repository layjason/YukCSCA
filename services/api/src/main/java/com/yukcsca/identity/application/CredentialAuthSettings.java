package com.yukcsca.identity.application;

import java.time.Duration;

public interface CredentialAuthSettings {
  boolean enabled();

  String verificationSecret();

  String verificationWebOrigin();

  String termsVersion();

  String privacyNoticeVersion();

  String mailFrom();

  Duration claimTtl();

  Duration pendingRetention();

  Duration resendCooldown();

  int identifierRequests();

  Duration identifierWindow();

  int maxIdentifiers();

  Duration deliveryRetryBase();

  int deliveryMaxAttempts();

  Duration dispatchInterval();

  Duration cleanupInterval();
}
