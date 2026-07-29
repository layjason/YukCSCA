package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.CanonicalEmailLock;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Component;

@Component
public class PostgresCanonicalEmailLock implements CanonicalEmailLock {
  private final EntityManager entityManager;

  public PostgresCanonicalEmailLock(EntityManager entityManager) {
    this.entityManager = entityManager;
  }

  @Override
  public void lock(String canonicalEmail) {
    entityManager
        .createNativeQuery("select pg_advisory_xact_lock(hashtextextended(:email, 0))")
        .setParameter("email", canonicalEmail)
        .getSingleResult();
  }
}
