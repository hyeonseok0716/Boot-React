import axios from "axios";
import { API_SERVER_HOST } from "./apiConfig";

const host = `${API_SERVER_HOST}/api/member`;
export const getKakaoConfig = async () => (await axios.get(`${host}/kakao/config`)).data;

export const getKakaoLoginLink = async () => {
  const config = await getKakaoConfig();
  if (!config.enabled) throw new Error("카카오 로그인 설정이 필요합니다.");
  const state = window.crypto.randomUUID();
  sessionStorage.setItem("kakaoOAuthState", state);
  const url = new URL(config.authorizeUri);
  url.search = new URLSearchParams({ response_type: "code", client_id: config.clientId,
    redirect_uri: config.redirectUri, state }).toString();
  return url.toString();
};

export const getAccessToken = async (authCode) => {
  const res = await axios.post(`${host}/kakao/token`, { code: authCode });
  return res.data.access_token;
};

export const getMemberWithAccessToken = async (accessToken) => {
  const res = await axios.post(`${host}/kakao`, { accessToken });
  return res.data;
};
