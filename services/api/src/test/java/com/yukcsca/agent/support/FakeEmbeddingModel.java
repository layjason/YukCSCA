package com.yukcsca.agent.support;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Primary
@Profile("test")
public class FakeEmbeddingModel implements EmbeddingModel {
  private final AtomicInteger calls = new AtomicInteger();

  public int calls() {
    return calls.get();
  }

  @Override
  public float[] embed(Document document) {
    return vector(document == null ? "" : document.getText());
  }

  @Override
  public EmbeddingResponse call(EmbeddingRequest request) {
    calls.incrementAndGet();
    List<Embedding> embeddings = new ArrayList<>();
    int index = 0;
    for (String input : request.getInstructions()) {
      embeddings.add(new Embedding(vector(input), index++));
    }
    return new EmbeddingResponse(embeddings);
  }

  private static float[] vector(String text) {
    try {
      byte[] hash =
          MessageDigest.getInstance("SHA-256")
              .digest((text == null ? "" : text).getBytes(StandardCharsets.UTF_8));
      float[] values = new float[1536];
      for (int i = 0; i < values.length; i++) {
        values[i] = (hash[i % hash.length] & 0xff) / 255.0f;
      }
      return values;
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
