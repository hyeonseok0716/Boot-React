package org.zerock.mallapi.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class MemberModifyDTO {
  @NotBlank @Email
  private String email;
  @NotBlank @Size(min = 4, max = 72)
  private String pw;
  @NotBlank @Size(max = 100)
  private String nickname;
}
