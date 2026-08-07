package com.yukcsca.academic.api.student;

import com.yukcsca.academic.application.PublishedPackageProjector.OfficialDateProjection;
import com.yukcsca.academic.application.PublishedPackageProjector.OfficialSourceProjection;
import com.yukcsca.academic.application.PublishedPackageProjector.SourceLinkProjection;
import java.time.Instant;
import java.util.List;

public record OfficialSourcePanelResponse(
    String subject,
    String authority,
    String editionLabel,
    List<SourceLinkResponse> sourceLinks,
    Instant lastCheckedAt,
    OfficialDateResponse publishedOn,
    OfficialDateResponse effectiveOn,
    OfficialDateResponse updatedOn,
    String permittedUse) {
  static OfficialSourcePanelResponse from(OfficialSourceProjection value) {
    return new OfficialSourcePanelResponse(
        value.subject(),
        value.authority(),
        value.editionLabel(),
        value.sourceLinks().stream().map(SourceLinkResponse::from).toList(),
        value.lastCheckedAt(),
        OfficialDateResponse.from(value.publishedOn()),
        OfficialDateResponse.from(value.effectiveOn()),
        OfficialDateResponse.from(value.updatedOn()),
        value.permittedUse());
  }

  public record SourceLinkResponse(String language, String url) {
    static SourceLinkResponse from(SourceLinkProjection value) {
      return new SourceLinkResponse(value.language(), value.url());
    }
  }

  public record OfficialDateResponse(String status, String date) {
    static OfficialDateResponse from(OfficialDateProjection value) {
      return value == null ? null : new OfficialDateResponse(value.status(), value.date());
    }
  }
}
