package com.yukcsca.agent.support;

import com.yukcsca.agent.infrastructure.AgentProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
@Primary
@Profile("test")
public class FakeEmbeddingModel implements EmbeddingModel {
  private final AtomicInteger calls = new AtomicInteger();
  private final AtomicBoolean calledInsideTransaction = new AtomicBoolean();

  public int calls() {
    return calls.get();
  }

  public boolean calledInsideTransaction() {
    return calledInsideTransaction.get();
  }

  public void reset() {
    calls.set(0);
    calledInsideTransaction.set(false);
  }

  @Override
  public float[] embed(Document document) {
    return vector(document == null ? "" : document.getText());
  }

  @Override
  public EmbeddingResponse call(EmbeddingRequest request) {
    calls.incrementAndGet();
    if (TransactionSynchronizationManager.isActualTransactionActive()) {
      calledInsideTransaction.set(true);
    }
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
      float[] values = new float[AgentProperties.EMBEDDING_DIMENSIONS];
      for (int i = 0; i < values.length; i++) {
        values[i] = (hash[i % hash.length] & 0xff) / 255.0f;
      }
      return values;
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
