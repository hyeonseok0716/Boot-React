package org.zerock.mallapi.service;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.zerock.mallapi.dto.PageRequestDTO;
import org.zerock.mallapi.dto.ProductDTO;

@SpringBootTest
@Transactional
class ProductStateTests {
  @Autowired
  ProductService productService;

  @Test
  void modifiesDeletionStateAndExcludesProductFromList() {
    Long pno = productService.register(ProductDTO.builder()
        .pname("State check").pdesc("State check").price(100).build());
    ProductDTO dto = productService.get(pno);
    dto.setDelFlag(true);
    productService.modify(dto);
    assertTrue(productService.get(pno).isDelFlag());
    assertTrue(productService.getList(PageRequestDTO.builder().build()).getDtoList()
        .stream().noneMatch(product -> pno.equals(product.getPno())));
  }
}
