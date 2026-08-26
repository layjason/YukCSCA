package com.yukcsca.academic.application;

/** Object storage is not configured; reviewed-video operations cannot run. */
public class MediaStorageUnavailableException extends IllegalStateException {
  public MediaStorageUnavailableException(String message) {
    super(message);
  }
}
