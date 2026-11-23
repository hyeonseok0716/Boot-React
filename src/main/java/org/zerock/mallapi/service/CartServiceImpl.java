package org.zerock.mallapi.service;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.zerock.mallapi.domain.*;
import org.zerock.mallapi.dto.*;
import org.zerock.mallapi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;

@RequiredArgsConstructor
@Service
@Log4j2
public class CartServiceImpl implements CartService {
  private final CartRepository cartRepository;
  private final CartItemRepository cartItemRepository;
  private final ProductRepository productRepository;
  private final MemberRepository memberRepository;

  @Override
  public List<CartItemListDTO> addOrModify(CartItemDTO cartItemDTO) {
    String email = cartItemDTO.getEmail();
    Long pno = cartItemDTO.getPno();
    int qty = cartItemDTO.getQty();
    Long cino = cartItemDTO.getCino();
    if (qty <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_QUANTITY");
    if (cino != null) {
      CartItem cartItem = getOwnedItem(cino, email);
      cartItem.changeQty(qty);
      cartItemRepository.save(cartItem);
      return getCartItems(email);
    }
    if (pno == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PRODUCT_REQUIRED");
    Product product = productRepository.findById(pno)
        .filter(p -> !p.isDelFlag())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND"));
    Cart cart = getCart(email);
    CartItem cartItem = cartItemRepository.getItemOfPno(email, pno);
    if (cartItem == null) {
      cartItem = CartItem.builder().product(product).cart(cart).qty(qty).build();
    } else {
      cartItem.changeQty(qty);
    }
    cartItemRepository.save(cartItem);
    return getCartItems(email);
  }

  private Cart getCart(String email) {
    return cartRepository.getCartOfMember(email).orElseGet(() -> {
      Member member = memberRepository.findById(email)
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND"));
      return cartRepository.save(Cart.builder().owner(member).build());
    });
  }

  private CartItem getOwnedItem(Long cino, String email) {
    if (cino == null || cino <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CART_ITEM_REQUIRED");
    CartItem item = cartItemRepository.findById(cino)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CART_ITEM_NOT_FOUND"));
    if (!item.getCart().getOwner().getEmail().equals(email)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ERROR_ACCESSDENIED");
    }
    return item;
  }

  @Override
  public List<CartItemListDTO> getCartItems(String email) {
    return cartItemRepository.getItemsOfCartDTOByEmail(email);
  }

  @Override
  public List<CartItemListDTO> remove(Long cino, String email) {
    CartItem item = getOwnedItem(cino, email);
    Long cno = item.getCart().getCno();
    cartItemRepository.delete(item);
    cartItemRepository.flush();
    return cartItemRepository.getItemsOfCartDTOByCart(cno);
  }
}
