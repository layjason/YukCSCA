package com.yukcsca.agent.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class AgentPropertiesTest {
  @Test
  void singleProviderUsesChatKeyForEmbeddings() {
    AgentProperties properties = properties("chat-key", "https://api.x.ai", "", "");
    assertThat(properties.chatProviderConfigured()).isTrue();
    assertThat(properties.embeddingProviderConfigured()).isTrue();
    assertThat(properties.embeddingKey()).isEqualTo("chat-key");
    assertThat(properties.embeddingEndpoint()).isEqualTo("https://api.x.ai");
  }

  @Test
  void separateEmbeddingUrlWithoutKeyDoesNotCallChatHost() {
    AgentProperties properties =
        properties(
            "amd-key",
            "https://developer.amd.com.cn/radeon/api/v1",
            "",
            "https://api.voyageai.com/v1");
    assertThat(properties.chatProviderConfigured()).isTrue();
    assertThat(properties.embeddingProviderConfigured()).isFalse();
  }

  @Test
  void separateEmbeddingKeyUsesVoyageEndpoint() {
    AgentProperties properties =
        properties(
            "amd-key",
            "https://developer.amd.com.cn/radeon/api/v1",
            "voyage-key",
            "https://api.voyageai.com/v1");
    assertThat(properties.embeddingProviderConfigured()).isTrue();
    assertThat(properties.embeddingKey()).isEqualTo("voyage-key");
    assertThat(properties.embeddingEndpoint()).isEqualTo("https://api.voyageai.com/v1");
    assertThat(properties.voyageEmbeddings()).isTrue();
  }

  @Test
  void blankTimeoutDefaultsToSixtySeconds() {
    AgentProperties properties =
        new AgentProperties(
            true,
            "chat-key",
            "https://api.x.ai",
            "fake-chat",
            "fake-embed",
            "",
            "",
            40,
            null,
            "vs011-v5");
    assertThat(properties.turnTimeout()).isEqualTo(Duration.ofSeconds(60));
  }

  @Test
  void blankPromptVersionDefaultsToVs011V2() {
    AgentProperties properties =
        new AgentProperties(
            true,
            "chat-key",
            "https://api.x.ai",
            "fake-chat",
            "fake-embed",
            "",
            "",
            40,
            Duration.ofSeconds(8),
            " ");
    assertThat(properties.promptVersion()).isEqualTo("vs011-v6");
  }

  @Test
  void openaiCompatibleEmbeddingHostIsNotVoyage() {
    AgentProperties renamed =
        new AgentProperties(
            true,
            "chat-key",
            "https://api.x.ai/v1",
            "grok-4",
            "text-embedding-3-small",
            "chat-key",
            "https://api.x.ai/v1",
            40,
            Duration.ofSeconds(8),
            "vs011-v1");
    assertThat(renamed.voyageEmbeddings()).isFalse();
  }

  private static AgentProperties properties(
      String apiKey, String baseUrl, String embeddingApiKey, String embeddingBaseUrl) {
    return new AgentProperties(
        true,
        apiKey,
        baseUrl,
        "DeepSeek-V4-Flash",
        "voyage-4",
        embeddingApiKey,
        embeddingBaseUrl,
        40,
        Duration.ofSeconds(60),
        "vs011-v1");
  }
}
