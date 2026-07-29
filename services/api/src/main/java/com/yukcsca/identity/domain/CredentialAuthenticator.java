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
@Table(name = "credential_authenticator")
public class CredentialAuthenticator {
  @Id
  @Column(name = "user_id")
  private UUID userId;

  @MapsId
  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserAccount user;

  @Column(name = "password_hash", nullable = false, length = 512)
  private String passwordHash;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected CredentialAuthenticator() {}

  public CredentialAuthenticator(UserAccount user, String passwordHash, Instant now) {
    this.user = user;
    this.passwordHash = passwordHash;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public UserAccount getUser() {
    return user;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void replacePasswordHash(String passwordHash, Instant now) {
    this.passwordHash = passwordHash;
    this.updatedAt = now;
  }
}
