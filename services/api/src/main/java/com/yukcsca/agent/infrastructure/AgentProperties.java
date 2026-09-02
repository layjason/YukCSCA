package com.yukcsca.agent.infrastructure;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("yukcsca.agent")
public record AgentProperties(
    boolean enabled,
    String apiKey,
    String baseUrl,
    String chatModel,
    String embeddingModel,
    int dailyTurnCap,
    Duration turnTimeout,
    String promptVersion) {
  public AgentProperties {
    if (baseUrl == null || baseUrl.isBlank()) {
      baseUrl = "https://api.x.ai";
    }
    if (chatModel == null || chatModel.isBlank()) {
      chatModel = "grok-4";
    }
    if (embeddingModel == null || embeddingModel.isBlank()) {
      embeddingModel = "text-embedding-3-small";
    }
    if (dailyTurnCap <= 0) {
      dailyTurnCap = 40;
    }
    if (turnTimeout == null || turnTimeout.isZero() || turnTimeout.isNegative()) {
      turnTimeout = Duration.ofSeconds(8);
    }
    if (promptVersion == null || promptVersion.isBlank()) {
      promptVersion = "vs011-v1";
    }
    if (apiKey == null) {
      apiKey = "";
    }
  }

  public boolean providerConfigured() {
    return apiKey != null && !apiKey.isBlank();
  }
}
