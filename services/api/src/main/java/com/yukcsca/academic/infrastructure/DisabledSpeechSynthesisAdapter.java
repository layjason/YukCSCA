package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.SpeechSynthesisPort;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnMissingBean(SpeechSynthesisPort.class)
public class DisabledSpeechSynthesisAdapter implements SpeechSynthesisPort {
  @Override
  public Optional<byte[]> synthesize(String text) {
    return Optional.empty();
  }
}
