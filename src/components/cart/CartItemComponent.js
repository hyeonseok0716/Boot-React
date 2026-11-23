import { API_SERVER_HOST } from "../../api/todoApi";

const host = API_SERVER_HOST;

const CartItemComponent = ({ cino, pname, price, pno, qty, imageFile, changeCart, email, disabled }) => {
  const handleClickQty = amount => changeCart({ email, cino, pno, qty: qty + amount });
  return <li className="border-2" aria-label={`${pname} 장바구니 상품`}>
    <div className="w-full border-2">
      <div className="m-1 p-1">
        <img alt={pname} className="w-full" src={`${host}/api/products/view/${imageFile ? `s_${imageFile}` : "default.jpeg"}`} />
      </div>
      <div className="justify-center p-2 text-xl">
        <div>Cart Item No: {cino}</div>
        <div>Pno: {pno}</div>
        <div>Name: {pname}</div>
        <div>Price: {price}</div>
        <div className="flex items-center">
          <div className="w-2/3">Qty: {qty}</div>
          <div>
            <button type="button" disabled={disabled} aria-label={`${pname} 수량 증가`} className="m-1 p-1 text-2xl bg-orange-500 w-8 rounded-lg" onClick={() => handleClickQty(1)}>+</button>
            <button type="button" disabled={disabled} aria-label={`${pname} 수량 감소`} className="m-1 p-1 text-2xl bg-orange-500 w-8 rounded-lg" onClick={() => handleClickQty(-1)}>-</button>
          </div>
        </div>
        <div className="flex text-white font-bold p-2 justify-center">
          <button type="button" disabled={disabled} aria-label={`${pname} 장바구니 삭제`} className="m-1 p-1 text-xl text-white bg-red-500 w-8 rounded-lg" onClick={() => handleClickQty(-qty)}>X</button>
        </div>
        <div className="font-extrabold border-t-2 text-right m-2 pr-4">{qty * price} 원</div>
      </div>
    </div>
  </li>;
};

export default CartItemComponent;
