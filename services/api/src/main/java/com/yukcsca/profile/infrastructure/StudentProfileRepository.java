package com.yukcsca.profile.infrastructure;

import com.yukcsca.profile.application.StudentProfileStore;
import com.yukcsca.profile.domain.StudentProfile;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentProfileRepository
    extends JpaRepository<StudentProfile, UUID>, StudentProfileStore {
  Optional<StudentProfile> findByAccountId(UUID accountId);

  @Override
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select profile from StudentProfile profile where profile.accountId = :accountId")
  Optional<StudentProfile> findByAccountIdForUpdate(@Param("accountId") UUID accountId);
}
