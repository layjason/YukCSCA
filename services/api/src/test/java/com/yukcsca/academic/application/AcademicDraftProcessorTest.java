package com.yukcsca.academic.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Set;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class AcademicDraftProcessorTest {
  private final AcademicDraftProcessor processor = new AcademicDraftProcessor(JsonMapper.shared());

  @Test
  void incompleteDraftFailsValidationWithoutNpe() {
    ObjectNode draft =
        processor.parseObject(
            """
        {"officialSyllabus":{"subject":"MATHEMATICS"},"outlineItems":[],"learningObjectives":[],"resources":[],"questions":[],"mocks":[]}
        """);
    assertThatThrownBy(() -> processor.validateForPublication(draft, Set.of()))
        .isInstanceOf(AcademicValidationException.class);
  }
}
