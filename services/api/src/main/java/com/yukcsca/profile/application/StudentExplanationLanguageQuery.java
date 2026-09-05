package com.yukcsca.profile.application;

import java.util.Optional;
import java.util.UUID;

/**
 * Wire explanation-language value ({@code id} / {@code en} / {@code zh-CN}) without exposing JPA.
 */
public interface StudentExplanationLanguageQuery {
  Optional<String> explanationLanguage(UUID accountId);
}
