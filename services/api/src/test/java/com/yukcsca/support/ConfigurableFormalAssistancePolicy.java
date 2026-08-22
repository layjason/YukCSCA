package com.yukcsca.support;

import com.yukcsca.academic.application.FormalAssistancePolicy;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Primary
@Profile("test")
public class ConfigurableFormalAssistancePolicy implements FormalAssistancePolicy {
  private final AtomicBoolean disabled = new AtomicBoolean(false);

  public void setDisabled(boolean value) {
    disabled.set(value);
  }

  @Override
  public boolean isDisabled(UUID accountId) {
    return disabled.get();
  }
}
