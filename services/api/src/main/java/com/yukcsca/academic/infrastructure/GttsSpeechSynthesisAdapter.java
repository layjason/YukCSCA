package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.SpeechSynthesisPort;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Publish-time gTTS adapter ({@code ADR-0003}). Mirrors the pinned gTTS package's wire behavior: a
 * form-encoded {@code batchexecute} RPC POST to Google Translate carrying the text and {@code
 * zh-CN} (the current package speaks no token parameter), with the base64 audio extracted from the
 * RPC response lines. Term clips are short (≤ 40 characters), so a single request suffices; longer
 * input is declined rather than split. The student audio GET never calls this adapter.
 */
@Component
@Profile("!test")
public class GttsSpeechSynthesisAdapter implements SpeechSynthesisPort {
  private static final Logger LOGGER = LoggerFactory.getLogger(GttsSpeechSynthesisAdapter.class);
  private static final int MAX_TEXT_CHARS = 100;
  private static final int MAX_CLIP_BYTES = 524_288;
  private static final String BATCH_EXECUTE_URL =
      "https://translate.google.com/_/TranslateWebserverUi/data/batchexecute";
  private static final String RPC_ID = "jQ1olc";
  private static final String USER_AGENT =
      "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko)"
          + " Chrome/47.0.2526.106 Safari/537.36";

  private final SpeechSynthesisProperties properties;
  private final HttpClient http;
  private final String endpoint;

  @Autowired
  public GttsSpeechSynthesisAdapter(SpeechSynthesisProperties properties) {
    this(properties, BATCH_EXECUTE_URL);
  }

  /** Test seam: stubbed servers replace the vendor endpoint; production always uses the default. */
  GttsSpeechSynthesisAdapter(SpeechSynthesisProperties properties, String endpoint) {
    this.properties = properties;
    this.endpoint = endpoint;
    Duration timeout = properties.timeout() == null ? Duration.ofSeconds(8) : properties.timeout();
    this.http = HttpClient.newBuilder().connectTimeout(timeout).build();
  }

  @Override
  public Optional<byte[]> synthesize(String text) {
    if (!properties.usable() || text == null || text.isBlank()) {
      return Optional.empty();
    }
    String trimmed = text.trim();
    if (trimmed.length() > MAX_TEXT_CHARS) {
      LOGGER.warn("speech.synthesis.failed status=text_too_long length={}", trimmed.length());
      return Optional.empty();
    }
    Duration timeout = properties.timeout() == null ? Duration.ofSeconds(8) : properties.timeout();
    try {
      HttpResponse<String> response =
          http.send(
              HttpRequest.newBuilder()
                  .uri(URI.create(endpoint))
                  .timeout(timeout)
                  .header("Referer", "http://translate.google.com/")
                  .header("User-Agent", USER_AGENT)
                  .header("Content-Type", "application/x-www-form-urlencoded;charset=utf-8")
                  .POST(
                      HttpRequest.BodyPublishers.ofString(rpcBody(trimmed), StandardCharsets.UTF_8))
                  .build(),
              HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() != 200) {
        LOGGER.warn("speech.synthesis.failed status=http_{}", response.statusCode());
        return Optional.empty();
      }
      byte[] audio = extractAudio(response.body());
      if (audio.length == 0 || audio.length > MAX_CLIP_BYTES) {
        LOGGER.warn(
            "speech.synthesis.failed status=empty_or_oversized byteLength={}", audio.length);
        return Optional.empty();
      }
      return Optional.of(audio);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      LOGGER.warn("speech.synthesis.failed status=interrupted");
      return Optional.empty();
    } catch (Exception exception) {
      LOGGER.warn("speech.synthesis.failed status={}", exception.getClass().getSimpleName());
      return Optional.empty();
    }
  }

  /**
   * Builds the {@code f.req} form field exactly as the pinned gTTS package does: {@code
   * [[["jQ1olc","[\"text\",\"zh-CN\",null,\"null\"]",null,"generic"]]]}, percent-encoded. The port
   * speaks zh-CN only — it exists for reviewed Chinese term pronunciation (ADR-0003).
   */
  private static String rpcBody(String text) {
    String parameter = "[\"" + jsonEscape(text) + "\",\"zh-CN\",null,\"null\"]";
    String rpc = "[[[\"" + RPC_ID + "\",\"" + jsonEscape(parameter) + "\",null,\"generic\"]]]";
    return "f.req=" + java.net.URLEncoder.encode(rpc, StandardCharsets.UTF_8) + "&";
  }

  private static String jsonEscape(String value) {
    StringBuilder escaped = new StringBuilder();
    for (int index = 0; index < value.length(); index++) {
      char current = value.charAt(index);
      switch (current) {
        case '"' -> escaped.append("\\\"");
        case '\\' -> escaped.append("\\\\");
        case '\n' -> escaped.append("\\n");
        case '\r' -> escaped.append("\\r");
        case '\t' -> escaped.append("\\t");
        default -> {
          if (current < 0x20) {
            escaped.append(String.format("\\u%04x", (int) current));
          } else {
            escaped.append(current);
          }
        }
      }
    }
    return escaped.toString();
  }

  /**
   * Extracts the base64 audio payload from the batchexecute response: the line containing the RPC
   * id carries {@code jQ1olc","[\"BASE64\"]"}, matching the pinned package's parsing.
   */
  private static byte[] extractAudio(String body) {
    for (String line : body.split("\n")) {
      String marker = RPC_ID + "\",\"[\\\"";
      int markerIndex = line.indexOf(marker);
      if (markerIndex < 0) continue;
      int start = markerIndex + marker.length();
      int end = line.indexOf("\\\"]", start);
      if (end < 0 || end == start) continue;
      try {
        return Base64.getDecoder().decode(line.substring(start, end));
      } catch (IllegalArgumentException exception) {
        return new byte[0];
      }
    }
    return new byte[0];
  }
}
