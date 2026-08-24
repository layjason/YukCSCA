package com.yukcsca.academic.domain;

/** Asynchronous job kind executed by the isolated Python render worker. */
public enum RenderJobKind {
  VALIDATE_UPLOAD,
  RENDER_SCENE
}
