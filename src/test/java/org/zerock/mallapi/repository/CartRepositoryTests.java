package org.zerock.mallapi.repository;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.zerock.mallapi.domain.*;

@SpringBootTest
@Transactional
class CartRepositoryTests {
  @Autowired CartRepository carts;
  @Autowired CartItemRepository items;
  @Autowired MemberRepository members;
  @Autowired ProductRepository products;

  @Test
  void findsItemByProductAndCartAndProjectsImage() {
    String email = "cart-repository-ch10@aaa.com";
    Member member = members.save(Member.builder().email(email).pw("test").nickname("TEST").build());
    Product product = Product.builder().pname("상품").price(900).build();
    product.addImageString("first.jpg");
    product.addImageString("second.jpg");
    products.save(product);
    Cart cart = carts.save(Cart.builder().owner(member).build());
    CartItem item = items.saveAndFlush(CartItem.builder().cart(cart).product(product).qty(2).build());
    assertEquals(cart.getCno(), carts.getCartOfMember(email).orElseThrow().getCno());
    assertEquals(item.getCino(), items.getItemOfPno(email, product.getPno()).getCino());
    assertEquals(cart.getCno(), items.getCartFromItem(item.getCino()));
    var list = items.getItemsOfCartDTOByCart(cart.getCno());
    assertEquals(1, list.size());
    assertEquals("first.jpg", list.get(0).getImageFile());
    item.changeQty(4);
    items.flush();
    assertEquals(4, items.getItemsOfCartDTOByEmail(email).get(0).getQty());
    items.deleteById(item.getCino());
    items.flush();
    assertTrue(items.getItemsOfCartDTOByCart(cart.getCno()).isEmpty());
  }
}
