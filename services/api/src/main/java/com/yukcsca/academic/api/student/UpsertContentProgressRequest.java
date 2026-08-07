package com.yukcsca.academic.api.student;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record UpsertContentProgressRequest(
    @NotBlank String status, @Min(0) Integer resumeBlockIndex, UUID expectedPackageRevisionId) {}
