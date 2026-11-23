import { useEffect, useMemo } from "react";
import useCustomLogin from "../../hooks/useCustomLogin";
import useCustomCart from "../../hooks/useCustomCart";
import CartItemComponent from "../cart/CartItemComponent";

const CartComponent = () => {
  const { isLogin, loginState } = useCustomLogin();
  const { refreshCart, cartItems, changeCart, cartLoading, cartError } = useCustomCart();
  const total = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.qty, 0), [cartItems]);
  useEffect(() => {
    if (isLogin) refreshCart();
  }, [isLogin, loginState.email, refreshCart]);
  return <div className="w-full">
    {isLogin && <div className="flex flex-col">
      <div className="w-full flex">
        <div className="font-extrabold text-2xl w-4/5">{loginState.nickname}'s Cart</div>
        <div aria-label="장바구니 상품 종류 수" className="bg-orange-600 text-center text-white font-bold w-1/5 rounded-full m-1">{cartItems.length}</div>
      </div>
      {cartLoading && <div role="status">장바구니 처리 중...</div>}
      {cartError && <div role="alert" className="my-2 text-red-700">
        장바구니 요청을 처리하지 못했습니다.
        <button type="button" disabled={cartLoading} onClick={refreshCart} className="m-2 underline">다시 시도</button>
      </div>}
      <ul aria-label="장바구니 상품 목록">
        {cartItems.map(item => <CartItemComponent {...item} key={item.cino} changeCart={changeCart} email={loginState.email} disabled={cartLoading} />)}
      </ul>
      <div className="text-2xl text-right font-extrabold">TOTAL: {total}</div>
    </div>}
  </div>;
};

export default CartComponent;
