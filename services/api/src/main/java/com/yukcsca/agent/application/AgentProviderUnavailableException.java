package com.yukcsca.agent.application;

import java.util.concurrent.TimeoutException;

/**
 * Typed 503 for Ask. HTTP {@code code} stays {@code AGENT_PROVIDER_UNAVAILABLE}; {@code detail} and
 * {@link #causeToken()} distinguish timeout, host outage, and unreadable structured output. Tokens
 * are class names or short labels only — never prompt or completion text.
 */
public class AgentProviderUnavailableException extends RuntimeException {
  public enum Kind {
    TIMEOUT,
    PROVIDER,
    ANSWER_FORMAT
  }

  public static final String DETAIL_TIMEOUT = "The Ask provider timed out.";
  public static final String DETAIL_PROVIDER = "The Ask provider is temporarily unavailable.";
  public static final String DETAIL_ANSWER_FORMAT = "The Ask answer could not be read. Try again.";

  private final Kind kind;
  private final String causeToken;

  public AgentProviderUnavailableException() {
    this(Kind.PROVIDER, "provider");
  }

  public AgentProviderUnavailableException(Kind kind, String causeToken) {
    super(detailOf(kind));
    this.kind = kind;
    this.causeToken = sanitizeCause(causeToken);
  }

  public AgentProviderUnavailableException(Throwable cause) {
    this(kindOf(cause), tokenOf(cause), cause);
  }

  public AgentProviderUnavailableException(Kind kind, String causeToken, Throwable cause) {
    super(detailOf(kind), cause);
    this.kind = kind;
    this.causeToken = sanitizeCause(causeToken);
  }

  public Kind kind() {
    return kind;
  }

  public String causeToken() {
    return causeToken;
  }

  public static Kind kindOf(Throwable throwable) {
    Throwable cause = root(throwable);
    if (cause instanceof AgentProviderUnavailableException unavailable) {
      return unavailable.kind();
    }
    if (cause instanceof TimeoutException) {
      return Kind.TIMEOUT;
    }
    if (cause instanceof InterruptedException) {
      return Kind.TIMEOUT;
    }
    if ("answer-format-exhausted".equals(cause.getMessage())) {
      return Kind.ANSWER_FORMAT;
    }
    return Kind.PROVIDER;
  }

  public static String tokenOf(Throwable throwable) {
    Throwable cause = root(throwable);
    if (cause instanceof AgentProviderUnavailableException unavailable) {
      return unavailable.causeToken();
    }
    if (cause instanceof TimeoutException) {
      return "timeout";
    }
    if (cause instanceof InterruptedException) {
      return "interrupted";
    }
    if ("answer-format-exhausted".equals(cause.getMessage())) {
      return "answer-format-exhausted";
    }
    return sanitizeCause(cause.getClass().getSimpleName());
  }

  private static String detailOf(Kind kind) {
    return switch (kind) {
      case TIMEOUT -> DETAIL_TIMEOUT;
      case ANSWER_FORMAT -> DETAIL_ANSWER_FORMAT;
      case PROVIDER -> DETAIL_PROVIDER;
    };
  }

  static String sanitizeCause(String raw) {
    if (raw == null || raw.isBlank()) {
      return "provider";
    }
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < raw.length() && out.length() < 80; i++) {
      char ch = raw.charAt(i);
      if ((ch >= 'a' && ch <= 'z')
          || (ch >= 'A' && ch <= 'Z')
          || (ch >= '0' && ch <= '9')
          || ch == '.'
          || ch == '_'
          || ch == '-') {
        out.append(ch);
      }
    }
    return out.isEmpty() ? "provider" : out.toString();
  }

  private static Throwable root(Throwable throwable) {
    if (throwable == null) {
      return new AgentProviderUnavailableException();
    }
    if (throwable instanceof AgentProviderUnavailableException) {
      return throwable;
    }
    Throwable cause = throwable.getCause();
    return cause == null ? throwable : cause;
  }
}
