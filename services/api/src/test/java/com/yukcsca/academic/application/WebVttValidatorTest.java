package com.yukcsca.academic.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/** Admin caption syntax validation tests (CR-09 preconditions are covered by the IT). */
class WebVttValidatorTest {
  private final WebVttValidator validator = new WebVttValidator();

  @Test
  void acceptsWellFormedCues() {
    String vtt =
        """
        WEBVTT

        1
        00:00:00.000 --> 00:00:05.000
        First cue

        2
        00:00:05.000 --> 00:00:10.500
        Second cue
        """;
    assertThatCode(() -> validator.validate(vtt, 11)).doesNotThrowAnyException();
  }

  @Test
  void rejectsMissingHeader() {
    assertThatThrownBy(() -> validator.validate("1\n00:00:00.000 --> 00:00:01.000\nx", 10))
        .isInstanceOf(AcademicValidationException.class)
        .satisfies(
            exception ->
                assertThat(((AcademicValidationException) exception).violations())
                    .contains(new AcademicViolation("captions", AcademicViolationCode.INVALID)));
  }

  @Test
  void rejectsCueBeyondAssetDuration() {
    String vtt = "WEBVTT\n\n00:00:00.000 --> 00:00:12.000\nToo long";
    assertThatThrownBy(() -> validator.validate(vtt, 10))
        .isInstanceOf(AcademicValidationException.class)
        .satisfies(
            exception ->
                assertThat(((AcademicValidationException) exception).violations())
                    .contains(
                        new AcademicViolation("captions[0]", AcademicViolationCode.OUT_OF_RANGE)));
  }

  @Test
  void rejectsOverlappingAndBackwardsCues() {
    String backwards = "WEBVTT\n\n00:00:05.000 --> 00:00:03.000\nBackwards";
    assertThatThrownBy(() -> validator.validate(backwards, 10))
        .isInstanceOf(AcademicValidationException.class);

    String overlapping =
        """
        WEBVTT

        00:00:00.000 --> 00:00:10.000
        First

        00:00:05.000 --> 00:00:12.000
        Overlap
        """;
    assertThatThrownBy(() -> validator.validate(overlapping, 20))
        .isInstanceOf(AcademicValidationException.class)
        .satisfies(
            exception ->
                assertThat(((AcademicValidationException) exception).violations())
                    .contains(
                        new AcademicViolation("captions[1]", AcademicViolationCode.OUT_OF_RANGE)));
  }

  @Test
  void rejectsCueWithoutTextAndEmptyDocument() {
    String noText = "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n\n";
    assertThatThrownBy(() -> validator.validate(noText, 10))
        .isInstanceOf(AcademicValidationException.class);

    assertThatThrownBy(() -> validator.validate("WEBVTT\n", 10))
        .isInstanceOf(AcademicValidationException.class)
        .satisfies(
            exception ->
                assertThat(((AcademicValidationException) exception).violations())
                    .contains(new AcademicViolation("captions", AcademicViolationCode.REQUIRED)));
  }

  @Test
  void boundsTotalSize() {
    String large = "WEBVTT\n\n" + "00:00:00.000 --> 00:00:01.000\n" + "x".repeat(70_000);
    assertThatThrownBy(() -> validator.validate(large, 10))
        .isInstanceOf(AcademicValidationException.class)
        .satisfies(
            exception ->
                assertThat(((AcademicValidationException) exception).violations())
                    .contains(
                        new AcademicViolation("captions", AcademicViolationCode.OUT_OF_RANGE)));
  }
}
