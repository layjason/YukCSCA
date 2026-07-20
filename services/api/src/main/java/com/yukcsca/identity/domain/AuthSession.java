package com.yukcsca.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "auth_session")
public class AuthSession {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserAccount user;

  @Column(name = "token_hash", nullable = false, unique = true, length = 64)
  private String tokenHash;

  @Column(name = "family_id", nullable = false)
  private UUID familyId;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "revoked_at")
  private Instant revokedAt;

  @Column(name = "replaced_by_id")
  private UUID replacedById;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "last_used_at")
  private Instant lastUsedAt;

  protected AuthSession() {}

  public AuthSession(
      UserAccount user, String tokenHash, UUID familyId, Instant expiresAt, Instant createdAt) {
    this.id = UUID.randomUUID();
    this.user = user;
    this.tokenHash = tokenHash;
    this.familyId = familyId;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
  }

  public boolean isActiveAt(Instant now) {
    return revokedAt == null && expiresAt.isAfter(now);
  }

  public boolean isRevoked() {
    return revokedAt != null;
  }

  public void rotateAt(Instant now, UUID successorId) {
    this.revokedAt = now;
    this.lastUsedAt = now;
    this.replacedById = successorId;
  }

  public void revokeAt(Instant now) {
    if (this.revokedAt == null) this.revokedAt = now;
  }

  public UUID getId() {
    return id;
  }

  public UUID getFamilyId() {
    return familyId;
  }

  public UserAccount getUser() {
    return user;
  }
}
