package com.yukcsca.identity.application;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class PasswordPolicy {
  private static final Set<String> BLOCKLIST =
      Set.of(
          "123456789012345",
          "passwordpassword",
          "password123456",
          "qwertyuiopasdfg",
          "letmeinletmein",
          "correcthorsebatterystaple",
          "yukcscayukcsca",
          "indonesiaindonesia");

  public String validateAndNormalize(String password) {
    String normalized = Normalizer.normalize(password, Normalizer.Form.NFC);
    int length = normalized.codePointCount(0, normalized.length());
    if (length < 15 || length > 128) {
      throw new PasswordPolicyException();
    }
    String folded = normalized.toLowerCase(Locale.ROOT).replaceAll("[\\s_-]", "");
    if (BLOCKLIST.contains(folded)) {
      throw new PasswordPolicyException();
    }
    return normalized;
  }

  public String normalizeForAuthentication(String password) {
    return Normalizer.normalize(password, Normalizer.Form.NFC);
  }
}
