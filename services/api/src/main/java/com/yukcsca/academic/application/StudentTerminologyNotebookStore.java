package com.yukcsca.academic.application;

import com.yukcsca.academic.domain.StudentTerminologyNotebook;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentTerminologyNotebookStore {
  Optional<StudentTerminologyNotebook> findByAccountIdAndTermId(UUID accountId, UUID termId);

  List<StudentTerminologyNotebook> findByAccountIdAndTermIdIn(
      UUID accountId, Collection<UUID> termIds);

  List<StudentTerminologyNotebook> findByAccountIdOrderByUpdatedAtDesc(UUID accountId);

  StudentTerminologyNotebook save(StudentTerminologyNotebook entry);

  long deleteByAccountIdAndTermId(UUID accountId, UUID termId);
}
