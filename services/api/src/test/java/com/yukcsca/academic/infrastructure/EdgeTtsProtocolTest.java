package com.yukcsca.academic.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class EdgeTtsProtocolTest {
  @Test
  void secMsGecMatchesEdgeTtsVector() {
    Instant now = Instant.parse("2026-08-19T00:00:00Z");
    assertThat(EdgeTtsProtocol.generateSecMsGec(now))
        .isEqualTo("A6C65DB4211906584A63E8705FF83C04B2EEEBD94E31596CA65A26F007DA3F99");
  }

  @Test
  void websocketUrlIncludesDrmQuery() {
    Instant now = Instant.parse("2026-08-19T00:00:00Z");
    String url = EdgeTtsProtocol.websocketUrl("abc", now);
    assertThat(url)
        .contains("TrustedClientToken=" + EdgeTtsProtocol.TRUSTED_CLIENT_TOKEN)
        .contains("ConnectionId=abc")
        .contains("Sec-MS-GEC=A6C65DB4211906584A63E8705FF83C04B2EEEBD94E31596CA65A26F007DA3F99")
        .contains("Sec-MS-GEC-Version=" + EdgeTtsProtocol.SEC_MS_GEC_VERSION);
  }

  @Test
  void ssmlEscapesSurfaceText() {
    String message =
        EdgeTtsProtocol.ssmlMessage(
            "req", Instant.parse("2026-08-19T00:00:00Z"), "若 a < b & c", "zh-CN-XiaoxiaoNeural");
    assertThat(message)
        .contains("Path:ssml")
        .contains("X-RequestId:req")
        .contains("若 a &lt; b &amp; c")
        .contains("zh-CN-XiaoxiaoNeural")
        .doesNotContain("若 a < b & c");
  }

  @Test
  void ssmlRequestIdMatchesConnectionId() {
    Instant now = Instant.parse("2026-08-19T00:00:00Z");
    String connectionId = "abc123connection";
    assertThat(EdgeTtsProtocol.websocketUrl(connectionId, now))
        .contains("ConnectionId=" + connectionId);
    assertThat(EdgeTtsProtocol.ssmlMessage(connectionId, now, "求", "zh-CN-XiaoxiaoNeural"))
        .contains("X-RequestId:" + connectionId);
  }

  @Test
  void extractAudioReadsPathAudioBody() {
    byte[] header =
        "Content-Type:audio/mpeg\r\nPath:audio\r\n\r\n".getBytes(StandardCharsets.UTF_8);
    byte[] body = new byte[] {1, 2, 3, 4};
    byte[] message = new byte[2 + header.length + body.length];
    message[0] = (byte) (header.length >> 8);
    message[1] = (byte) header.length;
    System.arraycopy(header, 0, message, 2, header.length);
    System.arraycopy(body, 0, message, 2 + header.length, body.length);
    assertThat(EdgeTtsProtocol.extractAudio(message)).contains(body);
  }

  @Test
  void extractAudioIgnoresNonAudioFrames() {
    byte[] message = "Path:response\r\n\r\n{}".getBytes(StandardCharsets.UTF_8);
    assertThat(EdgeTtsProtocol.extractAudio(message)).isEmpty();
  }

  @Test
  void extractAudioUsesHeaderLengthWhenSeparatorIsAbsent() {
    byte[] header = "Content-Type:audio/mpeg\r\nPath:audio\r\n".getBytes(StandardCharsets.UTF_8);
    byte[] body = new byte[] {1, 2, 13, 10, 13, 10, 9};
    byte[] message = new byte[2 + header.length + body.length];
    message[0] = (byte) (header.length >> 8);
    message[1] = (byte) header.length;
    System.arraycopy(header, 0, message, 2, header.length);
    System.arraycopy(body, 0, message, 2 + header.length, body.length);
    assertThat(EdgeTtsProtocol.extractAudio(message)).contains(body);
  }

  @Test
  void turnEndDetectsPath() {
    assertThat(EdgeTtsProtocol.isTurnEnd("X-RequestId:1\r\nPath:turn.end\r\n\r\n")).isTrue();
    assertThat(EdgeTtsProtocol.isTurnEnd("Path:turn.start")).isFalse();
  }
}
