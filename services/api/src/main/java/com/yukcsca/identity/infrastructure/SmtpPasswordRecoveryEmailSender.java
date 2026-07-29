package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.CredentialAuthSettings;
import com.yukcsca.identity.application.PasswordRecoveryConfigurationException;
import com.yukcsca.identity.application.PasswordRecoveryEmail;
import com.yukcsca.identity.application.PasswordRecoveryEmailSender;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class SmtpPasswordRecoveryEmailSender implements PasswordRecoveryEmailSender {
  private final ObjectProvider<JavaMailSender> mailSenders;
  private final CredentialAuthSettings settings;

  public SmtpPasswordRecoveryEmailSender(
      ObjectProvider<JavaMailSender> mailSenders, CredentialAuthSettings settings) {
    this.mailSenders = mailSenders;
    this.settings = settings;
  }

  @Override
  public void send(PasswordRecoveryEmail email) {
    JavaMailSender sender = mailSenders.getIfAvailable();
    if (sender == null) {
      throw new PasswordRecoveryConfigurationException();
    }
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(settings.mailFrom());
    message.setTo(email.recipient());
    message.setSubject("Pulihkan kata sandi YukCSCA | Password recovery | 密码找回");
    message.setText(
        """
        Gunakan tautan berikut untuk mengatur ulang kata sandi YukCSCA Anda.
        Use the link below to reset your YukCSCA password.
        请使用以下链接重设您的 YukCSCA 密码。

        %s

        Jika Anda tidak meminta pesan ini, abaikan saja.
        If you did not request this message, you can ignore it.
        如果并非您本人发起，请忽略此邮件。
        """
            .formatted(email.recoveryUrl()));
    sender.send(message);
  }
}
