package com.yukcsca.academic.infrastructure;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Microsoft Edge read-aloud TTS protocol used by {@code edge_tts}. Publish-time only; students
 * never call this.
 */
final class EdgeTtsProtocol {
  static final String VOICE = "zh-CN-XiaoxiaoNeural";
  static final String TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
  static final String CHROMIUM_FULL_VERSION = "143.0.3650.75";
  static final String SEC_MS_GEC_VERSION = "1-" + CHROMIUM_FULL_VERSION;
  private static final String CHROMIUM_MAJOR = CHROMIUM_FULL_VERSION.split("\\.", 2)[0];
  static final String USER_AGENT =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/"
          + CHROMIUM_MAJOR
          + ".0.0.0 Safari/537.36 Edg/"
          + CHROMIUM_MAJOR
          + ".0.0.0";
  static final String ORIGIN = "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold";
  private static final long WIN_EPOCH_SECONDS = 11_644_473_600L;
  private static final DateTimeFormatter TIMESTAMP =
      DateTimeFormatter.ofPattern("EEE MMM dd yyyy HH:mm:ss", Locale.US).withZone(ZoneOffset.UTC);

  private EdgeTtsProtocol() {}

  static String connectionId() {
    return UUID.randomUUID().toString().replace("-", "");
  }

  static String generateSecMsGec(Instant now) {
    double unix = now.getEpochSecond() + now.getNano() / 1_000_000_000.0;
    double ticks = unix + WIN_EPOCH_SECONDS;
    ticks -= ticks % 300.0;
    ticks *= 10_000_000.0;
    String payload = String.format(Locale.ROOT, "%.0f", ticks) + TRUSTED_CLIENT_TOKEN;
    return sha256Upper(payload.getBytes(StandardCharsets.US_ASCII));
  }

  static String websocketUrl(String connectionId, Instant now) {
    return "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1"
        + "?TrustedClientToken="
        + TRUSTED_CLIENT_TOKEN
        + "&ConnectionId="
        + connectionId
        + "&Sec-MS-GEC="
        + generateSecMsGec(now)
        + "&Sec-MS-GEC-Version="
        + SEC_MS_GEC_VERSION;
  }

  static String timestamp(Instant now) {
    return TIMESTAMP.format(now) + " GMT+0000 (Coordinated Universal Time)";
  }

  static String speechConfigMessage(Instant now) {
    return "X-Timestamp:"
        + timestamp(now)
        + "\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n"
        + "{\"context\":{\"synthesis\":{\"audio\":{\"metadataoptions\":{"
        + "\"sentenceBoundaryEnabled\":\"true\",\"wordBoundaryEnabled\":\"false\"},"
        + "\"outputFormat\":\"audio-24khz-48kbitrate-mono-mp3\"}}}}\r\n";
  }

  static String ssmlMessage(String requestId, Instant now, String text, String voice) {
    String ssml =
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
            + "<voice name='"
            + escapeXml(voice)
            + "'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>"
            + escapeXml(text)
            + "</prosody></voice></speak>";
    return "X-RequestId:"
        + requestId
        + "\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:"
        + timestamp(now)
        + "Z\r\nPath:ssml\r\n\r\n"
        + ssml;
  }

  static boolean isTurnEnd(String message) {
    return message != null && message.contains("Path:turn.end");
  }

  static Optional<byte[]> extractAudio(byte[] message) {
    if (message == null || message.length < 2) {
      return Optional.empty();
    }
    int headerLength = ((message[0] & 0xFF) << 8) | (message[1] & 0xFF);
    if (headerLength > 0 && 2 + headerLength <= message.length) {
      String headers = new String(message, 2, headerLength, StandardCharsets.UTF_8);
      if (!headers.contains("Path:audio")) {
        return Optional.empty();
      }
      return copyBody(message, 2 + headerLength);
    }
    return extractAudioBySeparator(message);
  }

  /** Fallback when the 2-byte header-length prefix is missing or invalid. */
  static Optional<byte[]> extractAudioBySeparator(byte[] message) {
    int separator = indexOf(message, new byte[] {'\r', '\n', '\r', '\n'});
    if (separator < 0) {
      return Optional.empty();
    }
    String headers = new String(message, 0, separator, StandardCharsets.UTF_8);
    if (!headers.contains("Path:audio")) {
      return Optional.empty();
    }
    return copyBody(message, separator + 4);
  }

  private static Optional<byte[]> copyBody(byte[] message, int bodyStart) {
    if (bodyStart < 0 || bodyStart >= message.length) {
      return Optional.empty();
    }
    byte[] audio = new byte[message.length - bodyStart];
    System.arraycopy(message, bodyStart, audio, 0, audio.length);
    return audio.length == 0 ? Optional.empty() : Optional.of(audio);
  }

  static String escapeXml(String value) {
    return value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&apos;");
  }

  private static int indexOf(byte[] haystack, byte[] needle) {
    outer:
    for (int i = 0; i <= haystack.length - needle.length; i++) {
      for (int j = 0; j < needle.length; j++) {
        if (haystack[i + j] != needle[j]) {
          continue outer;
        }
      }
      return i;
    }
    return -1;
  }

  private static String sha256Upper(byte[] input) {
    try {
      return HexFormat.of()
          .withUpperCase()
          .formatHex(MessageDigest.getInstance("SHA-256").digest(input));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is required.", exception);
    }
  }
}
