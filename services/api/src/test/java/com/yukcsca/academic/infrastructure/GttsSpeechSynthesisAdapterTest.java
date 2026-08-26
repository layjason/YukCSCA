package com.yukcsca.academic.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** gTTS adapter tests with the vendor stubbed (CI never contacts Google). */
class GttsSpeechSynthesisAdapterTest {
  private HttpServer server;
  private String lastBody;
  private SpeechSynthesisProperties properties;

  @BeforeEach
  void setUp() throws Exception {
    properties = new SpeechSynthesisProperties(true, java.time.Duration.ofSeconds(5), 10);
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/_/TranslateWebserverUi/data/batchexecute",
        exchange -> {
          lastBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
          byte[] audio = new byte[] {0x49, 0x44, 0x33, 0x04, 0x00};
          String line =
              ")]}'\n\n12[[\"jQ1olc\",\"[\\\""
                  + Base64.getEncoder().encodeToString(audio)
                  + "\\\"]";
          byte[] payload = line.getBytes(StandardCharsets.US_ASCII);
          exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
          exchange.sendResponseHeaders(200, payload.length);
          try (OutputStream body = exchange.getResponseBody()) {
            body.write(payload);
          }
        });
    server.start();
  }

  @AfterEach
  void tearDown() {
    server.stop(0);
  }

  private GttsSpeechSynthesisAdapter adapter() {
    return new GttsSpeechSynthesisAdapter(
        properties,
        "http://127.0.0.1:"
            + server.getAddress().getPort()
            + "/_/TranslateWebserverUi/data/batchexecute");
  }

  @Test
  void synthesizesClipThroughBatchexecuteRpc() {
    Optional<byte[]> clip = adapter().synthesize("二次函数");

    assertThat(clip).isPresent();
    assertThat(clip.get()).containsExactly(0x49, 0x44, 0x33, 0x04, 0x00);
    // The pinned gTTS wire shape: one f.req form field carrying the jQ1olc RPC with zh-CN.
    assertThat(lastBody).startsWith("f.req=");
    assertThat(lastBody).contains("jQ1olc");
    assertThat(lastBody).contains("zh-CN");
    assertThat(lastBody).contains("%E4%BA%8C%E6%AC%A1%E5%87%BD%E6%95%B0");
  }

  @Test
  void declinesWhenDisabledOrTooLong() {
    assertThat(
            new GttsSpeechSynthesisAdapter(
                    new SpeechSynthesisProperties(false, java.time.Duration.ofSeconds(5), 10),
                    "http://127.0.0.1:1/")
                .synthesize("二次函数"))
        .isEmpty();
    assertThat(adapter().synthesize("长".repeat(101))).isEmpty();
    assertThat(lastBody).isNull();
  }

  @Test
  void emptyAudioYieldsNoClip() {
    byte[] empty = new byte[0];
    server.removeContext("/_/TranslateWebserverUi/data/batchexecute");
    server.createContext(
        "/_/TranslateWebserverUi/data/batchexecute",
        exchange -> {
          byte[] payload = ")]}'\n\n12[[\"other\"]".getBytes(StandardCharsets.US_ASCII);
          exchange.sendResponseHeaders(200, payload.length);
          try (OutputStream body = exchange.getResponseBody()) {
            body.write(payload);
          }
        });
    assertThat(adapter().synthesize("二次函数")).isEmpty();
  }
}
