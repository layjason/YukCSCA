package com.yukcsca.agent.infrastructure;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;

/**
 * Deterministic in-process embeddings used when no live EmbeddingModel is configured. CI never
 * contacts a billable provider.
 */
public class HashEmbeddingModel implements EmbeddingModel {
  private static final int DIM = 1536;

  @Override
  public float[] embed(Document document) {
    return vector(document == null ? "" : document.getText());
  }

  @Override
  public EmbeddingResponse call(EmbeddingRequest request) {
    List<Embedding> embeddings = new ArrayList<>();
    int index = 0;
    for (String input : request.getInstructions()) {
      embeddings.add(new Embedding(vector(input), index++));
    }
    return new EmbeddingResponse(embeddings);
  }

  private static float[] vector(String text) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest((text == null ? "" : text).getBytes(StandardCharsets.UTF_8));
      float[] values = new float[DIM];
      for (int i = 0; i < DIM; i++) {
        values[i] = (hash[i % hash.length] & 0xff) / 255.0f;
      }
      return values;
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
