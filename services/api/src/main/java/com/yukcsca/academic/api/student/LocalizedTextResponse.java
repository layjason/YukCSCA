package com.yukcsca.academic.api.student;

import com.yukcsca.academic.application.PublishedPackageProjector.LocalizedTextProjection;

public record LocalizedTextResponse(String indonesian, String english, String simplifiedChinese) {
  static LocalizedTextResponse from(LocalizedTextProjection value) {
    return value == null
        ? new LocalizedTextResponse(null, null, null)
        : new LocalizedTextResponse(value.indonesian(), value.english(), value.simplifiedChinese());
  }
}
