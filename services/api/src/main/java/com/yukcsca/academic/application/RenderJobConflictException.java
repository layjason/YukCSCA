package com.yukcsca.academic.application;

/** One active render or validation job already exists; the 409 body embeds it (CR-08/CR-10). */
public class RenderJobConflictException extends RuntimeException {
  private final AcademicVideoService.RenderJobSnapshot activeJob;

  public RenderJobConflictException(AcademicVideoService.RenderJobSnapshot activeJob) {
    super("An asynchronous job is already active for this work.");
    this.activeJob = activeJob;
  }

  public AcademicVideoService.RenderJobSnapshot activeJob() {
    return activeJob;
  }
}
