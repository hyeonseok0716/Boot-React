package org.zerock.mallapi.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.zerock.mallapi.domain.*;
import org.zerock.mallapi.repository.MemberRepository;
import org.zerock.mallapi.service.KakaoClient;
import org.zerock.mallapi.util.JWTUtil;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SocialApiTests {
  @Autowired MockMvc mvc;
  @Autowired MemberRepository repository;
  @Autowired PasswordEncoder encoder;
  @Autowired ObjectMapper mapper;
  @MockBean KakaoClient kakaoClient;
  private final String email = "chapter9-test@aaa.com";

  @BeforeEach
  void setup() {
    when(kakaoClient.getEmail("provider-token")).thenReturn(email);
  }

  String bearer(String user) {
    return "Bearer " + JWTUtil.generateToken(Map.of("email", user, "nickname", "USER", "social", true,
        "roleNames", List.of("USER")), 10);
  }

  @Test
  void socialLoginCreatesMemberAndTypedTokensWithoutPasswords() throws Exception {
    String json = mvc.perform(post("/api/member/kakao").contentType(MediaType.APPLICATION_JSON)
        .content("{\"accessToken\":\"provider-token\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.social").value(true))
        .andExpect(jsonPath("$.pw").doesNotExist()).andReturn().getResponse().getContentAsString();
    var body = mapper.readTree(json);
    assertEquals("refresh", JWTUtil.validateToken(body.get("refreshToken").asText()).get("tokenType"));
    assertEquals("access", JWTUtil.validateToken(body.get("accessToken").asText()).get("tokenType"));
    assertEquals(List.of(MemberRole.USER), repository.getWithRoles(email).getMemberRoleList());
  }

  @Test
  void existingMemberIsReused() throws Exception {
    repository.save(Member.builder().email(email).pw(encoder.encode("1111")).nickname("기존회원").social(false).build());
    mvc.perform(post("/api/member/kakao").contentType(MediaType.APPLICATION_JSON)
        .content("{\"accessToken\":\"provider-token\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.social").value(false))
        .andExpect(jsonPath("$.nickname").value("기존회원"));
  }

  @Test
  void modifyRequiresLogin() throws Exception {
    mvc.perform(put("/api/member/modify").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void cannotModifyAnotherMember() throws Exception {
    mvc.perform(put("/api/member/modify").header("Authorization", bearer("other@aaa.com"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"chapter9-test@aaa.com\",\"pw\":\"2222\",\"nickname\":\"변경\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void modifiesSelfAndAllowsNewPasswordLogin() throws Exception {
    Member member = Member.builder().email(email).pw(encoder.encode("1111")).nickname("소셜회원").social(true).build();
    member.addRole(MemberRole.USER);
    repository.saveAndFlush(member);
    mvc.perform(put("/api/member/modify").header("Authorization", bearer(email))
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"chapter9-test@aaa.com\",\"pw\":\"2222\",\"nickname\":\"새닉네임\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.result").value("modified"));
    assertTrue(encoder.matches("2222", repository.getWithRoles(email).getPw()));
    assertFalse(repository.getWithRoles(email).isSocial());
    mvc.perform(post("/api/member/login").param("username", email).param("password", "2222"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.nickname").value("새닉네임"));
  }

  @Test
  void providerUnavailableKeepsBadGatewayStatus() throws Exception {
    when(kakaoClient.exchangeCode("unavailable")).thenThrow(new org.springframework.web.server.ResponseStatusException(
        org.springframework.http.HttpStatus.BAD_GATEWAY, "KAKAO_UNAVAILABLE"));
    mvc.perform(post("/api/member/kakao/token").contentType(MediaType.APPLICATION_JSON)
        .content("{\"code\":\"unavailable\"}"))
        .andExpect(status().isBadGateway()).andExpect(jsonPath("$.error").value("KAKAO_UNAVAILABLE"));
  }

  @Test
  void rejectsBlankPassword() throws Exception {
    mvc.perform(put("/api/member/modify").header("Authorization", bearer(email))
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"chapter9-test@aaa.com\",\"pw\":\"\",\"nickname\":\"변경\"}"))
        .andExpect(status().isNotAcceptable());
  }
}
