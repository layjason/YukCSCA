package com.yukcsca.academic.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.academic.application.InlineLatex.Kind;
import org.junit.jupiter.api.Test;

class InlineLatexTest {
  @Test
  void plainProseIsOneTextSegment() {
    assertThat(InlineLatex.parse("若函数单调递增"))
        .containsExactly(new InlineLatex.Segment(Kind.TEXT, "若函数单调递增", 0, 7));
    assertThat(InlineLatex.isValidMixed("若函数单调递增")).isTrue();
  }

  @Test
  void parsesMultipleInlineFragmentsWithUtf16Offsets() {
    String source = "若函数 \\(f(x)\\) 则 \\(f'(x)\\gt 0\\)。";
    var segments = InlineLatex.parse(source);
    assertThat(segments).hasSize(5);
    assertThat(segments.get(1).kind()).isEqualTo(Kind.MATH);
    assertThat(segments.get(1).latex()).isEqualTo("f(x)");
    assertThat(source.substring(segments.get(1).start(), segments.get(1).end()))
        .isEqualTo("\\(f(x)\\)");
    assertThat(InlineLatex.reservedRanges(source)).hasSize(2);
    assertThat(InlineLatex.isValidMixed(source)).isTrue();
  }

  @Test
  void innerParenthesesAreNotClosers() {
    String source = "区间 \\((0,+\\infty)\\) 上";
    var math =
        InlineLatex.parse(source).stream()
            .filter(s -> s.kind() == Kind.MATH)
            .findFirst()
            .orElseThrow();
    assertThat(math.latex()).isEqualTo("(0,+\\infty)");
  }

  @Test
  void unmatchedOpenerIsInvalid() {
    assertThat(InlineLatex.isValidMixed("若 \\(f(x) 单调递增")).isFalse();
  }

  @Test
  void emptyOrUnsafeFragmentIsInvalid() {
    assertThat(InlineLatex.isValidMixed("empty \\(\\) here")).isFalse();
    assertThat(InlineLatex.isValidMixed("bad \\(\\href{https://x}{x}\\)")).isFalse();
    assertThat(InlineLatex.isValidMixed("macro \\(\\renewcommand{\\a}{b}\\)")).isFalse();
    assertThat(InlineLatex.isValidMixed("inequality \\(f'(x)>0\\)")).isFalse();
    assertThat(InlineLatex.isSafe("x^2")).isTrue();
    assertThat(InlineLatex.isSafe("f'(x)\\gt 0")).isTrue();
    assertThat(InlineLatex.isSafe("a < b")).isFalse();
  }

  @Test
  void indexOutsideReservedSkipsMath() {
    String source = "记号 \\(单调递增\\) 且单调递增。";
    assertThat(InlineLatex.indexOutsideReserved(source, "单调递增")).isEqualTo(source.indexOf("且") + 1);
  }

  @Test
  void truncateDoesNotSplitAFragment() {
    String source = "引言" + "\\(" + "x".repeat(50) + "\\)" + "结尾";
    String cut = InlineLatex.truncatePreserving(source, 10);
    assertThat(cut).isEqualTo("引言");
    assertThat(InlineLatex.isValidMixed(cut)).isTrue();
  }
}
