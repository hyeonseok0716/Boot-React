import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient, useIsMutating } from "@tanstack/react-query";
import { useRecoilState, useRecoilValue } from "recoil";
import { cartState, cartErrorState } from "../atoms/cartState";
import signinState from "../atoms/signinState";
import { getCartItems, postChangeCart } from "../api/cartApi";
import { getSessionVersion, loadMemberSession } from "../util/memberSession";
import useCustomLogin from "./useCustomLogin";

const useCustomCart = () => {
  const [cartItems, setCartItems] = useRecoilState(cartState);
  const [mutationError, setMutationError] = useRecoilState(cartErrorState);
  const member = useRecoilValue(signinState);
  const queryClient = useQueryClient();
  const { exceptionHandle } = useCustomLogin();
  const email = member.email;
  const version = getSessionVersion();
  const key = ["cart", email, version];
  const currentSession = context => context && getSessionVersion() === context.version && loadMemberSession().email === context.email;
  const query = useQuery(key, getCartItems, { enabled: Boolean(email), staleTime: 1000 * 60 * 60 });
  const pending = useIsMutating({ mutationKey: key });
  const changeMutation = useMutation(param => postChangeCart(param), {
    mutationKey: key,
    onMutate: async () => {
      const context = { email, version, key };
      setMutationError(null);
      await queryClient.cancelQueries({ queryKey: key });
      return context;
    },
    onSuccess: (result, param, context) => {
      if (!currentSession(context)) return;
      setCartItems(result);
      queryClient.setQueryData(context.key, result);
    },
    onError: (error, param, context) => { if (currentSession(context)) { setMutationError("CART_UNAVAILABLE"); exceptionHandle(error); } },
  });
  useEffect(() => {
    if (query.data && getSessionVersion() === version && loadMemberSession().email === email) setCartItems(query.data);
  }, [query.data, email, version, setCartItems]);
  useEffect(() => {
    if (query.error) exceptionHandle(query.error);
  }, [query.error, exceptionHandle]);
  const { reset: resetMutation } = changeMutation;
  const { refetch } = query;
  const refreshCart = useCallback(() => {
    resetMutation();
    setMutationError(null);
    return refetch();
  }, [resetMutation, refetch, setMutationError]);
  const changeCart = async (param) => {
    if (query.isFetching || queryClient.isMutating({ mutationKey: key })) return false;
    try { return await changeMutation.mutateAsync(param); } catch { return false; }
  };
  return { cartItems, refreshCart, changeCart, cartLoading: Boolean(email) && (query.isFetching || pending > 0),
    cartError: query.error || mutationError };
};

export default useCustomCart;
