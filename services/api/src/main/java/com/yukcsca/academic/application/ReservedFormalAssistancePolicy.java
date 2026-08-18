package com.yukcsca.academic.application;

import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
public class ReservedFormalAssistancePolicy implements FormalAssistancePolicy {
  @Override
  public boolean isDisabled(UUID accountId) {
    return false;
  }
}
