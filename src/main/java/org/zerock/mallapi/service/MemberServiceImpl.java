package org.zerock.mallapi.service;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.zerock.mallapi.domain.*;
import org.zerock.mallapi.dto.*;
import org.zerock.mallapi.repository.MemberRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {
  private final MemberRepository memberRepository;
  private final PasswordEncoder passwordEncoder;
  private final KakaoClient kakaoClient;

  @Override
  public MemberDTO getKakaoMember(String accessToken) {
    String email = kakaoClient.getEmail(accessToken);
    Member member = memberRepository.getWithRoles(email);
    if (member == null) {
      byte[] random = new byte[32];
      new SecureRandom().nextBytes(random);
      member = Member.builder().email(email).nickname("소셜회원").social(true)
          .pw(passwordEncoder.encode(Base64.getUrlEncoder().withoutPadding().encodeToString(random))).build();
      member.addRole(MemberRole.USER);
      memberRepository.save(member);
    }
    return entityToDTO(member);
  }

  @Override
  public void modifyMember(MemberModifyDTO dto) {
    if (dto.getPw().getBytes(StandardCharsets.UTF_8).length > 72) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PASSWORD_TOO_LONG");
    }
    Member member = memberRepository.getWithRoles(dto.getEmail());
    if (member == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND");
    member.changePw(passwordEncoder.encode(dto.getPw()));
    member.changeNickname(dto.getNickname());
    member.changeSocial(false);
    memberRepository.save(member);
  }
}
