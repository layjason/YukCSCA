package com.yukcsca.agent.infrastructure;

import com.openai.client.OpenAIClient;
import com.openai.client.OpenAIClientImpl;
import com.openai.core.ClientOptions;
import com.yukcsca.agent.application.AgentChatPort;
import com.yukcsca.agent.application.AgentContentSearchPort;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.OpenAiEmbeddingModel;
import org.springframework.ai.openai.OpenAiEmbeddingOptions;
import org.springframework.ai.openai.http.okhttp.SpringAiOpenAiHttpClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class AgentChatConfiguration {
  @Bean
  AgentChatPort agentChatPort(
      ObjectProvider<ChatModel> chatModels,
      AgentContentSearchPort search,
      AgentProperties properties,
      JsonMapper json) {
    ChatModel model = chatModels.getIfAvailable();
    if (model == null && properties.providerConfigured()) {
      model = openAiChatModel(properties);
    }
    if (model == null) {
      return new DisabledAgentChatPort();
    }
    return new SpringAiAgentChatAdapter(model, search, properties, json);
  }

  @Bean
  @ConditionalOnMissingBean(EmbeddingModel.class)
  EmbeddingModel agentEmbeddingModel(AgentProperties properties) {
    if (properties.providerConfigured()) {
      return openAiEmbeddingModel(properties);
    }
    return new HashEmbeddingModel();
  }

  private static ChatModel openAiChatModel(AgentProperties properties) {
    return OpenAiChatModel.builder()
        .openAiClient(openAiClient(properties))
        .options(
            OpenAiChatOptions.builder()
                .model(properties.chatModel())
                .timeout(properties.turnTimeout())
                .build())
        .build();
  }

  private static EmbeddingModel openAiEmbeddingModel(AgentProperties properties) {
    return OpenAiEmbeddingModel.builder()
        .openAiClient(openAiClient(properties))
        .options(OpenAiEmbeddingOptions.builder().model(properties.embeddingModel()).build())
        .build();
  }

  private static OpenAIClient openAiClient(AgentProperties properties) {
    return new OpenAIClientImpl(
        ClientOptions.builder()
            .apiKey(properties.apiKey())
            .baseUrl(properties.baseUrl())
            .timeout(properties.turnTimeout())
            .httpClient(
                SpringAiOpenAiHttpClient.builder().timeout(properties.turnTimeout()).build())
            .build());
  }
}
