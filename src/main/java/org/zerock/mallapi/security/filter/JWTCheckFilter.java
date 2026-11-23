package org.zerock.mallapi.security.filter;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;
import java.util.Map;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.zerock.mallapi.dto.MemberDTO;
import org.zerock.mallapi.util.JWTUtil;
import com.google.gson.Gson;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.log4j.Log4j2;

@Log4j2
public class JWTCheckFilter extends OncePerRequestFilter {
  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
    String path = request.getRequestURI();
    return "OPTIONS".equals(request.getMethod()) || "/api/member/login".equals(path)
        || "/api/member/refresh".equals(path) || path.startsWith("/api/products/view/");
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    try {
      String header = request.getHeader("Authorization");
      if (header == null || !header.startsWith("Bearer ") || header.length() <= 7) {
        throw new IllegalArgumentException();
      }
      Map<String, Object> claims = JWTUtil.validateToken(header.substring(7));
      if (!"access".equals(claims.get("tokenType"))) throw new IllegalArgumentException();
      String email = (String) claims.get("email");
      String nickname = (String) claims.get("nickname");
      Boolean social = (Boolean) claims.get("social");
      Object roles = claims.get("roleNames");
      if (email == null || email.isBlank() || social == null || !(roles instanceof List<?>)) {
        throw new IllegalArgumentException();
      }
      List<String> roleNames = ((List<?>) roles).stream().map(String.class::cast).toList();
      MemberDTO memberDTO = new MemberDTO(email, "", nickname, social, roleNames);
      UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(
          memberDTO, null, memberDTO.getAuthorities());
      SecurityContextHolder.getContext().setAuthentication(token);
    } catch (Exception e) {
      SecurityContextHolder.clearContext();
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      response.setContentType("application/json; charset=UTF-8");
      PrintWriter writer = response.getWriter();
      writer.println(new Gson().toJson(Map.of("error", "ERROR_ACCESS_TOKEN")));
      return;
    }
    filterChain.doFilter(request, response);
  }
}
