package com.yukcsca.agent.infrastructure;

import com.openai.client.OpenAIClient;
import com.openai.client.OpenAIClientImpl;
import com.openai.core.ClientOptions;
import com.openai.core.Timeout;
import com.yukcsca.agent.application.AgentChatPort;
import com.yukcsca.agent.application.AgentContentSearchPort;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatModel.ResponseFormat;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.OpenAiEmbeddingModel;
import org.springframework.ai.openai.OpenAiEmbeddingOptions;
import org.springframework.ai.openai.http.okhttp.SpringAiOpenAiHttpClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class AgentChatConfiguration {
  @Bean
  AgentChatPort agentChatPort(
      ObjectProvider<ChatModel> chatModels,
      AgentContentSearchPort search,
      AgentProperties properties) {
    ChatModel model = chatModels.getIfAvailable();
    if (model == null && properties.chatProviderConfigured()) {
      model = openAiChatModel(properties);
    }
    if (model == null) {
      return new DisabledAgentChatPort();
    }
    return new SpringAiAgentChatAdapter(model, search, properties);
  }

  @Bean(name = "agentContentIndexExecutor", destroyMethod = "shutdown")
  @ConditionalOnMissingBean(name = "agentContentIndexExecutor")
  @Profile("!test")
  ExecutorService agentContentIndexExecutor() {
    return Executors.newSingleThreadExecutor(
        runnable -> {
          Thread thread = new Thread(runnable, "agent-content-index");
          thread.setDaemon(true);
          return thread;
        });
  }

  @Bean
  @ConditionalOnMissingBean(EmbeddingModel.class)
  EmbeddingModel agentEmbeddingModel(AgentProperties properties, JsonMapper json) {
    if (properties.embeddingProviderConfigured() && properties.voyageEmbeddings()) {
      return new VoyageEmbeddingModel(properties, json);
    }
    if (properties.embeddingProviderConfigured()) {
      return openAiEmbeddingModel(properties);
    }
    return new HashEmbeddingModel();
  }

  private static ChatModel openAiChatModel(AgentProperties properties) {
    OpenAIClient client = openAiClient(properties.apiKey(), properties.baseUrl(), properties);
    // Spring AI 2.0.1 still builds an async client from options unless one is supplied.
    // That fallback ignores the sync OpenAIClient and requires options.apiKey.
    return OpenAiChatModel.builder()
        .openAiClient(client)
        .openAiClientAsync(client.async())
        .options(chatOptions(properties))
        .build();
  }

  /**
   * DeepSeek V4 Flash thinks by default. Reasoning tokens fill {@code max_tokens} and Spring AI
   * only reads {@code content}, so Ask gets empty JSON and retries to exhaustion. Disable thinking
   * for this structured-output loop.
   */
  static OpenAiChatOptions chatOptions(AgentProperties properties) {
    return OpenAiChatOptions.builder()
        .model(properties.chatModel())
        .timeout(properties.turnTimeout())
        .apiKey(properties.apiKey())
        .baseUrl(properties.baseUrl())
        .maxTokens(2048)
        .responseFormat(ResponseFormat.builder().type(ResponseFormat.Type.JSON_OBJECT).build())
        .extraBody(Map.of("thinking", Map.of("type", "disabled")))
        .build();
  }

  private static EmbeddingModel openAiEmbeddingModel(AgentProperties properties) {
    return OpenAiEmbeddingModel.builder()
        .openAiClient(
            openAiClient(properties.embeddingKey(), properties.embeddingEndpoint(), properties))
        .options(
            OpenAiEmbeddingOptions.builder()
                .model(properties.embeddingModel())
                .dimensions(AgentProperties.EMBEDDING_DIMENSIONS)
                .apiKey(properties.embeddingKey())
                .baseUrl(properties.embeddingEndpoint())
                .timeout(properties.turnTimeout())
                .build())
        .build();
  }

  private static OpenAIClient openAiClient(
      String apiKey, String baseUrl, AgentProperties properties) {
    Timeout timeout = openAiTimeout(properties);
    return new OpenAIClientImpl(
        ClientOptions.builder()
            .apiKey(apiKey)
            .baseUrl(baseUrl)
            .timeout(timeout)
            .httpClient(SpringAiOpenAiHttpClient.builder().timeout(timeout).build())
            .build());
  }

  private static Timeout openAiTimeout(AgentProperties properties) {
    Duration total = properties.turnTimeout();
    Duration connect = total.compareTo(Duration.ofSeconds(10)) < 0 ? total : Duration.ofSeconds(10);
    return Timeout.builder().connect(connect).read(total).write(total).request(total).build();
  }
}
