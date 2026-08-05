package com.yukcsca.academic.api;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class SensitiveAcademicDtoLoggingTest {
  private final JsonMapper json = JsonMapper.builder().build();

  @Test
  void draftAndSourceDetailsAreRedactedFromRecordStrings() {
    var draft = json.createObjectNode().put("correctOptionKey", "SECRET_ANSWER");
    assertThat(new SaveAcademicPackageDraftRequest(2L, draft).toString())
        .doesNotContain("SECRET_ANSWER")
        .contains("[REDACTED]");
    assertThat(
            new UploadAcademicImageProvenance(
                    "LICENSED", "provider", "private-locator", "permission")
                .toString())
        .doesNotContain("private-locator", "permission")
        .contains("[REDACTED]");
  }
}
