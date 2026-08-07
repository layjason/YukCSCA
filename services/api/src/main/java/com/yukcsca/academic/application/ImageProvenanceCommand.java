package com.yukcsca.academic.application;

public record ImageProvenanceCommand(
    String origin, String provider, String sourceLocator, String permissionReference) {}
