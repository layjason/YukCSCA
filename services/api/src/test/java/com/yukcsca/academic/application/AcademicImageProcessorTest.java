package com.yukcsca.academic.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class AcademicImageProcessorTest {
  private final AcademicImageProcessor processor = new AcademicImageProcessor();

  @Test
  void rejectsUploadBeforeDecodeWhenRawBytesExceedLimit() {
    byte[] oversized = new byte[5 * 1024 * 1024 + 1];
    var upload = new MockMultipartFile("file", "large.png", "image/png", oversized);

    assertThatThrownBy(() -> processor.process(upload))
        .isInstanceOf(AcademicValidationException.class);
  }

  @Test
  void rejectsDimensionsBeforeFullImageDecode() throws Exception {
    BufferedImage image = new BufferedImage(4097, 1, BufferedImage.TYPE_INT_ARGB);
    byte[] encoded;
    try (ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
      ImageIO.write(image, "png", bytes);
      encoded = bytes.toByteArray();
    }
    var upload = new MockMultipartFile("file", "wide.png", "image/png", encoded);

    assertThatThrownBy(() -> processor.process(upload))
        .isInstanceOf(AcademicValidationException.class);
  }
}
