package com.yukcsca.profile.api;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.Size;

public final class UpdateMyStudentProfileRequest {
  @Size(max = 160) private String preferredName;

  private Integer birthYear;
  private String currentGrade;

  @Size(max = 120) private String city;

  private String defaultExplanationLanguage;

  public UpdateMyStudentProfileRequest() {}

  UpdateMyStudentProfileRequest(
      String preferredName,
      Integer birthYear,
      String currentGrade,
      String city,
      String defaultExplanationLanguage) {
    this.preferredName = preferredName;
    this.birthYear = birthYear;
    this.currentGrade = currentGrade;
    this.city = city;
    this.defaultExplanationLanguage = defaultExplanationLanguage;
  }

  public String preferredName() {
    return preferredName;
  }

  @JsonSetter(nulls = Nulls.FAIL)
  public void setPreferredName(String preferredName) {
    this.preferredName = preferredName;
  }

  public Integer birthYear() {
    return birthYear;
  }

  @JsonSetter(nulls = Nulls.FAIL)
  public void setBirthYear(Integer birthYear) {
    this.birthYear = birthYear;
  }

  public String currentGrade() {
    return currentGrade;
  }

  @JsonSetter(nulls = Nulls.FAIL)
  public void setCurrentGrade(String currentGrade) {
    this.currentGrade = currentGrade;
  }

  public String city() {
    return city;
  }

  @JsonSetter(nulls = Nulls.FAIL)
  public void setCity(String city) {
    this.city = city;
  }

  public String defaultExplanationLanguage() {
    return defaultExplanationLanguage;
  }

  @JsonSetter(nulls = Nulls.FAIL)
  public void setDefaultExplanationLanguage(String defaultExplanationLanguage) {
    this.defaultExplanationLanguage = defaultExplanationLanguage;
  }

  @Override
  public String toString() {
    return "UpdateMyStudentProfileRequest[profileFields=<redacted>]";
  }
}
