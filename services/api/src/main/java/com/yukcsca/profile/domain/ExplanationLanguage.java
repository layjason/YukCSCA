package com.yukcsca.profile.domain;

import java.util.Arrays;
import java.util.Optional;

public enum ExplanationLanguage {
  INDONESIAN("id"),
  ENGLISH("en"),
  SIMPLIFIED_CHINESE("zh-CN");

  private final String wireValue;

  ExplanationLanguage(String wireValue) {
    this.wireValue = wireValue;
  }

  public String wireValue() {
    return wireValue;
  }

  public static Optional<ExplanationLanguage> fromWireValue(String value) {
    return Arrays.stream(values()).filter(language -> language.wireValue.equals(value)).findFirst();
  }
}
