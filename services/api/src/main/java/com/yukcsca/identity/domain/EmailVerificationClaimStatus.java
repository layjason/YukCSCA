package com.yukcsca.identity.domain;

public enum EmailVerificationClaimStatus {
  PENDING,
  ACCOUNT_CREATED,
  GOOGLE_COLLISION,
  SUPERSEDED,
  EXPIRED
}
