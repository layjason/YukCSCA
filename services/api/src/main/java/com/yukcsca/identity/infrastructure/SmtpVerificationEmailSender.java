package com.yukcsca.identity.infrastructure;

import com.yukcsca.identity.application.CredentialAuthSettings;
import com.yukcsca.identity.application.CredentialConfigurationException;
import com.yukcsca.identity.application.VerificationEmail;
import com.yukcsca.identity.application.VerificationEmailSender;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class SmtpVerificationEmailSender implements VerificationEmailSender {
  private final ObjectProvider<JavaMailSender> mailSenders;
  private final CredentialAuthSettings settings;

  public SmtpVerificationEmailSender(
      ObjectProvider<JavaMailSender> mailSenders, CredentialAuthSettings settings) {
    this.mailSenders = mailSenders;
    this.settings = settings;
  }

  @Override
  public void send(VerificationEmail email) {
    JavaMailSender sender = mailSenders.getIfAvailable();
    if (sender == null) {
      throw new CredentialConfigurationException("SMTP delivery is unavailable.");
    }
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(settings.mailFrom());
    message.setTo(email.recipient());
    message.setSubject("Verifikasi email YukCSCA | Email verification | 邮箱验证");
    message.setText(
        """
        Selesaikan verifikasi YukCSCA melalui tautan berikut.
        Complete your YukCSCA verification using the link below.
        请使用以下链接完成 YukCSCA 邮箱验证。

        %s

        Jika Anda tidak meminta pesan ini, abaikan saja.
        If you did not request this message, you can ignore it.
        如果并非您本人发起，请忽略此邮件。
        """
            .formatted(email.verificationUrl()));
    sender.send(message);
  }
}
