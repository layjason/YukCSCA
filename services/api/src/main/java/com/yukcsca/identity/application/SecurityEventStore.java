package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.SecurityEvent;

public interface SecurityEventStore {
  SecurityEvent save(SecurityEvent event);
}
