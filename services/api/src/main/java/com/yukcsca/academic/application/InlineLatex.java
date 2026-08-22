package com.yukcsca.academic.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Bounded inline KaTeX inside TEXT-like strings. Delimiters are the two-character sequences {@code
 * \(} and {@code \)}. Display-mode formulas stay MATH blocks. Offsets are UTF-16 code units.
 */
public final class InlineLatex {
  public static final String OPEN = "\\(";
  public static final String CLOSE = "\\)";

  /** Same cap as a MATH block. One TEXT string may not hide a larger formula. */
  public static final int MAX_FRAGMENT_LENGTH = 4000;

  public static final int MAX_FRAGMENTS = 64;

  private static final List<String> UNSAFE_COMMANDS =
      List.of(
          "\\html",
          "\\href",
          "\\url",
          "\\includegraphics",
          "\\def",
          "\\gdef",
          "\\newcommand",
          "\\renewcommand",
          "\\providecommand",
          "\\let",
          "\\input",
          "\\include",
          "\\special");

  public enum Kind {
    TEXT,
    MATH,
    UNMATCHED
  }

  public record Segment(Kind kind, String text, int start, int end) {
    public String latex() {
      return kind == Kind.MATH ? text : null;
    }
  }

  public record Range(int start, int end) {}

  private InlineLatex() {}

  public static List<Segment> parse(String source) {
    if (source == null || source.isEmpty()) return List.of();
    List<Segment> segments = new ArrayList<>();
    int index = 0;
    int length = source.length();
    while (index < length) {
      int open = source.indexOf(OPEN, index);
      if (open < 0) {
        segments.add(new Segment(Kind.TEXT, source.substring(index), index, length));
        break;
      }
      if (open > index) {
        segments.add(new Segment(Kind.TEXT, source.substring(index, open), index, open));
      }
      int close = source.indexOf(CLOSE, open + OPEN.length());
      if (close < 0) {
        segments.add(new Segment(Kind.UNMATCHED, source.substring(open), open, length));
        break;
      }
      String latex = source.substring(open + OPEN.length(), close);
      segments.add(new Segment(Kind.MATH, latex, open, close + CLOSE.length()));
      index = close + CLOSE.length();
    }
    return List.copyOf(segments);
  }

  public static List<Range> reservedRanges(String source) {
    List<Range> ranges = new ArrayList<>();
    for (Segment segment : parse(source)) {
      if (segment.kind() != Kind.TEXT) {
        ranges.add(new Range(segment.start(), segment.end()));
      }
    }
    return List.copyOf(ranges);
  }

  public static boolean isSafe(String latex) {
    if (latex == null) return false;
    if (latex.length() > MAX_FRAGMENT_LENGTH) return false;
    String normalized = latex.toLowerCase(Locale.ROOT);
    if (normalized.indexOf('<') >= 0 || normalized.indexOf('>') >= 0) return false;
    return UNSAFE_COMMANDS.stream().noneMatch(normalized::contains);
  }

  public static boolean isValidMixed(String source) {
    if (source == null) return true;
    int mathCount = 0;
    for (Segment segment : parse(source)) {
      if (segment.kind() == Kind.UNMATCHED) return false;
      if (segment.kind() == Kind.MATH) {
        mathCount += 1;
        if (mathCount > MAX_FRAGMENTS) return false;
        if (segment.text().isBlank() || !isSafe(segment.text())) return false;
      }
    }
    return true;
  }

  /** First {@code needle} whose UTF-16 range does not overlap inline math. */
  public static int indexOutsideReserved(String source, String needle) {
    if (source == null || needle == null || needle.isEmpty()) return -1;
    boolean[] used = occupied(source);
    int from = 0;
    while (from <= source.length() - needle.length()) {
      int start = source.indexOf(needle, from);
      if (start < 0) return -1;
      int end = start + needle.length();
      if (!rangeOccupied(used, start, end)) return start;
      from = start + 1;
    }
    return -1;
  }

  /**
   * Cut a student snippet without splitting {@code \\(...\\)}. If the limit lands inside math, the
   * whole fragment is dropped.
   */
  public static String truncatePreserving(String source, int maxChars) {
    if (source == null) return null;
    if (maxChars <= 0) return "";
    if (source.length() <= maxChars) return source;
    int cut = maxChars;
    for (Range range : reservedRanges(source)) {
      if (range.start() < maxChars && range.end() > maxChars) {
        cut = range.start();
        break;
      }
    }
    String sliced = source.substring(0, Math.max(0, cut));
    List<Segment> segments = parse(sliced);
    if (!segments.isEmpty() && segments.getLast().kind() == Kind.UNMATCHED) {
      sliced = source.substring(0, segments.getLast().start());
    }
    return sliced.stripTrailing();
  }

  static boolean[] occupied(String source) {
    boolean[] used = new boolean[source.length()];
    for (Range range : reservedRanges(source)) {
      for (int i = range.start(); i < range.end() && i < used.length; i++) {
        used[i] = true;
      }
    }
    return used;
  }

  static boolean rangeOccupied(boolean[] used, int start, int end) {
    for (int i = start; i < end && i < used.length; i++) {
      if (used[i]) return true;
    }
    return false;
  }
}
