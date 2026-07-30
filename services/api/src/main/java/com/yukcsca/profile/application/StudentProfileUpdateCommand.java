package com.yukcsca.profile.application;

public record StudentProfileUpdateCommand(
    String preferredName,
    Integer birthYear,
    String currentGrade,
    String city,
    String defaultExplanationLanguage) {}
