package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.PolicyAcceptance;

public interface PolicyAcceptanceStore {
  PolicyAcceptance save(PolicyAcceptance acceptance);
}
