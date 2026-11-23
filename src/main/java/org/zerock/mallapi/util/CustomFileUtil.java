package org.zerock.mallapi.util;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import net.coobird.thumbnailator.Thumbnails;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import jakarta.annotation.PostConstruct;

@Component
@Log4j2
@RequiredArgsConstructor
public class CustomFileUtil {

  @Value("${org.zerock.upload.path}")
  private String uploadPath;

  @PostConstruct
  public void init() {
    File tempFolder = new File(uploadPath);

    try {
      Files.createDirectories(tempFolder.toPath());
    } catch (IOException e) {
      throw new IllegalStateException("Cannot create upload directory", e);
    }

    uploadPath = tempFolder.getAbsolutePath();

    log.info("-------------------------------------");
    log.info(uploadPath);
  }

  public List<String> saveFiles(List<MultipartFile> files)throws RuntimeException{

    if(files == null || files.size() == 0){
      return new ArrayList<>();
    }

    List<String> uploadNames = new ArrayList<>();

    for (MultipartFile multipartFile : files) {

      if (multipartFile.isEmpty()) {
        continue;
      }

      String savedName = UUID.randomUUID().toString() + "_" + multipartFile.getOriginalFilename();

      Path savePath = safePath(savedName);

      try (java.io.InputStream input = multipartFile.getInputStream()) {
        Files.copy(input, savePath);

        String contentType = multipartFile.getContentType();

        if(contentType != null && contentType.startsWith("image")){

          Path thumbnailPath = Paths.get(uploadPath, "s_"+savedName);

          Thumbnails.of(savePath.toFile())
                  .size(400,400)
                  .toFile(thumbnailPath.toFile());
        }

        uploadNames.add(savedName);
      } catch (IOException e) {
        uploadNames.add(savedName);
        deleteFiles(uploadNames);
        throw new RuntimeException("Cannot save uploaded file", e);
      }
    }
    return uploadNames;
  }

  public ResponseEntity<Resource> getFile(String fileName) {

    Resource resource = new FileSystemResource(safePath(fileName));

    if(!resource.exists()) {

      resource = new ClassPathResource("static/default.jpeg");

    }

    HttpHeaders headers = new HttpHeaders();

    if (!resource.exists() || !resource.isReadable()) {
      return ResponseEntity.notFound().build();
    }
    headers.setContentType(MediaTypeFactory.getMediaType(resource).orElse(MediaType.APPLICATION_OCTET_STREAM));
    return ResponseEntity.ok().headers(headers).body(resource);
  }

  public void deleteFiles(List<String> fileNames) {

    if(fileNames == null || fileNames.size() == 0){
      return;
    }

    fileNames.forEach(fileName -> {

      String thumbnailFileName = "s_" + fileName;
      Path thumbnailPath = safePath(thumbnailFileName);
      Path filePath = safePath(fileName);

      try {
        Files.deleteIfExists(filePath);
        Files.deleteIfExists(thumbnailPath);
      } catch (IOException e) {
        throw new RuntimeException(e.getMessage());
      }
    });
  }

  private Path safePath(String fileName) {
    if (fileName == null || fileName.isBlank() || fileName.contains("/") || fileName.contains("\\")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
    }
    Path root = Paths.get(uploadPath).toAbsolutePath().normalize();
    try {
      Path resolved = root.resolve(fileName).normalize();
      if (!root.equals(resolved.getParent())) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
      }
      return resolved;
    } catch (java.nio.file.InvalidPathException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name", e);
    }
  }

}
