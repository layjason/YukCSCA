package com.yukcsca.identity.application;

import java.util.UUID;

public interface StudentAccountActivation {
  AccountRoleState lockRole(UUID accountId);

  void activateStudent(UUID accountId);

  enum AccountRoleState {
    UNASSIGNED,
    STUDENT,
    OTHER
  }
}
