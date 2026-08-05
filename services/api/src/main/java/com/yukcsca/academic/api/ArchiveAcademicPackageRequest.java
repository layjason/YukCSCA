package com.yukcsca.academic.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ArchiveAcademicPackageRequest(
    @NotNull @Min(0) Long expectedDraftRevision, @NotBlank @Size(max = 500) String reason) {}
