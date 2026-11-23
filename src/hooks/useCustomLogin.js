import { useCallback } from "react";
import { Navigate, createSearchParams, useNavigate } from "react-router-dom";
import { useRecoilState, useResetRecoilState } from "recoil";
import { useQueryClient } from "@tanstack/react-query";
import signinState from "../atoms/signinState";
import { cartState } from "../atoms/cartState";
import { loginPost } from "../api/memberApi";
import { clearMemberSession, emptyMember, saveMemberSession, loadMemberSession } from "../util/memberSession";

const useCustomLogin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loginState, setLoginState] = useRecoilState(signinState);
  const resetState = useResetRecoilState(signinState);
  const resetCartState = useResetRecoilState(cartState);
  const isLogin = Boolean(loginState.email);
  const saveAsCookie = useCallback((data) => {
    queryClient.clear();
    resetCartState();
    saveMemberSession(data, true);
    setLoginState(loadMemberSession());
  }, [queryClient, resetCartState, setLoginState]);
  const doLogout = useCallback(() => {
    clearMemberSession();
    queryClient.clear();
    resetState();
    resetCartState();
  }, [queryClient, resetState, resetCartState]);
  const doLogin = async (param) => {
    setLoginState(current => ({ ...current, status: "loading", error: null }));
    try {
      const data = await loginPost(param);
      if (data.error || !data.email || !data.accessToken || !data.refreshToken) {
        throw Object.assign(new Error("LOGIN_FAILED"), { response: { data: { error: data.error || "ERROR_LOGIN" } } });
      }
      saveAsCookie(data);
      return data;
    } catch (error) {
      doLogout();
      const result = error.response?.data || { error: "LOGIN_UNAVAILABLE" };
      setLoginState({ ...emptyMember, error: result.error });
      return result;
    }
  };
  const moveToPath = useCallback(path => navigate({ pathname: path }, { replace: true }), [navigate]);
  const moveToLogin = useCallback(() => navigate("/member/login", { replace: true }), [navigate]);
  const moveToLoginReturn = () => <Navigate replace to="/member/login" />;
  const exceptionHandle = useCallback((error) => {
    const message = error?.response?.data?.error;
    if (message === "REQUIRE_LOGIN" || message === "ERROR_ACCESS_TOKEN") {
      doLogout();
      navigate({ pathname: "/member/login", search: createSearchParams({ error: "REQUIRE_LOGIN" }).toString() }, { replace: true });
      return true;
    }
    if (message === "ERROR_ACCESSDENIED") {
      alert("해당 메뉴를 사용할 수 있는 권한이 없습니다.");
      navigate("/", { replace: true });
      return true;
    }
    return false;
  }, [doLogout, navigate]);
  return { loginState, isLogin, doLogin, doLogout, moveToPath, moveToLogin, moveToLoginReturn, exceptionHandle, saveAsCookie };
};

export default useCustomLogin;
