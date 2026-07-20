package com.yukcsca.identity.application;

import java.time.Duration;

public interface AuthSettings {
  String issuer();

  boolean cookieSecure();

  String cookieSameSite();

  Duration accessTokenTtl();

  Duration refreshTokenTtl();
}
