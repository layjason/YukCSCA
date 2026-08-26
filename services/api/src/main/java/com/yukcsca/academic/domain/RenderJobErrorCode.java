package com.yukcsca.academic.domain;

/** Terminal failure classification surfaced to the administrator. */
public enum RenderJobErrorCode {
  VALIDATION_FAILED,
  RENDER_TIMEOUT,
  DURATION_POLICY,
  SPEECH_SYNTHESIS_FAILED,
  INTERNAL
}
