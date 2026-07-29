package com.yukcsca.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "account_policy_acceptance")
public class PolicyAcceptance {
  @Id
  @Column(name = "user_id")
  private UUID userId;

  @MapsId
  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserAccount user;

  @Column(name = "terms_version", nullable = false, length = 100)
  private String termsVersion;

  @Column(name = "privacy_notice_version", nullable = false, length = 100)
  private String privacyNoticeVersion;

  @Column(name = "accepted_at", nullable = false)
  private Instant acceptedAt;

  protected PolicyAcceptance() {}

  public PolicyAcceptance(
      UserAccount user, String termsVersion, String privacyNoticeVersion, Instant acceptedAt) {
    this.user = user;
    this.termsVersion = termsVersion;
    this.privacyNoticeVersion = privacyNoticeVersion;
    this.acceptedAt = acceptedAt;
  }
}
