package com.yukcsca.academic.api;

import com.yukcsca.academic.application.ImageProvenanceCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UploadAcademicImageProvenance(
    @NotBlank String origin,
    @Size(max = 200) String provider,
    @Size(max = 2000) String sourceLocator,
    @Size(max = 1000) String permissionReference) {
  ImageProvenanceCommand toCommand() {
    return new ImageProvenanceCommand(origin, provider, sourceLocator, permissionReference);
  }

  @Override
  public String toString() {
    return "UploadAcademicImageProvenance[origin=" + origin + ", source=[REDACTED]]";
  }
}
