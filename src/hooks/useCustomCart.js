import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getCartItemsAsync, postChangeCartAsync } from "../slices/cartSlice";
import useCustomLogin from "./useCustomLogin";

const useCustomCart = () => {
  const cartState = useSelector(state => state.cartSlice);
  const dispatch = useDispatch();
  const { exceptionHandle } = useCustomLogin();
  const handleError = useCallback((error) => {
    if (error?.name !== "ConditionError") exceptionHandle({ response: { data: error } });
    return false;
  }, [exceptionHandle]);
  const refreshCart = useCallback(() => dispatch(getCartItemsAsync()).unwrap().catch(handleError), [dispatch, handleError]);
  const changeCart = useCallback(param => dispatch(postChangeCartAsync(param)).unwrap().catch(handleError), [dispatch, handleError]);
  return { cartItems: cartState.items, cartLoading: cartState.status === "loading", cartError: cartState.error,
    refreshCart, changeCart };
};

export default useCustomCart;
