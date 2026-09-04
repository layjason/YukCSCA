package com.yukcsca.agent.infrastructure;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Native Voyage {@code POST /v1/embeddings} adapter. Voyage is not OpenAI-compatible for this
 * route: it rejects {@code dimensions} and expects {@code output_dimension} plus {@code
 * input_type}.
 *
 * @see <a href="https://docs.voyageai.com/reference/embeddings-api">Voyage embeddings API</a>
 */
public class VoyageEmbeddingModel implements EmbeddingModel {
  static final int MAX_BATCH = 1000;

  private final HttpClient http;
  private final URI endpoint;
  private final String apiKey;
  private final String model;
  private final Duration timeout;
  private final JsonMapper json;

  VoyageEmbeddingModel(AgentProperties properties, JsonMapper json) {
    this(
        properties.embeddingEndpoint(),
        properties.embeddingKey(),
        properties.embeddingModel(),
        properties.turnTimeout(),
        json);
  }

  VoyageEmbeddingModel(
      String baseUrl, String apiKey, String model, Duration timeout, JsonMapper json) {
    this.http = HttpClient.newBuilder().connectTimeout(connectTimeout(timeout)).build();
    this.endpoint = URI.create(trimSlash(baseUrl) + "/embeddings");
    this.apiKey = apiKey == null ? "" : apiKey;
    this.model = model;
    this.timeout = timeout == null ? Duration.ofSeconds(8) : timeout;
    this.json = json;
  }

  @Override
  public float[] embed(Document document) {
    return call(new EmbeddingRequest(List.of(document == null ? "" : document.getText()), null))
        .getResults()
        .getFirst()
        .getOutput();
  }

  @Override
  public EmbeddingResponse call(EmbeddingRequest request) {
    // Query embeddings go through embedWithInputType(..., "query"). call() is the document
    // fallback,
    // including a leftover single chunk.
    return embedWithInputType(request.getInstructions(), "document");
  }

  EmbeddingResponse embedWithInputType(List<String> inputs, String inputType) {
    if (inputs == null || inputs.isEmpty()) {
      return new EmbeddingResponse(List.of());
    }
    String type = inputType == null || inputType.isBlank() ? "document" : inputType;
    List<Embedding> results = new ArrayList<>();
    int index = 0;
    for (int start = 0; start < inputs.size(); start += MAX_BATCH) {
      List<String> batch = inputs.subList(start, Math.min(start + MAX_BATCH, inputs.size()));
      for (float[] vector : embedBatch(batch, type)) {
        results.add(new Embedding(vector, index++));
      }
    }
    return new EmbeddingResponse(results);
  }

  private List<float[]> embedBatch(List<String> batch, String inputType) {
    String body = writeRequest(batch, inputType);
    try {
      HttpResponse<String> response =
          http.send(
              HttpRequest.newBuilder()
                  .uri(endpoint)
                  .timeout(requestTimeout(inputType))
                  .header("Authorization", "Bearer " + apiKey)
                  .header("Content-Type", "application/json")
                  .header("Accept", "application/json")
                  .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                  .build(),
              HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new IllegalStateException(
            "voyage embeddings HTTP " + response.statusCode() + detail(response.body()));
      }
      return readVectors(response.body(), batch.size());
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("voyage embeddings interrupted", exception);
    } catch (IllegalStateException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new IllegalStateException("voyage embeddings failed", exception);
    }
  }

  String writeRequest(List<String> batch, String inputType) {
    ObjectNode node = json.createObjectNode();
    if (batch.size() == 1) {
      node.put("input", batch.getFirst());
    } else {
      ArrayNode array = node.putArray("input");
      for (String text : batch) {
        array.add(text == null ? "" : text);
      }
    }
    node.put("model", model);
    node.put("input_type", inputType);
    node.put("output_dimension", AgentProperties.EMBEDDING_DIMENSIONS);
    return json.writeValueAsString(node);
  }

  private List<float[]> readVectors(String body, int expected) {
    JsonNode data = json.readTree(body).path("data");
    if (!data.isArray() || data.size() != expected) {
      throw new IllegalStateException("voyage embeddings size mismatch");
    }
    List<float[]> vectors = new ArrayList<>(expected);
    for (JsonNode item : data) {
      JsonNode embedding = item.path("embedding");
      if (!embedding.isArray() || embedding.isEmpty()) {
        throw new IllegalStateException("voyage embeddings missing vector");
      }
      float[] values = new float[embedding.size()];
      for (int i = 0; i < embedding.size(); i++) {
        values[i] = (float) embedding.get(i).asDouble();
      }
      vectors.add(values);
    }
    return vectors;
  }

  private static String detail(String body) {
    if (body == null || body.isBlank()) {
      return "";
    }
    try {
      JsonNode node = JsonMapper.builder().build().readTree(body);
      String text = node.path("detail").asText("");
      if (text.isBlank() && node.path("error").path("message").isTextual()) {
        text = node.path("error").path("message").asText("");
      }
      if (text.isBlank()) {
        return "";
      }
      return " " + (text.length() > 120 ? text.substring(0, 120) : text);
    } catch (RuntimeException exception) {
      return "";
    }
  }

  private Duration requestTimeout(String inputType) {
    if ("query".equals(inputType)) {
      Duration cap = Duration.ofMillis(1500);
      return timeout.compareTo(cap) < 0 ? timeout : cap;
    }
    return timeout;
  }

  private static Duration connectTimeout(Duration timeout) {
    if (timeout == null || timeout.compareTo(Duration.ofSeconds(10)) > 0) {
      return Duration.ofSeconds(10);
    }
    return timeout;
  }

  private static String trimSlash(String baseUrl) {
    if (baseUrl == null || baseUrl.isBlank()) {
      return "https://api.voyageai.com/v1";
    }
    return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
  }
}
