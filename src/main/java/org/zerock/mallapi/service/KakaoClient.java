package org.zerock.mallapi.service;

import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;

@Component
public class KakaoClient {
  private final RestTemplate rest;
  @Value("${kakao.client-id:}") private String clientId;
  @Value("${kakao.client-secret:}") private String clientSecret;
  @Value("${kakao.redirect-uri:http://localhost:3000/member/kakao}") private String redirectUri;
  @Value("${kakao.authorize-uri:https://kauth.kakao.com/oauth/authorize}") private String authorizeUri;
  @Value("${kakao.token-uri:https://kauth.kakao.com/oauth/token}") private String tokenUri;
  @Value("${kakao.user-info-uri:https://kapi.kakao.com/v2/user/me}") private String userInfoUri;

  public KakaoClient(RestTemplateBuilder builder) {
    rest = builder.setConnectTimeout(Duration.ofSeconds(5)).setReadTimeout(Duration.ofSeconds(10)).build();
  }

  public Map<String, Object> configuration() {
    return Map.of("enabled", !clientId.isBlank(), "clientId", clientId,
        "redirectUri", redirectUri, "authorizeUri", authorizeUri);
  }

  public Map<?, ?> exchangeCode(String code) {
    if (clientId.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "KAKAO_NOT_CONFIGURED");
    if (code == null || code.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_CODE");
    var form = new LinkedMultiValueMap<String, String>();
    form.add("grant_type", "authorization_code");
    form.add("client_id", clientId);
    form.add("redirect_uri", redirectUri);
    form.add("code", code);
    if (!clientSecret.isBlank()) form.add("client_secret", clientSecret);
    var headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
    try {
      Map<?, ?> body = rest.postForObject(tokenUri, new HttpEntity<>(form, headers), Map.class);
      if (body == null || !(body.get("access_token") instanceof String token) || token.isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "KAKAO_INVALID_RESPONSE");
      }
      return Map.of("access_token", body.get("access_token"));
    } catch (HttpClientErrorException e) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "KAKAO_INVALID_CODE");
    } catch (RestClientException e) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "KAKAO_UNAVAILABLE");
    }
  }

  public String getEmail(String accessToken) {
    if (accessToken == null || accessToken.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN");
    var headers = new HttpHeaders();
    headers.setBearerAuth(accessToken);
    try {
      Map<?, ?> body = rest.exchange(userInfoUri, HttpMethod.GET, new HttpEntity<>(headers), Map.class).getBody();
      if (body == null || !(body.get("kakao_account") instanceof Map<?, ?> account)
          || !Boolean.TRUE.equals(account.get("is_email_valid"))
          || !Boolean.TRUE.equals(account.get("is_email_verified"))
          || !(account.get("email") instanceof String email) || email.isBlank()) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "KAKAO_VERIFIED_EMAIL_REQUIRED");
      }
      return email;
    } catch (HttpClientErrorException e) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "KAKAO_INVALID_TOKEN");
    } catch (RestClientException e) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "KAKAO_UNAVAILABLE");
    }
  }
}
