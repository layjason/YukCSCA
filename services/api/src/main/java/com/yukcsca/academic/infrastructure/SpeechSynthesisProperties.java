package com.yukcsca.academic.infrastructure;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("yukcsca.speech")
public record SpeechSynthesisProperties(
    boolean enabled,
    String key,
    String region,
    String endpoint,
    Duration timeout,
    int maxClipsPerPublish) {
  public SpeechSynthesisProperties {
    if (timeout == null) timeout = Duration.ofSeconds(8);
    if (maxClipsPerPublish <= 0) maxClipsPerPublish = 200;
    if (key == null) key = "";
    if (region == null) region = "";
    if (endpoint == null) endpoint = "";
  }

  public boolean usable() {
    return enabled && key != null && !key.isBlank();
  }
}
