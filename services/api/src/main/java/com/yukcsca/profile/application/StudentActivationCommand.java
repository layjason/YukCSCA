package com.yukcsca.profile.application;

public record StudentActivationCommand(
    String preferredName,
    int birthYear,
    String currentGrade,
    String city,
    String defaultExplanationLanguage) {}
