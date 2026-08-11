package com.yukcsca.academic.application;

import java.util.Optional;
import java.util.UUID;

/**
 * Read-only progress query for assessment checkpoint unlock and revalidation eligibility. Does not
 * expose JPA entities across modules.
 */
public interface StudentContentProgressQuery {

  boolean isContentComplete(UUID accountId, UUID packageId, UUID resourceId);

  Optional<ContentProgressStatusView> find(UUID accountId, UUID packageId, UUID resourceId);

  record ContentProgressStatusView(String status, UUID lastRevisionId) {}
}
