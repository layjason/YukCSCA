package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.UserAccount;
import com.yukcsca.identity.domain.UserRole;
import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentAccountActivationService implements StudentAccountActivation {
  private final UserAccountStore accounts;
  private final Clock clock;

  public StudentAccountActivationService(UserAccountStore accounts, Clock clock) {
    this.accounts = accounts;
    this.clock = clock;
  }

  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public AccountRoleState lockRole(UUID accountId) {
    UserRole role = lockedAccount(accountId).getRole();
    if (role == UserRole.UNASSIGNED) return AccountRoleState.UNASSIGNED;
    if (role == UserRole.STUDENT) return AccountRoleState.STUDENT;
    return AccountRoleState.OTHER;
  }

  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void activateStudent(UUID accountId) {
    lockedAccount(accountId).activateStudent(clock.instant());
  }

  private UserAccount lockedAccount(UUID accountId) {
    return accounts
        .findByIdForUpdate(accountId)
        .orElseThrow(() -> new InvalidCredentialException("Authenticated user no longer exists."));
  }
}
