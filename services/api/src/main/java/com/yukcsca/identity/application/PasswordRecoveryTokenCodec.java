package com.yukcsca.identity.application;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public class PasswordRecoveryTokenCodec {
  private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
  private static final Base64.Decoder DECODER = Base64.getUrlDecoder();
  private static final byte[] PURPOSE = "password-recovery:".getBytes(StandardCharsets.US_ASCII);

  private final CredentialAuthSettings settings;

  public PasswordRecoveryTokenCodec(CredentialAuthSettings settings) {
    this.settings = settings;
  }

  /**
   * Reconstructs a purpose-bound token from its random claim identifier. PostgreSQL retains only
   * the resulting token digest.
   */
  public String tokenFor(UUID claimId) {
    byte[] idBytes = uuidBytes(claimId);
    return ENCODER.encodeToString(idBytes) + "." + ENCODER.encodeToString(sign(idBytes));
  }

  public Optional<UUID> claimIdFrom(String rawToken) {
    if (rawToken == null) return Optional.empty();
    String[] parts = rawToken.split("\\.", -1);
    if (parts.length != 2) return Optional.empty();
    try {
      byte[] idBytes = DECODER.decode(parts[0]);
      byte[] signature = DECODER.decode(parts[1]);
      if (idBytes.length != 16 || !MessageDigest.isEqual(signature, sign(idBytes))) {
        return Optional.empty();
      }
      ByteBuffer buffer = ByteBuffer.wrap(idBytes);
      return Optional.of(new UUID(buffer.getLong(), buffer.getLong()));
    } catch (IllegalArgumentException exception) {
      return Optional.empty();
    }
  }

  public String hash(String rawToken) {
    try {
      byte[] digest =
          MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException impossible) {
      throw new IllegalStateException("SHA-256 is unavailable.", impossible);
    }
  }

  private byte[] sign(byte[] idBytes) {
    String secret = settings.verificationSecret();
    if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
      throw new PasswordRecoveryConfigurationException();
    }
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      mac.update(PURPOSE);
      return mac.doFinal(idBytes);
    } catch (Exception exception) {
      throw new IllegalStateException("Password-recovery token signing is unavailable.", exception);
    }
  }

  private static byte[] uuidBytes(UUID id) {
    return ByteBuffer.allocate(16)
        .putLong(id.getMostSignificantBits())
        .putLong(id.getLeastSignificantBits())
        .array();
  }
}
