package com.yukcsca.academic.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import tools.jackson.databind.JsonNode;

public record SaveAcademicPackageDraftRequest(
    @NotNull @Min(0) Long expectedDraftRevision, @NotNull JsonNode draft) {
  @Override
  public String toString() {
    return "SaveAcademicPackageDraftRequest[expectedDraftRevision="
        + expectedDraftRevision
        + ", draft=[REDACTED]]";
  }
}
