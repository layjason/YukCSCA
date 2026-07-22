package com.yukcsca.profile.application;

public enum ProfileField {
  PREFERRED_NAME("preferredName"),
  BIRTH_YEAR("birthYear"),
  CURRENT_GRADE("currentGrade"),
  CITY("city"),
  DEFAULT_EXPLANATION_LANGUAGE("defaultExplanationLanguage");

  private final String wireName;

  ProfileField(String wireName) {
    this.wireName = wireName;
  }

  public String wireName() {
    return wireName;
  }

  public static ProfileField fromWireName(String wireName) {
    for (ProfileField field : values()) {
      if (field.wireName.equals(wireName)) return field;
    }
    throw new IllegalArgumentException("Unknown profile field.");
  }
}
