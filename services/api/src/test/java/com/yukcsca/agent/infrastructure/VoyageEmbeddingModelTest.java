package com.yukcsca.agent.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.embedding.EmbeddingRequest;
import tools.jackson.databind.json.JsonMapper;

class VoyageEmbeddingModelTest {
  private final JsonMapper json = JsonMapper.builder().build();
  private HttpServer server;

  @AfterEach
  void stop() {
    if (server != null) {
      server.stop(0);
    }
  }

  @Test
  void requestUsesVoyageFieldsNotOpenAiDimensions() {
    VoyageEmbeddingModel model =
        new VoyageEmbeddingModel(
            "https://example.test/v1", "key", "voyage-4", Duration.ofSeconds(2), json);

    String documents = model.writeRequest(List.of("chunk-a", "chunk-b"), "document");
    assertThat(documents).contains("\"output_dimension\":1024");
    assertThat(documents).contains("\"input_type\":\"document\"");
    assertThat(documents).contains("\"model\":\"voyage-4\"");
    assertThat(documents).doesNotContain("\"dimensions\"");
    assertThat(documents).doesNotContain("encoding_format");

    String query = model.writeRequest(List.of("what is a set"), "query");
    assertThat(query).contains("\"input_type\":\"query\"");
    assertThat(query).contains("\"input\":\"what is a set\"");

    String leftoverDocument = model.writeRequest(List.of("one remaining chunk"), "document");
    assertThat(leftoverDocument).contains("\"input_type\":\"document\"");
  }

  @Test
  void postsBatchToNativeEmbeddingsRoute() throws Exception {
    AtomicReference<String> method = new AtomicReference<>();
    AtomicReference<String> path = new AtomicReference<>();
    AtomicReference<String> body = new AtomicReference<>();
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/v1/embeddings",
        exchange -> {
          method.set(exchange.getRequestMethod());
          path.set(exchange.getRequestURI().getPath());
          body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
          byte[] response =
              """
              {"object":"list","data":[
                {"object":"embedding","embedding":[0.1,0.2],"index":0},
                {"object":"embedding","embedding":[0.3,0.4],"index":1}
              ],"model":"voyage-4","usage":{"total_tokens":4}}
              """
                  .getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, response.length);
          exchange.getResponseBody().write(response);
          exchange.close();
        });
    server.start();
    String base = "http://127.0.0.1:" + server.getAddress().getPort() + "/v1";
    VoyageEmbeddingModel model =
        new VoyageEmbeddingModel(base, "voyage-key", "voyage-4", Duration.ofSeconds(2), json);

    var result = model.call(new EmbeddingRequest(List.of("alpha", "beta"), null));

    assertThat(method.get()).isEqualTo("POST");
    assertThat(path.get()).isEqualTo("/v1/embeddings");
    assertThat(body.get()).contains("\"output_dimension\":1024");
    assertThat(body.get()).contains("\"input_type\":\"document\"");
    assertThat(body.get()).doesNotContain("\"dimensions\"");
    assertThat(result.getResults()).hasSize(2);
    assertThat(result.getResults().getFirst().getOutput()).containsExactly(0.1f, 0.2f);
  }

  @Test
  void leftoverSingleChunkCallUsesDocumentInputType() throws Exception {
    AtomicReference<String> body = new AtomicReference<>();
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/v1/embeddings",
        exchange -> {
          body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
          byte[] response =
              """
              {"object":"list","data":[
                {"object":"embedding","embedding":[0.1,0.2],"index":0}
              ],"model":"voyage-4","usage":{"total_tokens":1}}
              """
                  .getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, response.length);
          exchange.getResponseBody().write(response);
          exchange.close();
        });
    server.start();
    VoyageEmbeddingModel model =
        new VoyageEmbeddingModel(
            "http://127.0.0.1:" + server.getAddress().getPort() + "/v1",
            "voyage-key",
            "voyage-4",
            Duration.ofSeconds(2),
            json);

    var result = model.call(new EmbeddingRequest(List.of("one remaining chunk"), null));

    assertThat(body.get()).contains("\"input_type\":\"document\"");
    assertThat(body.get()).doesNotContain("\"input_type\":\"query\"");
    assertThat(result.getResults()).hasSize(1);
  }

  @Test
  void http400DoesNotLookLikeSuccess() throws Exception {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/v1/embeddings",
        exchange -> {
          byte[] response =
              "{\"detail\":\"Unknown request body key: dimensions\"}"
                  .getBytes(StandardCharsets.UTF_8);
          exchange.sendResponseHeaders(400, response.length);
          exchange.getResponseBody().write(response);
          exchange.close();
        });
    server.start();
    VoyageEmbeddingModel model =
        new VoyageEmbeddingModel(
            "http://127.0.0.1:" + server.getAddress().getPort() + "/v1",
            "voyage-key",
            "voyage-4",
            Duration.ofSeconds(2),
            json);

    assertThatThrownBy(() -> model.call(new EmbeddingRequest(List.of("ping"), null)))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("HTTP 400")
        .hasMessageContaining("dimensions");
  }
}
