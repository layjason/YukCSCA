package com.yukcsca.profile.infrastructure;

import com.yukcsca.profile.application.StudentProfileStore;
import com.yukcsca.profile.domain.StudentProfile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentProfileRepository
    extends JpaRepository<StudentProfile, UUID>, StudentProfileStore {
  Optional<StudentProfile> findByAccountId(UUID accountId);
}
