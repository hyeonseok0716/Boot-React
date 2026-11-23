package org.zerock.mallapi.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.log4j.Log4j2;
import java.time.ZonedDateTime;
import java.util.*;
import javax.crypto.SecretKey;

@Log4j2
public class JWTUtil {
  private static final String key = loadKey();

  private static String loadKey() {
    String configured = System.getenv("JWT_SECRET");
    if (configured != null && !configured.isBlank()) {
      return configured;
    }
    java.nio.file.Path path = java.nio.file.Path.of(".jwt-secret");
    try {
      if (java.nio.file.Files.exists(path)) {
        return java.nio.file.Files.readString(path).trim();
      }
      byte[] bytes = new byte[64];
      new java.security.SecureRandom().nextBytes(bytes);
      String generated = Base64.getEncoder().encodeToString(bytes);
      try {
        java.nio.file.Files.writeString(path, generated, java.nio.file.StandardOpenOption.CREATE_NEW);
        return generated;
      } catch (java.nio.file.FileAlreadyExistsException e) {
        return java.nio.file.Files.readString(path).trim();
      }
    } catch (java.io.IOException e) {
      throw new IllegalStateException("Cannot initialize JWT signing key", e);
    }
  }

  private static SecretKey signingKey() {
    return Keys.hmacShaKeyFor(key.getBytes(java.nio.charset.StandardCharsets.UTF_8));
  }

  public static String generateToken(Map<String, Object> valueMap, int min) {
    return generateToken(valueMap, min, "access");
  }

  public static String generateToken(Map<String, Object> valueMap, int min, String type) {
    Map<String, Object> claims = new HashMap<>(valueMap);
    for (String name : List.of("pw", "password", "accessToken", "refreshToken", "iat", "exp", "jti")) {
      claims.remove(name);
    }
    claims.put("tokenType", type);
    return Jwts.builder().setHeader(Map.of("typ", "JWT"))
        .setClaims(claims).setId(UUID.randomUUID().toString())
        .setIssuedAt(Date.from(ZonedDateTime.now().toInstant()))
        .setExpiration(Date.from(ZonedDateTime.now().plusMinutes(min).toInstant()))
        .signWith(signingKey()).compact();
  }

  public static Map<String, Object> validateToken(String token) {
    return parse(token, false);
  }

  public static Map<String, Object> getExpiredClaims(String token) {
    return parse(token, true);
  }

  private static Map<String, Object> parse(String token, boolean allowExpired) {
    try {
      return Jwts.parserBuilder().setSigningKey(signingKey()).build().parseClaimsJws(token).getBody();
    } catch (ExpiredJwtException e) {
      if (allowExpired) return e.getClaims();
      throw new CustomJWTException("Expired");
    } catch (MalformedJwtException e) {
      throw new CustomJWTException("MalFormed");
    } catch (InvalidClaimException e) {
      throw new CustomJWTException("Invalid");
    } catch (JwtException e) {
      throw new CustomJWTException("JWTError");
    } catch (Exception e) {
      throw new CustomJWTException("Error");
    }
  }
}
