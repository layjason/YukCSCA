package com.yukcsca.identity.domain;

public enum PasswordRecoveryEmailOutboxStatus {
  QUEUED,
  SENT,
  TERMINAL_FAILURE
}
