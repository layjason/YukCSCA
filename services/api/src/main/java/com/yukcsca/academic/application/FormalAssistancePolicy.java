package com.yukcsca.academic.application;

import java.util.UUID;

/** Reserved formal-mock lock. Always false until VS-012 ships formal sessions. */
public interface FormalAssistancePolicy {
  boolean isDisabled(UUID accountId);
}
