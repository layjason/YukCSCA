package com.yukcsca.academic.infrastructure;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Publish-time speech synthesis settings. The gTTS adapter (ADR-0003) speaks {@code zh-CN} only —
 * reviewed Chinese term pronunciation — so there is no voice selection; the accent follows the
 * Google Translate endpoint itself.
 */
@ConfigurationProperties("yukcsca.speech")
public record SpeechSynthesisProperties(boolean enabled, Duration timeout, int maxClipsPerPublish) {
  public SpeechSynthesisProperties {
    if (timeout == null) timeout = Duration.ofSeconds(8);
    if (maxClipsPerPublish <= 0) maxClipsPerPublish = 200;
  }

  public boolean usable() {
    return enabled;
  }
}
