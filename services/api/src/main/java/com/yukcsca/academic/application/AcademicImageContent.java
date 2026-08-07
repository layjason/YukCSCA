package com.yukcsca.academic.application;

public record AcademicImageContent(String mediaType, byte[] bytes) {
  public AcademicImageContent {
    bytes = bytes.clone();
  }

  @Override
  public byte[] bytes() {
    return bytes.clone();
  }
}
