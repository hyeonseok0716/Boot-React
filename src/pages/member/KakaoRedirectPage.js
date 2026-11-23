import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { getAccessToken, getMemberWithAccessToken } from "../../api/kakaoApi";
import { login } from "../../slices/loginSlice";

const KakaoRedirectPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const expected = sessionStorage.getItem("kakaoOAuthState");
    sessionStorage.removeItem("kakaoOAuthState");
    window.history.replaceState(null, "", window.location.pathname);
    if (!expected || expected !== params.get("state") || !params.get("code") || params.get("error")) {
      setError("카카오 로그인이 취소되었거나 요청이 유효하지 않습니다. 다시 로그인해주세요.");
      return;
    }
    getAccessToken(params.get("code")).then(getMemberWithAccessToken).then(member => {
      if (!member.email || !member.accessToken || !member.refreshToken) throw new Error("INVALID_MEMBER");
      dispatch(login(member));
      navigate(member.social ? "/member/modify" : "/", { replace: true });
    }).catch(() => setError("카카오 로그인에 실패했습니다. 이메일 동의 및 카카오 앱 설정을 확인해주세요."));
  }, [dispatch, navigate]);
  return <div className="p-10 text-xl">
    {error ? <><div role="alert">{error}</div><Link to="/member/login">로그인으로 돌아가기</Link></> : "카카오 로그인 처리 중입니다."}
  </div>;
};

export default KakaoRedirectPage;
