import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, createSearchParams, useNavigate } from "react-router-dom";
import { loginPostAsync, logout } from "../slices/loginSlice";

const useCustomLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const loginState = useSelector(state => state.loginSlice);
  const isLogin = Boolean(loginState.email);

  const doLogin = async (param) => {
    try {
      return await dispatch(loginPostAsync(param)).unwrap();
    } catch (error) {
      return error && typeof error === "object" ? error : { error: "ERROR_LOGIN" };
    }
  };

  const doLogout = () => dispatch(logout());
  const moveToPath = (path) => navigate({ pathname: path }, { replace: true });
  const moveToLogin = () => navigate("/member/login", { replace: true });
  const moveToLoginReturn = () => <Navigate replace to="/member/login" />;

  const exceptionHandle = useCallback((error) => {
    const message = error?.response?.data?.error;
    if (message === "REQUIRE_LOGIN" || message === "ERROR_ACCESS_TOKEN") {
      dispatch(logout());
      navigate({ pathname: "/member/login", search: createSearchParams({ error: "REQUIRE_LOGIN" }).toString() }, { replace: true });
      return true;
    }
    if (message === "ERROR_ACCESSDENIED") {
      alert("해당 메뉴를 사용할 수 있는 권한이 없습니다.");
      navigate("/", { replace: true });
      return true;
    }
    return false;
  }, [dispatch, navigate]);

  return { loginState, isLogin, doLogin, doLogout, moveToPath, moveToLogin, moveToLoginReturn, exceptionHandle };
};

export default useCustomLogin;
