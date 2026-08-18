package com.yukcsca.academic.infrastructure;

import com.yukcsca.academic.application.SpeechSynthesisPort;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@Profile("!test")
public class AzureSpeechSynthesisAdapter implements SpeechSynthesisPort {
  private static final Logger LOGGER = LoggerFactory.getLogger(AzureSpeechSynthesisAdapter.class);
  private static final String VOICE = "zh-CN-XiaoxiaoNeural";

  private final SpeechSynthesisProperties properties;
  private final RestClient http;

  public AzureSpeechSynthesisAdapter(SpeechSynthesisProperties properties) {
    this.properties = properties;
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    Duration timeout = properties.timeout() == null ? Duration.ofSeconds(8) : properties.timeout();
    factory.setConnectTimeout(timeout);
    factory.setReadTimeout(timeout);
    this.http = RestClient.builder().requestFactory(factory).build();
  }

  @Override
  public Optional<byte[]> synthesize(String text) {
    if (!properties.usable() || text == null || text.isBlank()) {
      return Optional.empty();
    }
    try {
      String url = endpoint();
      String ssml =
          "<speak version='1.0' xml:lang='zh-CN'><voice name='"
              + VOICE
              + "'>"
              + escapeXml(text)
              + "</voice></speak>";
      byte[] body =
          http.post()
              .uri(url)
              .contentType(MediaType.parseMediaType("application/ssml+xml"))
              .header("Ocp-Apim-Subscription-Key", properties.key())
              .header("X-Microsoft-OutputFormat", "audio-16khz-32kbitrate-mono-mp3")
              .header("User-Agent", "yukcsca")
              .body(ssml)
              .retrieve()
              .body(byte[].class);
      if (body == null || body.length == 0 || body.length > 524288) {
        return Optional.empty();
      }
      return Optional.of(body);
    } catch (RuntimeException exception) {
      LOGGER.warn("speech.synthesis.failed status={}", exception.getClass().getSimpleName());
      return Optional.empty();
    }
  }

  private String endpoint() {
    if (properties.endpoint() != null && !properties.endpoint().isBlank()) {
      return properties.endpoint();
    }
    return "https://" + properties.region() + ".tts.speech.microsoft.com/cognitiveservices/v1";
  }

  private static String escapeXml(String value) {
    return value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&apos;");
  }
}
