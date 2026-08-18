package com.yukcsca.academic.application;

import java.util.Optional;

/**
 * Publish-time TTS only. Implementations must not throw to fail package publication. Students never
 * call this port.
 */
public interface SpeechSynthesisPort {
  Optional<byte[]> synthesize(String text);
}
