package com.yukcsca.profile.api;

import java.util.List;

public record ValidationProblemResponse(
    int status,
    String title,
    String detail,
    String code,
    List<FieldViolationResponse> violations) {}
