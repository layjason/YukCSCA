package com.yukcsca.agent.application;

import com.yukcsca.agent.domain.AgentContextType;
import java.util.List;
import java.util.UUID;

public interface AgentContentSearchPort {
  void ensureIndexed(UUID packageRevisionId);

  List<SearchHit> search(
      UUID packageRevisionId, String query, String explanationLanguage, int limit);

  record SearchHit(
      AgentContextType sourceKind,
      UUID sourceId,
      String label,
      Integer blockIndex,
      UUID packageRevisionId,
      String excerpt,
      double score) {}
}
