package org.zerock.mallapi.controller;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.zerock.mallapi.dto.*;
import org.zerock.mallapi.service.*;
import org.zerock.mallapi.util.JWTUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/member")
@RequiredArgsConstructor
public class SocialController {
  private final MemberService memberService;
  private final KakaoClient kakaoClient;

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, String>> error(ResponseStatusException exception) {
    return ResponseEntity.status(exception.getStatusCode()).body(Map.of("error", exception.getReason()));
  }

  @GetMapping("/kakao/config")
  public Map<String, Object> config() { return kakaoClient.configuration(); }

  @PostMapping("/kakao/token")
  public Map<?, ?> token(@RequestBody Map<String, String> request) {
    return kakaoClient.exchangeCode(request.get("code"));
  }

  @PostMapping("/kakao")
  public Map<String, Object> kakao(@RequestBody Map<String, String> request) {
    MemberDTO dto = memberService.getKakaoMember(request.get("accessToken"));
    Map<String, Object> claims = dto.getClaims();
    String accessToken = JWTUtil.generateToken(claims, 10);
    String refreshToken = JWTUtil.generateToken(claims, 60 * 24, "refresh");
    claims.put("accessToken", accessToken);
    claims.put("refreshToken", refreshToken);
    return claims;
  }

  @PutMapping("/modify")
  public Map<String, String> modify(@AuthenticationPrincipal MemberDTO current,
      @Valid @RequestBody MemberModifyDTO dto) {
    if (!current.getEmail().equals(dto.getEmail())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ERROR_ACCESSDENIED");
    }
    memberService.modifyMember(dto);
    return Map.of("result", "modified");
  }
}
