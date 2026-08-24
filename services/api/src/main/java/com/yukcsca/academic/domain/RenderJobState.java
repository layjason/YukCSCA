package com.yukcsca.academic.domain;

/** Render/validation job state. SUCCEEDED and FAILED are terminal. */
public enum RenderJobState {
  QUEUED,
  RUNNING,
  SUCCEEDED,
  FAILED
}
