package com.yukcsca.academic.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.academic.application.TerminologyProjector.PublishedTerm;
import com.yukcsca.academic.application.TerminologyProjector.Surface;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class TermReviewOptionPickerTest {
  private static final UUID OUTLINE = UUID.fromString("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1");

  @Test
  void capsDistractorsAtThreeAndPrefersSameClass() {
    PublishedTerm target =
        term("00000000-0000-4000-8000-0000000000a0", "TOPIC_TERM", List.of(OUTLINE));
    List<PublishedTerm> bank = new ArrayList<>();
    bank.add(target);
    for (int i = 1; i <= 5; i++) {
      bank.add(term("00000000-0000-4000-8000-0000000000a" + i, "TOPIC_TERM", List.of()));
    }
    bank.add(term("00000000-0000-4000-8000-0000000000b1", "EXAM_INSTRUCTION", List.of(OUTLINE)));
    bank.add(term("00000000-0000-4000-8000-0000000000b2", "LOGICAL_EXPRESSION", List.of(OUTLINE)));

    List<PublishedTerm> distractors = TermReviewOptionPicker.pickDistractors(target, bank);

    assertThat(distractors).hasSize(3);
    assertThat(distractors).allMatch(term -> "TOPIC_TERM".equals(term.termClass()));
    assertThat(distractors)
        .extracting(term -> term.id().toString())
        .containsExactly(
            "00000000-0000-4000-8000-0000000000a1",
            "00000000-0000-4000-8000-0000000000a2",
            "00000000-0000-4000-8000-0000000000a3");
  }

  @Test
  void fillsWithRelatedThenLeftoverWhenSameClassIsShort() {
    PublishedTerm target =
        term("00000000-0000-4000-8000-0000000000c0", "TOPIC_TERM", List.of(OUTLINE));
    PublishedTerm sameClass = term("00000000-0000-4000-8000-0000000000c1", "TOPIC_TERM", List.of());
    PublishedTerm related =
        term("00000000-0000-4000-8000-0000000000c2", "EXAM_INSTRUCTION", List.of(OUTLINE));
    PublishedTerm leftoverA =
        term("00000000-0000-4000-8000-0000000000c3", "LOGICAL_EXPRESSION", List.of());
    PublishedTerm leftoverB =
        term("00000000-0000-4000-8000-0000000000c4", "EXAM_INSTRUCTION", List.of());
    List<PublishedTerm> bank = List.of(target, sameClass, related, leftoverA, leftoverB);

    List<PublishedTerm> distractors = TermReviewOptionPicker.pickDistractors(target, bank);

    assertThat(distractors).hasSize(3);
    Set<UUID> ids = distractors.stream().map(PublishedTerm::id).collect(Collectors.toSet());
    assertThat(ids).contains(sameClass.id(), related.id());
    assertThat(ids).containsAnyOf(leftoverA.id(), leftoverB.id());
  }

  @Test
  void returnsEveryOtherTermWhenTheBankIsSmallerThanFourChoices() {
    PublishedTerm target = term("00000000-0000-4000-8000-0000000000d0", "TOPIC_TERM", List.of());
    PublishedTerm other = term("00000000-0000-4000-8000-0000000000d1", "TOPIC_TERM", List.of());
    assertThat(TermReviewOptionPicker.pickDistractors(target, List.of(target, other)))
        .containsExactly(other);
  }

  private static PublishedTerm term(String id, String termClass, List<UUID> outline) {
    return new PublishedTerm(
        UUID.fromString(id),
        termClass,
        List.of(new Surface("词" + id.substring(id.length() - 2), "cí")),
        null,
        "gloss",
        null,
        "gloss",
        null,
        null,
        outline);
  }
}
