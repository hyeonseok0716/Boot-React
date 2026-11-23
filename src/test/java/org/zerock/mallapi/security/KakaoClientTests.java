package org.zerock.mallapi.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.zerock.mallapi.service.KakaoClient;

class KakaoClientTests {
  KakaoClient client;
  MockRestServiceServer server;

  @BeforeEach
  void setup() {
    client = new KakaoClient(new RestTemplateBuilder());
    ReflectionTestUtils.setField(client, "clientId", "test-client");
    ReflectionTestUtils.setField(client, "clientSecret", "test-secret");
    ReflectionTestUtils.setField(client, "redirectUri", "http://localhost:3000/member/kakao");
    ReflectionTestUtils.setField(client, "authorizeUri", "https://kauth.kakao.com/oauth/authorize");
    ReflectionTestUtils.setField(client, "tokenUri", "https://kauth.kakao.com/oauth/token");
    ReflectionTestUtils.setField(client, "userInfoUri", "https://kapi.kakao.com/v2/user/me");
    server = MockRestServiceServer.bindTo((RestTemplate) ReflectionTestUtils.getField(client, "rest")).build();
  }

  @Test
  void exchangeIncludesSecretAndReturnsOnlyAccessToken() {
    server.expect(requestTo("https://kauth.kakao.com/oauth/token")).andExpect(method(HttpMethod.POST))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("client_secret=test-secret")))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("grant_type=authorization_code")))
        .andRespond(withSuccess("{\"access_token\":\"fixture-token\",\"refresh_token\":\"private\"}", MediaType.APPLICATION_JSON));
    assertEquals(java.util.Map.of("access_token", "fixture-token"), client.exchangeCode("fixture-code"));
    server.verify();
    assertFalse(client.configuration().containsKey("clientSecret"));
  }

  @Test
  void acceptsVerifiedEmail() {
    server.expect(requestTo("https://kapi.kakao.com/v2/user/me")).andExpect(header("Authorization", "Bearer fixture-token"))
        .andRespond(withSuccess("{\"kakao_account\":{\"email\":\"test@aaa.com\",\"is_email_valid\":true,\"is_email_verified\":true}}", MediaType.APPLICATION_JSON));
    assertEquals("test@aaa.com", client.getEmail("fixture-token"));
    server.verify();
  }

  @Test
  void rejectsUnverifiedEmail() {
    server.expect(anything()).andRespond(withSuccess("{\"kakao_account\":{\"email\":\"test@aaa.com\",\"is_email_valid\":true,\"is_email_verified\":false}}", MediaType.APPLICATION_JSON));
    assertEquals(403, assertThrows(ResponseStatusException.class, () -> client.getEmail("fixture-token")).getStatusCode().value());
  }

  @Test
  void rejectsMissingEmail() {
    server.expect(anything()).andRespond(withSuccess("{\"kakao_account\":{}}", MediaType.APPLICATION_JSON));
    assertEquals(403, assertThrows(ResponseStatusException.class, () -> client.getEmail("fixture-token")).getStatusCode().value());
  }

  @Test
  void handlesInvalidCode() {
    server.expect(anything()).andRespond(withStatus(HttpStatus.BAD_REQUEST));
    assertEquals(401, assertThrows(ResponseStatusException.class, () -> client.exchangeCode("wrong")).getStatusCode().value());
  }

  @Test
  void handlesProviderFailure() {
    server.expect(anything()).andRespond(withServerError());
    assertEquals(502, assertThrows(ResponseStatusException.class, () -> client.getEmail("fixture-token")).getStatusCode().value());
  }
}
