package org.zerock.mallapi.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.zerock.mallapi.domain.Member;
import org.zerock.mallapi.domain.MemberRole;
import org.zerock.mallapi.repository.MemberRepository;
import org.zerock.mallapi.util.CustomJWTException;
import org.zerock.mallapi.util.JWTUtil;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SecurityApiTests {
  @Autowired MockMvc mvc;
  @Autowired MemberRepository memberRepository;
  @Autowired PasswordEncoder passwordEncoder;
  @Autowired ObjectMapper mapper;

  private Map<String, Object> claims(String email) {
    return Map.of("email", email, "nickname", "USER", "social", false, "roleNames", List.of("USER"));
  }

  @BeforeEach
  void setup() {
    Member member = Member.builder().email("security-test@aaa.com")
        .pw(passwordEncoder.encode("1111")).nickname("USER").build();
    member.addRole(MemberRole.USER);
    memberRepository.saveAndFlush(member);
  }

  @Test
  void loginReturnsTokensWithoutPasswordData() throws Exception {
    String json = mvc.perform(post("/api/member/login")
        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
        .param("username", "security-test@aaa.com").param("password", "1111"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").isString())
        .andExpect(jsonPath("$.refreshToken").isString()).andExpect(jsonPath("$.pw").doesNotExist())
        .andExpect(jsonPath("$.password").doesNotExist()).andReturn().getResponse().getContentAsString();
    var body = mapper.readTree(json);
    var access = JWTUtil.validateToken(body.get("accessToken").asText());
    assertEquals("access", access.get("tokenType"));
    assertFalse(access.containsKey("pw"));
    assertEquals("refresh", JWTUtil.validateToken(body.get("refreshToken").asText()).get("tokenType"));
  }

  @Test
  void rejectsWrongPassword() throws Exception {
    mvc.perform(post("/api/member/login").param("username", "security-test@aaa.com").param("password", "wrong"))
        .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error").value("ERROR_LOGIN"));
  }

  @Test
  void protectsProductsWithoutToken() throws Exception {
    mvc.perform(get("/api/products/list")).andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error").value("ERROR_ACCESS_TOKEN"));
  }

  @Test
  void acceptsUserAccessToken() throws Exception {
    String token = JWTUtil.generateToken(claims("security-test@aaa.com"), 10);
    mvc.perform(get("/api/products/list").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.dtoList").isArray());
  }

  @Test
  void rejectsRefreshTokenAsAccessToken() throws Exception {
    String token = JWTUtil.generateToken(claims("security-test@aaa.com"), 1440, "refresh");
    mvc.perform(get("/api/products/list").header("Authorization", "Bearer " + token))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void rejectsTokenWithoutRequiredRole() throws Exception {
    String token = JWTUtil.generateToken(Map.of("email", "security-test@aaa.com", "nickname", "USER",
        "social", false, "roleNames", List.of()), 10);
    mvc.perform(get("/api/products/list").header("Authorization", "Bearer " + token))
        .andExpect(status().isForbidden()).andExpect(jsonPath("$.error").value("ERROR_ACCESSDENIED"));
  }

  @Test
  void refreshKeepsValidTokens() throws Exception {
    String access = JWTUtil.generateToken(claims("security-test@aaa.com"), 10);
    String refresh = JWTUtil.generateToken(claims("security-test@aaa.com"), 1440, "refresh");
    mvc.perform(get("/api/member/refresh").header("Authorization", "Bearer " + access).param("refreshToken", refresh))
        .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").value(access))
        .andExpect(jsonPath("$.refreshToken").value(refresh));
  }

  @Test
  void refreshIssuesNewAccessAfterExpiry() throws Exception {
    String access = JWTUtil.generateToken(claims("security-test@aaa.com"), -1);
    String refresh = JWTUtil.generateToken(claims("security-test@aaa.com"), 1440, "refresh");
    String json = mvc.perform(get("/api/member/refresh").header("Authorization", "Bearer " + access)
        .param("refreshToken", refresh)).andExpect(status().isOk()).andExpect(jsonPath("$.refreshToken").value(refresh))
        .andReturn().getResponse().getContentAsString();
    String renewed = mapper.readTree(json).get("accessToken").asText();
    assertNotEquals(access, renewed);
    assertEquals("security-test@aaa.com", JWTUtil.validateToken(renewed).get("email"));
  }

  @Test
  void rotatesNearlyExpiredRefreshToken() throws Exception {
    String access = JWTUtil.generateToken(claims("security-test@aaa.com"), -1);
    String refresh = JWTUtil.generateToken(claims("security-test@aaa.com"), 30, "refresh");
    String json = mvc.perform(get("/api/member/refresh").header("Authorization", "Bearer " + access)
        .param("refreshToken", refresh)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    String renewed = mapper.readTree(json).get("refreshToken").asText();
    assertNotEquals(refresh, renewed);
    assertEquals("refresh", JWTUtil.validateToken(renewed).get("tokenType"));
  }

  @Test
  void rejectsInvalidAccessEvenWithValidRefresh() throws Exception {
    String refresh = JWTUtil.generateToken(claims("security-test@aaa.com"), 1440, "refresh");
    mvc.perform(get("/api/member/refresh").header("Authorization", "Bearer invalid").param("refreshToken", refresh))
        .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error").exists());
  }

  @Test
  void rejectsExpiredRefreshEvenWithValidAccess() throws Exception {
    String access = JWTUtil.generateToken(claims("security-test@aaa.com"), 10);
    String refresh = JWTUtil.generateToken(claims("security-test@aaa.com"), -1, "refresh");
    mvc.perform(get("/api/member/refresh").header("Authorization", "Bearer " + access).param("refreshToken", refresh))
        .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error").value("Expired"));
  }

  @Test
  void rejectsDifferentMembersTokenPair() throws Exception {
    String access = JWTUtil.generateToken(claims("security-test@aaa.com"), -1);
    String refresh = JWTUtil.generateToken(claims("other@aaa.com"), 1440, "refresh");
    mvc.perform(get("/api/member/refresh").header("Authorization", "Bearer " + access).param("refreshToken", refresh))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void rejectsAccessTokenUsedAsRefresh() throws Exception {
    String access = JWTUtil.generateToken(claims("security-test@aaa.com"), -1);
    String otherAccess = JWTUtil.generateToken(claims("security-test@aaa.com"), 10);
    mvc.perform(get("/api/member/refresh").header("Authorization", "Bearer " + access).param("refreshToken", otherAccess))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void rejectsTamperedExpiredToken() {
    String token = JWTUtil.generateToken(claims("security-test@aaa.com"), -1);
    String[] parts = token.split("\\.");
    parts[2] = (parts[2].startsWith("A") ? "B" : "A") + parts[2].substring(1);
    assertThrows(CustomJWTException.class, () -> JWTUtil.getExpiredClaims(String.join(".", parts)));
  }

  @Test
  void allowsImagesAndPreflightWithoutLogin() throws Exception {
    mvc.perform(get("/api/products/view/missing.jpg")).andExpect(status().isOk());
    mvc.perform(options("/api/products/list").header("Origin", "http://localhost:3000")
        .header("Access-Control-Request-Method", "GET").header("Access-Control-Request-Headers", "Authorization"))
        .andExpect(status().isOk()).andExpect(header().exists("Access-Control-Allow-Origin"));
  }
}
