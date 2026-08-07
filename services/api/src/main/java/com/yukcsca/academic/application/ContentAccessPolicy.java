package com.yukcsca.academic.application;

import com.yukcsca.identity.application.CurrentAccount;
import com.yukcsca.identity.application.CurrentAccountRole;
import org.springframework.stereotype.Component;

/**
 * Pilot open-access for activated students. Later entitlement checks plug in here without rewriting
 * student controllers.
 */
@Component
public class ContentAccessPolicy {
  public boolean mayReadPublishedContent(CurrentAccount account) {
    return account != null && account.role() == CurrentAccountRole.STUDENT;
  }
}
