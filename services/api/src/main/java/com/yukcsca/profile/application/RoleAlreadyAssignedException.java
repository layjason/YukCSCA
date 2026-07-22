package com.yukcsca.profile.application;

public class RoleAlreadyAssignedException extends RuntimeException {
  public RoleAlreadyAssignedException() {
    super("This account already has a different product role.");
  }
}
