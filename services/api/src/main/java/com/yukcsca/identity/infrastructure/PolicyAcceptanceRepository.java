package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.PolicyAcceptanceStore;
import com.yukcsca.identity.domain.PolicyAcceptance;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PolicyAcceptanceRepository
    extends JpaRepository<PolicyAcceptance, UUID>, PolicyAcceptanceStore {}
