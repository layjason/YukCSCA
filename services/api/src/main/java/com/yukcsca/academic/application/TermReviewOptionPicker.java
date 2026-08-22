package com.yukcsca.academic.application;

import com.yukcsca.academic.application.TerminologyProjector.PublishedTerm;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.UUID;

/**
 * Builds a uniform four-choice review: one key plus up to three distractors. Same-class first, then
 * same-outline related terms, then a seeded shuffle of the leftover bank.
 */
public final class TermReviewOptionPicker {
  public static final int CHOICE_COUNT = 4;

  private TermReviewOptionPicker() {}

  public static List<PublishedTerm> pickDistractors(PublishedTerm term, List<PublishedTerm> bank) {
    int need = CHOICE_COUNT - 1;
    List<PublishedTerm> others = new ArrayList<>();
    for (PublishedTerm other : bank) {
      if (!other.id().equals(term.id())) {
        others.add(other);
      }
    }
    List<PublishedTerm> sameClass = new ArrayList<>();
    List<PublishedTerm> related = new ArrayList<>();
    Set<UUID> outline = new HashSet<>(term.outlineItemIds());
    for (PublishedTerm other : others) {
      if (other.termClass().equals(term.termClass())) {
        sameClass.add(other);
      } else if (other.outlineItemIds().stream().anyMatch(outline::contains)) {
        related.add(other);
      }
    }
    sameClass.sort(Comparator.comparing(PublishedTerm::id));
    related.sort(Comparator.comparing(PublishedTerm::id));
    LinkedHashSet<PublishedTerm> picked = new LinkedHashSet<>();
    for (PublishedTerm other : sameClass) {
      if (picked.size() >= need) {
        break;
      }
      picked.add(other);
    }
    for (PublishedTerm other : related) {
      if (picked.size() >= need) {
        break;
      }
      picked.add(other);
    }
    if (picked.size() < need) {
      List<PublishedTerm> leftover = new ArrayList<>();
      for (PublishedTerm other : others) {
        if (!picked.contains(other)) {
          leftover.add(other);
        }
      }
      leftover.sort(Comparator.comparing(PublishedTerm::id));
      shuffleSeeded(leftover, term.id());
      for (PublishedTerm other : leftover) {
        if (picked.size() >= need) {
          break;
        }
        picked.add(other);
      }
    }
    return List.copyOf(picked);
  }

  static void shuffleSeeded(List<PublishedTerm> items, UUID seed) {
    Random random = new Random(seed.getMostSignificantBits() ^ seed.getLeastSignificantBits());
    for (int i = items.size() - 1; i > 0; i--) {
      int j = random.nextInt(i + 1);
      PublishedTerm swap = items.get(i);
      items.set(i, items.get(j));
      items.set(j, swap);
    }
  }
}
