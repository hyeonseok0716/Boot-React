package org.zerock.mallapi.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.zerock.mallapi.util.CustomJWTException;
import org.zerock.mallapi.util.JWTUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;

@RestController
@RequiredArgsConstructor
@Log4j2
public class APIRefreshController {
  @RequestMapping("/api/member/refresh")
  public Map<String, Object> refresh(
      @RequestHeader(value="Authorization", required=false) String authHeader,
      @RequestParam(value="refreshToken", required=false) String refreshToken) {
    if (refreshToken == null || refreshToken.isBlank()) {
      throw new CustomJWTException("NULL_REFRASH");
    }
    if (authHeader == null || !authHeader.startsWith("Bearer ") || authHeader.length() <= 7) {
      throw new CustomJWTException("INVALID_STRING");
    }
    String accessToken = authHeader.substring(7);
    Map<String, Object> accessClaims = JWTUtil.getExpiredClaims(accessToken);
    Map<String, Object> claims = JWTUtil.validateToken(refreshToken);
    if (!"access".equals(accessClaims.get("tokenType")) || !"refresh".equals(claims.get("tokenType"))
        || !(accessClaims.get("email") instanceof String)
        || !accessClaims.get("email").equals(claims.get("email"))) {
      throw new CustomJWTException("Invalid");
    }
    if (!checkExpiredToken(accessToken)) {
      return Map.of("accessToken", accessToken, "refreshToken", refreshToken);
    }
    String newAccessToken = JWTUtil.generateToken(claims, 10);
    String newRefreshToken = checkTime((Number) claims.get("exp"))
        ? JWTUtil.generateToken(claims, 60 * 24, "refresh") : refreshToken;
    return Map.of("accessToken", newAccessToken, "refreshToken", newRefreshToken);
  }

  private boolean checkTime(Number exp) {
    if (exp == null) throw new CustomJWTException("Invalid");
    long gap = exp.longValue() * 1000L - System.currentTimeMillis();
    return gap < 60L * 60 * 1000;
  }

  private boolean checkExpiredToken(String token) {
    try {
      JWTUtil.validateToken(token);
      return false;
    } catch (CustomJWTException e) {
      if ("Expired".equals(e.getMessage())) return true;
      throw e;
    }
  }
}
