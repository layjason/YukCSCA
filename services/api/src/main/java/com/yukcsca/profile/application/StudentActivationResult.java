package com.yukcsca.profile.application;

import com.yukcsca.profile.domain.StudentProfile;

public record StudentActivationResult(StudentProfile profile, boolean created) {}
