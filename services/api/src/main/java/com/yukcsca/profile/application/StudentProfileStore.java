package com.yukcsca.profile.application;

import com.yukcsca.profile.domain.StudentProfile;
import java.util.Optional;
import java.util.UUID;

public interface StudentProfileStore {
  Optional<StudentProfile> findByAccountId(UUID accountId);

  Optional<StudentProfile> findByAccountIdForUpdate(UUID accountId);

  StudentProfile save(StudentProfile profile);
}
