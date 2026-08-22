package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.SpeechSynthesisPort;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Publish-time Edge read-aloud TTS ({@code edge_tts} protocol). The student audio GET never calls
 * this adapter.
 */
@Component
@Profile("!test")
public class EdgeSpeechSynthesisAdapter implements SpeechSynthesisPort {
  private static final Logger LOGGER = LoggerFactory.getLogger(EdgeSpeechSynthesisAdapter.class);
  private static final int MAX_CLIP_BYTES = 524_288;

  private final SpeechSynthesisProperties properties;
  private final HttpClient http;

  public EdgeSpeechSynthesisAdapter(SpeechSynthesisProperties properties) {
    this.properties = properties;
    Duration timeout = properties.timeout() == null ? Duration.ofSeconds(8) : properties.timeout();
    this.http = HttpClient.newBuilder().connectTimeout(timeout).build();
  }

  @Override
  public Optional<byte[]> synthesize(String text) {
    if (!properties.usable() || text == null || text.isBlank()) {
      return Optional.empty();
    }
    Duration timeout = properties.timeout() == null ? Duration.ofSeconds(8) : properties.timeout();
    Instant now = Instant.now();
    String connectionId = EdgeTtsProtocol.connectionId();
    CompletableFuture<byte[]> done = new CompletableFuture<>();
    ByteArrayOutputStream audio = new ByteArrayOutputStream();
    StringBuilder textBuf = new StringBuilder();
    ByteArrayOutputStream binaryBuf = new ByteArrayOutputStream();
    WebSocket.Listener listener =
        new WebSocket.Listener() {
          @Override
          public void onOpen(WebSocket webSocket) {
            webSocket.sendText(EdgeTtsProtocol.speechConfigMessage(now), true);
            webSocket.sendText(
                EdgeTtsProtocol.ssmlMessage(connectionId, now, text, properties.voice()), true);
            webSocket.request(1);
          }

          @Override
          public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            textBuf.append(data);
            if (last) {
              String message = textBuf.toString();
              textBuf.setLength(0);
              if (EdgeTtsProtocol.isTurnEnd(message) && !done.isDone()) {
                done.complete(audio.toByteArray());
              }
            }
            webSocket.request(1);
            return null;
          }

          @Override
          public CompletionStage<?> onBinary(WebSocket webSocket, ByteBuffer data, boolean last) {
            byte[] chunk = new byte[data.remaining()];
            data.get(chunk);
            binaryBuf.writeBytes(chunk);
            if (last) {
              EdgeTtsProtocol.extractAudio(binaryBuf.toByteArray()).ifPresent(audio::writeBytes);
              binaryBuf.reset();
            }
            webSocket.request(1);
            return null;
          }

          @Override
          public void onError(WebSocket webSocket, Throwable error) {
            done.completeExceptionally(error);
          }

          @Override
          public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
            if (!done.isDone()) {
              byte[] body = audio.toByteArray();
              if (body.length == 0) {
                done.completeExceptionally(new IllegalStateException("empty"));
              } else {
                done.complete(body);
              }
            }
            return null;
          }
        };
    try {
      WebSocket socket =
          http.newWebSocketBuilder()
              .header("User-Agent", EdgeTtsProtocol.USER_AGENT)
              .header("Origin", EdgeTtsProtocol.ORIGIN)
              .header("Pragma", "no-cache")
              .header("Cache-Control", "no-cache")
              .header("Cookie", "muid=" + EdgeTtsProtocol.connectionId().toUpperCase() + ";")
              .connectTimeout(timeout)
              .buildAsync(URI.create(EdgeTtsProtocol.websocketUrl(connectionId, now)), listener)
              .get(timeout.toMillis(), TimeUnit.MILLISECONDS);
      byte[] body = done.orTimeout(timeout.toMillis(), TimeUnit.MILLISECONDS).join();
      try {
        socket.sendClose(WebSocket.NORMAL_CLOSURE, "done");
      } catch (RuntimeException ignored) {
        // Clip already received; closing is best-effort.
      }
      if (body == null || body.length == 0 || body.length > MAX_CLIP_BYTES) {
        return Optional.empty();
      }
      return Optional.of(body);
    } catch (Exception exception) {
      LOGGER.warn("speech.synthesis.failed status={}", exception.getClass().getSimpleName());
      return Optional.empty();
    }
  }
}
