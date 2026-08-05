package com.yukcsca.academic.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PublishAcademicPackageRequest(@NotNull @Min(0) Long expectedDraftRevision) {}
