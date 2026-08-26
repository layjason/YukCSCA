package com.yukcsca.academic.application;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Syntax validation for admin-supplied WebVTT captions on UPLOADED draft assets. Bounded, cue-level
 * checks only: a WEBVTT header, parseable monotonic cues with positive non-overlapping timing, cue
 * text, and cue ends within the validated asset duration. Derived (produced) captions never pass
 * through here.
 */
@Component
public class WebVttValidator {
  static final int MAX_VTT_BYTES = 65_536;
  private static final Pattern CUE_TIMING =
      Pattern.compile(
          "^(?:(\\d{2,}):)?(\\d{2}):(\\d{2})\\.(\\d{3})\\s*-->\\s*(?:(\\d{2,}):)?(\\d{2}):(\\d{2})\\.(\\d{3})$");

  /**
   * @param durationSeconds validated asset duration; null skips the end-bound check.
   */
  public void validate(String captions, Integer durationSeconds) {
    List<AcademicViolation> violations = new ArrayList<>();
    if (captions == null || captions.isBlank()) {
      throw new AcademicValidationException(
          List.of(new AcademicViolation("captions", AcademicViolationCode.REQUIRED)));
    }
    if (captions.length() > MAX_VTT_BYTES) {
      throw new AcademicValidationException(
          List.of(new AcademicViolation("captions", AcademicViolationCode.OUT_OF_RANGE)));
    }
    String normalized = captions.replace("\r\n", "\n").replace("\r", "\n");
    if (!normalized.startsWith("WEBVTT")) {
      violations.add(new AcademicViolation("captions", AcademicViolationCode.INVALID));
      throw new AcademicValidationException(violations);
    }
    String[] lines = normalized.split("\n", -1);
    long previousEndMillis = -1;
    int cueIndex = 0;
    int lineIndex = 0;
    // Skip the header block (WEBVTT line plus metadata until a blank line).
    while (lineIndex < lines.length && !lines[lineIndex].isBlank()) lineIndex++;
    while (lineIndex < lines.length) {
      // Skip blank lines and NOTE/STYLE/REGION blocks between cues.
      while (lineIndex < lines.length
          && (lines[lineIndex].isBlank()
              || lines[lineIndex].startsWith("NOTE")
              || lines[lineIndex].startsWith("STYLE")
              || lines[lineIndex].startsWith("REGION"))) {
        if (!lines[lineIndex].isBlank()) {
          while (lineIndex < lines.length && !lines[lineIndex].isBlank()) lineIndex++;
        } else {
          lineIndex++;
        }
      }
      if (lineIndex >= lines.length) break;
      String line = lines[lineIndex];
      String timingLine = line;
      if (!CUE_TIMING.matcher(line).matches()) {
        // Optional cue identifier line precedes the timing line.
        timingLine = lineIndex + 1 < lines.length ? lines[lineIndex + 1] : null;
        if (timingLine == null || !CUE_TIMING.matcher(timingLine).matches()) {
          violations.add(
              new AcademicViolation("captions[" + cueIndex + "]", AcademicViolationCode.INVALID));
          break;
        }
        lineIndex++;
      }
      Matcher timing = CUE_TIMING.matcher(timingLine);
      if (!timing.matches()) {
        violations.add(
            new AcademicViolation("captions[" + cueIndex + "]", AcademicViolationCode.INVALID));
        break;
      }
      long start = millis(timing);
      long end = millisEnd(timing);
      String path = "captions[" + cueIndex + "]";
      if (end <= start) {
        violations.add(new AcademicViolation(path, AcademicViolationCode.INVALID));
      }
      if (start < previousEndMillis) {
        violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
      }
      if (durationSeconds != null && end > durationSeconds * 1000L) {
        violations.add(new AcademicViolation(path, AcademicViolationCode.OUT_OF_RANGE));
      }
      previousEndMillis = Math.max(previousEndMillis, end);
      lineIndex++;
      boolean hasText = false;
      while (lineIndex < lines.length && !lines[lineIndex].isBlank()) {
        hasText = true;
        lineIndex++;
      }
      if (!hasText) {
        violations.add(new AcademicViolation(path, AcademicViolationCode.REQUIRED));
      }
      cueIndex++;
    }
    if (cueIndex == 0 && violations.isEmpty()) {
      violations.add(new AcademicViolation("captions", AcademicViolationCode.REQUIRED));
    }
    if (!violations.isEmpty()) throw new AcademicValidationException(violations);
  }

  private static long millis(Matcher timing) {
    long hours = timing.group(1) == null ? 0 : Long.parseLong(timing.group(1));
    long minutes = Long.parseLong(timing.group(2));
    long seconds = Long.parseLong(timing.group(3));
    long millis = Long.parseLong(timing.group(4));
    return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
  }

  private static long millisEnd(Matcher timing) {
    long hours = timing.group(5) == null ? 0 : Long.parseLong(timing.group(5));
    long minutes = Long.parseLong(timing.group(6));
    long seconds = Long.parseLong(timing.group(7));
    long millis = Long.parseLong(timing.group(8));
    return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
  }
}
