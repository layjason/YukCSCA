package com.yukcsca.identity.domain;

public enum CredentialEmailOutboxStatus {
  QUEUED,
  SENT,
  TERMINAL_FAILURE
}
