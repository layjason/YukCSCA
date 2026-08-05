package com.yukcsca.academic.api;

import jakarta.validation.constraints.NotBlank;

public record CreateAcademicPackageRequest(@NotBlank String subject) {}
