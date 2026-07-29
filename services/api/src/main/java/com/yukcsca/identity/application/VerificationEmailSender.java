package com.yukcsca.identity.application;

public interface VerificationEmailSender {
  void send(VerificationEmail email);
}
