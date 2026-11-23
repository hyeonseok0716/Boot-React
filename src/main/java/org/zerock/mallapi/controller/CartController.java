package org.zerock.mallapi.controller;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.zerock.mallapi.dto.*;
import org.zerock.mallapi.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;

@RestController
@RequiredArgsConstructor
@Log4j2
@RequestMapping("/api/cart")
public class CartController {
  private final CartService cartService;

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, String>> error(ResponseStatusException exception) {
    return ResponseEntity.status(exception.getStatusCode()).body(Map.of("error", exception.getReason()));
  }

  @PreAuthorize("hasRole('USER') and #p0.email == authentication.name")
  @PostMapping("/change")
  public List<CartItemListDTO> changeCart(@Valid @RequestBody CartItemDTO itemDTO) {
    if (itemDTO.getQty() <= 0) return cartService.remove(itemDTO.getCino(), itemDTO.getEmail());
    return cartService.addOrModify(itemDTO);
  }

  @PreAuthorize("hasAnyRole('ROLE_USER')")
  @GetMapping("/items")
  public List<CartItemListDTO> getCartItems(Principal principal) {
    return cartService.getCartItems(principal.getName());
  }

  @PreAuthorize("hasAnyRole('ROLE_USER')")
  @DeleteMapping("/{cino}")
  public List<CartItemListDTO> removeFromCart(@PathVariable("cino") Long cino, Principal principal) {
    return cartService.remove(cino, principal.getName());
  }
}
