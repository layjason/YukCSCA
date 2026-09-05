package com.yukcsca.agent.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.yukcsca.agent.application.AgentChatPort;
import com.yukcsca.agent.application.AgentContentSearchPort;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.ObjectProvider;
import tools.jackson.databind.json.JsonMapper;

class AgentChatConfigurationTest {
  private final AgentChatConfiguration configuration = new AgentChatConfiguration();
  private final AgentContentSearchPort search = mock(AgentContentSearchPort.class);
  private final JsonMapper json = JsonMapper.builder().build();

  @Test
  void missingChatKeyUsesDisabledPort() {
    AgentChatPort port =
        configuration.agentChatPort(
            noChatModel(), search, properties("", "", "https://api.voyageai.com/v1"));

    assertThat(port).isInstanceOf(DisabledAgentChatPort.class);
    assertThat(port.available()).isFalse();
  }

  @Test
  void liveChatModelDoesNotRequireSpringAiDefaultApiKey() {
    AgentChatPort port =
        configuration.agentChatPort(
            noChatModel(),
            search,
            properties("test-amd-key", "voyage-key", "https://api.voyageai.com/v1"));

    assertThat(port).isInstanceOf(SpringAiAgentChatAdapter.class);
    assertThat(port.available()).isTrue();
  }

  @Test
  void chatOptionsDisableDeepSeekThinkingAndCapOutput() {
    var options =
        AgentChatConfiguration.chatOptions(
            properties("test-amd-key", "voyage-key", "https://api.voyageai.com/v1"));

    assertThat(options.getMaxTokens()).isEqualTo(2048);
    assertThat(options.getResponseFormat()).isNotNull();
    assertThat(options.getResponseFormat().getType())
        .isEqualTo(org.springframework.ai.openai.OpenAiChatModel.ResponseFormat.Type.JSON_OBJECT);
    assertThat(options.getExtraBody()).isNotNull();
    assertThat(options.getExtraBody().get("thinking"))
        .isEqualTo(java.util.Map.of("type", "disabled"));
  }

  @Test
  void liveEmbeddingsUseConfiguredKeyWithoutSpringAiDefault() {
    assertThat(
            configuration.agentEmbeddingModel(
                properties("amd-key", "voyage-key", "https://api.voyageai.com/v1"), json))
        .isInstanceOf(VoyageEmbeddingModel.class);
    assertThat(
            configuration.agentEmbeddingModel(
                properties("amd-key", "", "https://api.voyageai.com/v1"), json))
        .isInstanceOf(HashEmbeddingModel.class);
  }

  @SuppressWarnings("unchecked")
  private static ObjectProvider<ChatModel> noChatModel() {
    ObjectProvider<ChatModel> chatModels = mock(ObjectProvider.class);
    when(chatModels.getIfAvailable()).thenReturn(null);
    return chatModels;
  }

  private static AgentProperties properties(
      String apiKey, String embeddingApiKey, String embeddingBaseUrl) {
    return new AgentProperties(
        true,
        apiKey,
        "https://developer.amd.com.cn/radeon/api/v1",
        "DeepSeek-V4-Flash",
        "voyage-4",
        embeddingApiKey,
        embeddingBaseUrl,
        40,
        Duration.ofSeconds(60),
        "vs011-v1");
  }
}
