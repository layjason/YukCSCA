package com.yukcsca.academic.domain;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "academic_term_pronunciation")
public class AcademicTermPronunciation {
  @Id private UUID id;

  @Column(name = "package_revision_id", nullable = false)
  private UUID packageRevisionId;

  @Column(name = "term_id", nullable = false)
  private UUID termId;

  @Column(name = "surface_form", nullable = false, length = 40)
  private String surfaceForm;

  @Column(name = "media_type", nullable = false, length = 32)
  private String mediaType;

  @Basic(fetch = FetchType.LAZY)
  @Column(nullable = false, columnDefinition = "bytea")
  private byte[] content;

  @Column(name = "byte_size", nullable = false)
  private long byteSize;

  @Column(nullable = false, length = 64)
  private String sha256;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected AcademicTermPronunciation() {}

  public AcademicTermPronunciation(
      UUID packageRevisionId,
      UUID termId,
      String surfaceForm,
      byte[] content,
      String sha256,
      Instant createdAt) {
    this.id = UUID.randomUUID();
    this.packageRevisionId = packageRevisionId;
    this.termId = termId;
    this.surfaceForm = surfaceForm;
    this.mediaType = "audio/mpeg";
    this.content = content.clone();
    this.byteSize = content.length;
    this.sha256 = sha256;
    this.createdAt = createdAt;
  }

  public UUID getId() {
    return id;
  }

  public UUID getPackageRevisionId() {
    return packageRevisionId;
  }

  public UUID getTermId() {
    return termId;
  }

  public String getSurfaceForm() {
    return surfaceForm;
  }

  public String getMediaType() {
    return mediaType;
  }

  public byte[] getContent() {
    return content.clone();
  }

  public long getByteSize() {
    return byteSize;
  }

  public String getSha256() {
    return sha256;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
