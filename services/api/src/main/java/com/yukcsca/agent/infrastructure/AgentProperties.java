package com.yukcsca.agent.infrastructure;

import java.time.Duration;
import java.util.Locale;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("yukcsca.agent")
public record AgentProperties(
    boolean enabled,
    String apiKey,
    String baseUrl,
    String chatModel,
    String embeddingModel,
    String embeddingApiKey,
    String embeddingBaseUrl,
    int dailyTurnCap,
    Duration turnTimeout,
    String promptVersion) {
  /** Voyage default width; matches Flyway V18 `vector(1024)`. */
  public static final int EMBEDDING_DIMENSIONS = 1024;

  public AgentProperties {
    if (baseUrl == null || baseUrl.isBlank()) {
      baseUrl = "https://developer.amd.com.cn/radeon/api/v1";
    }
    if (chatModel == null || chatModel.isBlank()) {
      chatModel = "DeepSeek-V4-Flash";
    }
    if (embeddingModel == null || embeddingModel.isBlank()) {
      embeddingModel = "voyage-4";
    }
    if (embeddingApiKey == null) {
      embeddingApiKey = "";
    }
    if (embeddingBaseUrl == null) {
      embeddingBaseUrl = "";
    }
    if (dailyTurnCap <= 0) {
      dailyTurnCap = 40;
    }
    if (turnTimeout == null || turnTimeout.isZero() || turnTimeout.isNegative()) {
      turnTimeout = Duration.ofSeconds(60);
    }
    if (promptVersion == null || promptVersion.isBlank()) {
      promptVersion = "vs011-v6";
    }
    if (apiKey == null) {
      apiKey = "";
    }
  }

  public boolean providerConfigured() {
    return chatProviderConfigured();
  }

  public boolean chatProviderConfigured() {
    return apiKey != null && !apiKey.isBlank();
  }

  /**
   * Live embeddings need their own key when the chat host has no {@code /embeddings} route (AMD
   * Radeon chat, etc.). A blank embedding key with a blank embedding URL still uses the chat key
   * against the chat base URL (single OpenAI-compatible provider).
   */
  public boolean embeddingProviderConfigured() {
    if (embeddingApiKey != null && !embeddingApiKey.isBlank()) {
      return true;
    }
    return chatProviderConfigured() && (embeddingBaseUrl == null || embeddingBaseUrl.isBlank());
  }

  public String embeddingKey() {
    if (embeddingApiKey != null && !embeddingApiKey.isBlank()) {
      return embeddingApiKey;
    }
    return apiKey;
  }

  public String embeddingEndpoint() {
    if (embeddingBaseUrl != null && !embeddingBaseUrl.isBlank()) {
      return embeddingBaseUrl;
    }
    return baseUrl;
  }

  /**
   * Voyage's embeddings route is not OpenAI-compatible: use {@code output_dimension} and {@code
   * input_type}, never OpenAI {@code dimensions}.
   */
  public boolean voyageEmbeddings() {
    String model = embeddingModel == null ? "" : embeddingModel.toLowerCase(Locale.ROOT);
    String endpoint =
        embeddingEndpoint() == null ? "" : embeddingEndpoint().toLowerCase(Locale.ROOT);
    return model.startsWith("voyage") || endpoint.contains("voyageai.com");
  }
}
