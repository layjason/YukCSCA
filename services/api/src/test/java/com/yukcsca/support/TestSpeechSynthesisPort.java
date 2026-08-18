package com.yukcsca.support;

import com.yukcsca.academic.application.SpeechSynthesisPort;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Never contacts Azure. Publish ITs persist this stub clip when terms are present. */
@Component
@Primary
@Profile("test")
public class TestSpeechSynthesisPort implements SpeechSynthesisPort {
  public static final byte[] STUB_MPEG = "ID3STUBMPEG".getBytes(StandardCharsets.US_ASCII);

  @Override
  public Optional<byte[]> synthesize(String text) {
    if (text == null || text.isBlank()) return Optional.empty();
    return Optional.of(STUB_MPEG);
  }
}
