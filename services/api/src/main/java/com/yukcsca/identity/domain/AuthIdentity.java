package com.yukcsca.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "auth_identity")
public class AuthIdentity {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserAccount user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private AuthProvider provider;

  @Column(name = "provider_subject", nullable = false, length = 255)
  private String providerSubject;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected AuthIdentity() {}

  public AuthIdentity(
      UserAccount user, AuthProvider provider, String providerSubject, Instant createdAt) {
    this.id = UUID.randomUUID();
    this.user = user;
    this.provider = provider;
    this.providerSubject = providerSubject;
    this.createdAt = createdAt;
  }

  public UserAccount getUser() {
    return user;
  }
}
