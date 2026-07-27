package com.yukcsca.identity.application;

import com.yukcsca.identity.domain.UserRole;

/** Application-facing account-role state exposed to other backend modules. */
public enum CurrentAccountRole {
  UNASSIGNED,
  STUDENT,
  PARENT,
  TUTOR,
  ADMIN;

  static CurrentAccountRole from(UserRole role) {
    return switch (role) {
      case UNASSIGNED -> UNASSIGNED;
      case STUDENT -> STUDENT;
      case PARENT -> PARENT;
      case TUTOR -> TUTOR;
      case ADMIN -> ADMIN;
    };
  }
}
