package org.zerock.mallapi.util;

import static org.junit.jupiter.api.Assertions.*;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class CustomFileUtilTests {
  @TempDir
  Path temp;

  private CustomFileUtil fileUtil;
  private Path upload;

  @BeforeEach
  void setup() {
    upload = temp.resolve("upload");
    fileUtil = new CustomFileUtil();
    ReflectionTestUtils.setField(fileUtil, "uploadPath", upload.toString());
    fileUtil.init();
  }

  @Test
  void savesThumbnailAndDeletesBothFiles() throws Exception {
    BufferedImage image = new BufferedImage(1600, 800, BufferedImage.TYPE_INT_RGB);
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    ImageIO.write(image, "jpg", output);
    MockMultipartFile file = new MockMultipartFile("files", "sample.jpg", "image/jpeg", output.toByteArray());
    List<String> names = fileUtil.saveFiles(List.of(file));
    assertEquals(1, names.size());
    Path original = upload.resolve(names.get(0));
    Path thumbnail = upload.resolve("s_" + names.get(0));
    assertTrue(Files.exists(original));
    BufferedImage resized = ImageIO.read(thumbnail.toFile());
    assertTrue(resized.getWidth() <= 400 && resized.getHeight() <= 400);
    fileUtil.deleteFiles(names);
    assertFalse(Files.exists(original));
    assertFalse(Files.exists(thumbnail));
  }

  @Test
  void rejectsPathsOutsideUploadDirectory() throws Exception {
    Path outside = temp.resolve("keep.txt");
    Files.writeString(outside, "keep");
    assertThrows(ResponseStatusException.class, () -> fileUtil.deleteFiles(List.of("../keep.txt")));
    assertThrows(ResponseStatusException.class, () -> fileUtil.getFile("../keep.txt"));
    assertEquals("keep", Files.readString(outside));
  }

  @Test
  void handlesEmptyUploadsAndMissingImages() {
    assertTrue(fileUtil.saveFiles(null).isEmpty());
    assertTrue(fileUtil.saveFiles(List.of()).isEmpty());
    assertEquals(200, fileUtil.getFile("missing.jpg").getStatusCode().value());
    assertNotNull(fileUtil.getFile("missing.jpg").getBody());
  }

  @Test
  void removesIncompleteImageWhenThumbnailCreationFails() throws Exception {
    MockMultipartFile file = new MockMultipartFile("files", "bad.jpg", "image/jpeg", "not an image".getBytes());
    assertThrows(RuntimeException.class, () -> fileUtil.saveFiles(List.of(file)));
    try (var files = Files.list(upload)) {
      assertEquals(0, files.count());
    }
  }
}
