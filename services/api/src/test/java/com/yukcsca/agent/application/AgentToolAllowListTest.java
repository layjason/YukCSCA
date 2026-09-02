package com.yukcsca.agent.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.agent.infrastructure.AgentToolFacade;
import org.junit.jupiter.api.Test;

class AgentToolAllowListTest {
  @Test
  void allowListHasGettersAndSearchAndNeverRenderScene() {
    assertThat(AgentToolFacade.ALLOWED_TOOL_NAMES)
        .containsExactlyInAnyOrder(
            "getLessonContext",
            "getItemContext",
            "getMistakeContext",
            "getRemediationContext",
            "getTermContext",
            "getRecentEvidence",
            "searchAuthorisedContent")
        .doesNotContain("RENDER_SCENE");
  }
}
