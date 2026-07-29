package com.yukcsca.identity.application;

public interface PasswordRecoveryEmailSender {
  void send(PasswordRecoveryEmail email);
}
