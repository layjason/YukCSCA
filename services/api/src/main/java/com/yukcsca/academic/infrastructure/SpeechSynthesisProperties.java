package com.yukcsca.academic.infrastructure;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("yukcsca.speech")
public record SpeechSynthesisProperties(
    boolean enabled, String voice, Duration timeout, int maxClipsPerPublish) {
  public SpeechSynthesisProperties {
    if (timeout == null) timeout = Duration.ofSeconds(8);
    if (maxClipsPerPublish <= 0) maxClipsPerPublish = 200;
    if (voice == null || voice.isBlank()) voice = EdgeTtsProtocol.VOICE;
  }

  public boolean usable() {
    return enabled;
  }
}
