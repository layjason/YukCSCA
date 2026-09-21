package com.yukcsca.agent.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class JdbcAgentContentSearchAdapterTest {
  @Test
  void hanQueryWithVectorRanksByCosineOnly() {
    assertThat(JdbcAgentContentSearchAdapter.containsHan("什么是正弦函数 sin")).isTrue();
    assertThat(JdbcAgentContentSearchAdapter.containsHan("what is sine")).isFalse();
    assertThat(JdbcAgentContentSearchAdapter.lexicalBlend("什么是正弦函数 sin", true)).isZero();
    assertThat(JdbcAgentContentSearchAdapter.lexicalBlend("what is sine", true)).isEqualTo(0.5);
    assertThat(JdbcAgentContentSearchAdapter.lexicalBlend("什么是正弦函数", false)).isEqualTo(0.5);
  }
}
