package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.SecurityEventType;
import com.yukcsca.identity.domain.UserAccount;
import com.yukcsca.identity.domain.UserRole;
import java.time.Clock;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class FirstAdminProvisioner {
  private final UserAccountStore accounts;
  private final FirstAdminSettings settings;
  private final SecurityEventService securityEvents;
  private final Clock clock;

  public FirstAdminProvisioner(
      UserAccountStore accounts,
      FirstAdminSettings settings,
      SecurityEventService securityEvents,
      Clock clock) {
    this.accounts = accounts;
    this.settings = settings;
    this.securityEvents = securityEvents;
    this.clock = clock;
  }

  /**
   * Promotes only the exact configured verified account during a successful sign-in transaction.
   * Existing non-admin roles are never overwritten.
   */
  public UserAccount recognize(UserAccount authenticatedAccount) {
    String configuredEmail = canonicalConfiguredEmail();
    if (configuredEmail == null || !configuredEmail.equals(authenticatedAccount.getEmail())) {
      return authenticatedAccount;
    }

    UserAccount account =
        accounts
            .findByIdForUpdate(authenticatedAccount.getId())
            .orElseThrow(
                () -> new InvalidCredentialException("Authenticated user no longer exists."));
    if (account.getRole() == UserRole.ADMIN) return account;
    if (account.getRole() != UserRole.UNASSIGNED) {
      throw new AuthConflictException("The configured admin account already has a non-admin role.");
    }
    if (accounts
        .findFirstByRole(UserRole.ADMIN)
        .filter(existing -> !existing.getId().equals(account.getId()))
        .isPresent()) {
      throw new AuthConflictException("A different pilot admin account is already assigned.");
    }

    account.activateAdmin(clock.instant());
    securityEvents.recordWithinTransaction(
        SecurityEventType.FIRST_ADMIN_PROVISIONED, account.getId());
    return accounts.save(account);
  }

  private String canonicalConfiguredEmail() {
    String configured = settings.firstEmail();
    if (configured == null || configured.isBlank()) return null;
    return configured.trim().toLowerCase(Locale.ROOT);
  }
}
