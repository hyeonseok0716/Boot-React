package org.zerock.mallapi.controller;

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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import org.zerock.mallapi.domain.*;
import org.zerock.mallapi.repository.*;
import org.zerock.mallapi.util.JWTUtil;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CartApiTests {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired MemberRepository members;
  @Autowired ProductRepository products;
  @Autowired CartRepository carts;
  @Autowired CartItemRepository items;
  @Autowired PasswordEncoder encoder;
  final String email = "cart-ch10@aaa.com";
  final String other = "cart-other-ch10@aaa.com";
  Long pno;
  Long noImagePno;

  @BeforeEach
  void setup() {
    for (String user : List.of(email, other)) {
      Member member = Member.builder().email(user).pw(encoder.encode("1111")).nickname("CART TEST").build();
      member.addRole(MemberRole.USER);
      members.save(member);
    }
    Product product = Product.builder().pname("장바구니 상품").pdesc("테스트").price(900).build();
    product.addImageString("first.jpg");
    product.addImageString("second.jpg");
    pno = products.saveAndFlush(product).getPno();
    noImagePno = products.saveAndFlush(Product.builder().pname("이미지 없는 상품").price(100).build()).getPno();
  }

  String token(String user) {
    return "Bearer " + JWTUtil.generateToken(Map.of("email", user, "nickname", "CART TEST", "social", false,
        "roleNames", List.of("USER")), 10);
  }

  ResultActions change(String user, Map<String, Object> body) throws Exception {
    return mvc.perform(post("/api/cart/change").header("Authorization", token(user))
        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body)));
  }

  Long add(String user, Long product, int qty) throws Exception {
    String json = change(user, Map.of("email", user, "pno", product, "qty", qty))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    return mapper.readTree(json).get(0).get("cino").asLong();
  }

  @Test
  void emptyCartReturnsEmptyArrayWithoutCreatingCart() throws Exception {
    mvc.perform(get("/api/cart/items").header("Authorization", token(email)))
        .andExpect(status().isOk()).andExpect(content().json("[]"));
    assertTrue(carts.getCartOfMember(email).isEmpty());
  }

  @Test
  void addsProductWithFirstImageAndReusesItemWhenQuantityChanges() throws Exception {
    Long cino = add(email, pno, 2);
    change(email, Map.of("email", email, "pno", pno, "qty", 4))
        .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].cino").value(cino)).andExpect(jsonPath("$[0].qty").value(4))
        .andExpect(jsonPath("$[0].imageFile").value("first.jpg"))
        .andExpect(jsonPath("$[0].pname").value("장바구니 상품"));
    change(email, Map.of("email", email, "cino", cino, "qty", 3))
        .andExpect(status().isOk()).andExpect(jsonPath("$[0].qty").value(3));
  }

  @Test
  void imageLessProductIsIncludedAndResultsAreNewestFirst() throws Exception {
    Long first = add(email, pno, 1);
    Long second = add(email, noImagePno, 2);
    mvc.perform(get("/api/cart/items").header("Authorization", token(email)))
        .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].cino").value(second)).andExpect(jsonPath("$[0].imageFile").isEmpty())
        .andExpect(jsonPath("$[1].cino").value(first));
  }

  @Test
  void deleteReturnsRemainingItemsAndCanEmptyCart() throws Exception {
    Long first = add(email, pno, 1);
    Long second = add(email, noImagePno, 2);
    mvc.perform(delete("/api/cart/" + first).header("Authorization", token(email)))
        .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].cino").value(second));
    assertFalse(items.existsById(first));
    mvc.perform(delete("/api/cart/" + second).header("Authorization", token(email)))
        .andExpect(status().isOk()).andExpect(content().json("[]"));
  }

  @Test
  void zeroQuantityDeletesItem() throws Exception {
    Long cino = add(email, pno, 2);
    change(email, Map.of("email", email, "cino", cino, "qty", 0))
        .andExpect(status().isOk()).andExpect(content().json("[]"));
    assertFalse(items.existsById(cino));
  }

  @Test
  void rejectsRequestsWithoutAuthentication() throws Exception {
    mvc.perform(get("/api/cart/items")).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/cart/change").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isUnauthorized());
    mvc.perform(delete("/api/cart/1")).andExpect(status().isUnauthorized());
  }

  @Test
  void rejectsRoleWithoutUserPermission() throws Exception {
    String bearer = "Bearer " + JWTUtil.generateToken(Map.of("email", email, "nickname", "CART TEST", "social", false,
        "roleNames", List.of("MANAGER")), 10);
    mvc.perform(get("/api/cart/items").header("Authorization", bearer)).andExpect(status().isForbidden());
  }

  @Test
  void cannotForgeEmailOrReadOtherCart() throws Exception {
    add(other, pno, 2);
    change(email, Map.of("email", other, "pno", pno, "qty", 1)).andExpect(status().isForbidden());
    mvc.perform(get("/api/cart/items").param("email", other).header("Authorization", token(email)))
        .andExpect(status().isOk()).andExpect(content().json("[]"));
  }

  @Test
  void cannotChangeOrDeleteAnotherMembersItem() throws Exception {
    Long cino = add(other, pno, 2);
    change(email, Map.of("email", email, "cino", cino, "qty", 9)).andExpect(status().isForbidden());
    change(email, Map.of("email", email, "cino", cino, "qty", 0)).andExpect(status().isForbidden());
    mvc.perform(delete("/api/cart/" + cino).header("Authorization", token(email)))
        .andExpect(status().isForbidden());
    assertEquals(2, items.findById(cino).orElseThrow().getQty());
  }

  @Test
  void rejectsMissingAndDeletedProductsWithoutCreatingCart() throws Exception {
    change(email, Map.of("email", email, "pno", Long.MAX_VALUE, "qty", 1)).andExpect(status().isNotFound());
    products.findById(pno).orElseThrow().changeDel(true);
    products.flush();
    change(email, Map.of("email", email, "pno", pno, "qty", 1)).andExpect(status().isNotFound());
    assertTrue(carts.getCartOfMember(email).isEmpty());
  }

  @Test
  void rejectsMalformedOrIncompleteChanges() throws Exception {
    change(email, Map.of("email", email, "qty", 1)).andExpect(status().isBadRequest());
    change(email, Map.of("email", email, "qty", 0)).andExpect(status().isBadRequest());
    change(email, Map.of("email", email, "pno", pno)).andExpect(status().isNotAcceptable());
    change(email, Map.of("email", email, "pno", -1, "qty", 1)).andExpect(status().isNotAcceptable());
    mvc.perform(delete("/api/cart/" + Long.MAX_VALUE).header("Authorization", token(email)))
        .andExpect(status().isNotFound());
  }
}
