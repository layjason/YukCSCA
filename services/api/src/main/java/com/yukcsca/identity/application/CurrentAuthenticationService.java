package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.UserAccount;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurrentAuthenticationService {
  private final UserAccountStore accounts;
  private final AccessTokenService accessTokens;

  public CurrentAuthenticationService(UserAccountStore accounts, AccessTokenService accessTokens) {
    this.accounts = accounts;
    this.accessTokens = accessTokens;
  }

  @Transactional(readOnly = true)
  public CurrentAccount requireAccount(UUID accountId) {
    return currentAccount(requireUser(accountId));
  }

  @Transactional(readOnly = true)
  public IssuedAuthentication issueFor(UUID accountId) {
    UserAccount user = requireUser(accountId);
    AccessTokenService.IssuedAccessToken token = accessTokens.issue(user);
    return new IssuedAuthentication(token.value(), token.expiresInSeconds(), currentAccount(user));
  }

  private UserAccount requireUser(UUID accountId) {
    return accounts
        .findById(accountId)
        .orElseThrow(() -> new InvalidCredentialException("Authenticated user no longer exists."));
  }

  private static CurrentAccount currentAccount(UserAccount user) {
    return new CurrentAccount(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        user.getAvatarUrl(),
        CurrentAccountRole.from(user.getRole()),
        user.isOnboardingCompleted());
  }

  public record IssuedAuthentication(
      String accessToken, long expiresInSeconds, CurrentAccount account) {}
}
