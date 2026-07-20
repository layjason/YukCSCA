package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.SecurityEventStore;
import com.yukcsca.identity.domain.SecurityEvent;
import com.yukcsca.identity.domain.SecurityEventType;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SecurityEventRepository
    extends JpaRepository<SecurityEvent, UUID>, SecurityEventStore {
  long countByEventType(SecurityEventType eventType);
}
