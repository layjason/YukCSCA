package com.yukcsca.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "user_account")
public class UserAccount {
  @Id private UUID id;

  @Column(nullable = false, unique = true, length = 320)
  private String email;

  @Column(name = "display_name", length = 160)
  private String displayName;

  @Column(name = "avatar_url")
  private String avatarUrl;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private UserRole role;

  @Column(name = "onboarding_completed", nullable = false)
  private boolean onboardingCompleted;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected UserAccount() {}

  private UserAccount(UUID id, String email, String displayName, String avatarUrl, Instant now) {
    this.id = id;
    this.email = email;
    this.displayName = displayName;
    this.avatarUrl = avatarUrl;
    this.role = UserRole.UNASSIGNED;
    this.onboardingCompleted = false;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public static UserAccount createGoogleUser(
      String email, String displayName, String avatarUrl, Instant now) {
    return new UserAccount(
        UUID.randomUUID(),
        email.trim().toLowerCase(Locale.ROOT),
        displayName.trim(),
        avatarUrl,
        now);
  }

  public static UserAccount createCredentialUser(String email, Instant now) {
    return new UserAccount(
        UUID.randomUUID(), email.trim().toLowerCase(Locale.ROOT), null, null, now);
  }

  public UUID getId() {
    return id;
  }

  public String getEmail() {
    return email;
  }

  public String getDisplayName() {
    return displayName;
  }

  public String getAvatarUrl() {
    return avatarUrl;
  }

  public UserRole getRole() {
    return role;
  }

  public boolean isOnboardingCompleted() {
    return onboardingCompleted;
  }

  /** Completes the one-way student activation transition for an unassigned account. */
  public void activateStudent(Instant now) {
    if (role != UserRole.UNASSIGNED) {
      throw new IllegalStateException("Only an unassigned account can activate as a student.");
    }
    role = UserRole.STUDENT;
    onboardingCompleted = true;
    updatedAt = now;
  }

  /** Assigns the deployment-configured pilot administrator without changing profile state. */
  public void activateAdmin(Instant now) {
    if (role != UserRole.UNASSIGNED) {
      throw new IllegalStateException("Only an unassigned account can activate as an admin.");
    }
    role = UserRole.ADMIN;
    updatedAt = now;
  }
}
