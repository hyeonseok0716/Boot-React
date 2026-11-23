package org.zerock.mallapi.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CartItemDTO {
  @NotBlank @Email
  private String email;
  @Positive
  private Long pno;
  @NotNull
  private Integer qty;
  @Positive
  private Long cino;
}
