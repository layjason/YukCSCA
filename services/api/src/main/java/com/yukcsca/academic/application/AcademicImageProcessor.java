package com.yukcsca.academic.application;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AcademicImageProcessor {
  private static final long MAX_BYTES = 5L * 1024 * 1024;
  private static final int MAX_DIMENSION = 4096;

  public ProcessedImage process(MultipartFile upload) {
    if (upload == null || upload.isEmpty() || upload.getSize() > MAX_BYTES) {
      throw invalid("file", AcademicViolationCode.OUT_OF_RANGE);
    }
    try (ImageInputStream input = ImageIO.createImageInputStream(upload.getInputStream())) {
      if (input == null) throw invalid("file", AcademicViolationCode.INVALID);
      Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
      if (!readers.hasNext()) throw invalid("file", AcademicViolationCode.UNSUPPORTED);
      ImageReader reader = readers.next();
      try {
        reader.setInput(input, true, true);
        String format = reader.getFormatName().toLowerCase(Locale.ROOT);
        String mediaType = mediaType(format);
        if (!mediaType.equals(upload.getContentType())) {
          throw invalid("file", AcademicViolationCode.INVALID);
        }
        int width = reader.getWidth(0);
        int height = reader.getHeight(0);
        if (width < 1 || height < 1 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
          throw invalid("file", AcademicViolationCode.OUT_OF_RANGE);
        }
        BufferedImage decoded = reader.read(0);
        if (decoded == null) throw invalid("file", AcademicViolationCode.INVALID);
        byte[] normalized = reencode(decoded, mediaType);
        if (normalized.length == 0 || normalized.length > MAX_BYTES) {
          throw invalid("file", AcademicViolationCode.OUT_OF_RANGE);
        }
        return new ProcessedImage(mediaType, normalized, width, height, sha256(normalized));
      } finally {
        reader.dispose();
      }
    } catch (IOException exception) {
      throw invalid("file", AcademicViolationCode.INVALID);
    }
  }

  private static String mediaType(String format) {
    return switch (format) {
      case "png" -> "image/png";
      case "jpeg", "jpg" -> "image/jpeg";
      default -> throw invalid("file", AcademicViolationCode.UNSUPPORTED);
    };
  }

  private static byte[] reencode(BufferedImage image, String mediaType) throws IOException {
    BufferedImage output = image;
    if ("image/jpeg".equals(mediaType) && image.getType() != BufferedImage.TYPE_INT_RGB) {
      output = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
      var graphics = output.createGraphics();
      try {
        graphics.drawImage(image, 0, 0, null);
      } finally {
        graphics.dispose();
      }
    }
    try (ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
      if (!ImageIO.write(output, "image/png".equals(mediaType) ? "png" : "jpeg", bytes)) {
        throw invalid("file", AcademicViolationCode.UNSUPPORTED);
      }
      return bytes.toByteArray();
    }
  }

  private static String sha256(byte[] bytes) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    } catch (NoSuchAlgorithmException impossible) {
      throw new IllegalStateException("SHA-256 is unavailable.", impossible);
    }
  }

  private static AcademicValidationException invalid(String path, AcademicViolationCode code) {
    return new AcademicValidationException(List.of(new AcademicViolation(path, code)));
  }

  public record ProcessedImage(
      String mediaType, byte[] bytes, int width, int height, String sha256) {
    public ProcessedImage {
      bytes = bytes.clone();
    }

    @Override
    public byte[] bytes() {
      return bytes.clone();
    }
  }
}
