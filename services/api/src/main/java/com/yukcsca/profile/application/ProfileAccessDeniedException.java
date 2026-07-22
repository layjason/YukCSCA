package com.yukcsca.profile.application;

public class ProfileAccessDeniedException extends RuntimeException {
  public ProfileAccessDeniedException() {
    super("A student profile is available only to the owning student account.");
  }
}
