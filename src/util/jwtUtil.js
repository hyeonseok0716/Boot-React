import axios from "axios";
import { getCookie, setCookie } from "./cookieUtil";
import { API_SERVER_HOST } from "../api/apiConfig";
import store from "../store";
import { login, logout } from "../slices/loginSlice";

const jwtAxios = axios.create();
let refreshPromise = null;

const requireLogin = () => Object.assign(new Error("REQUIRE_LOGIN"), {
  response: { status: 401, data: { error: "REQUIRE_LOGIN" } },
});

const refreshJWT = async (accessToken, refreshToken) => {
  const form = new URLSearchParams({ refreshToken });
  const response = await axios.post(`${API_SERVER_HOST}/api/member/refresh`, form, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!response.data.accessToken || !response.data.refreshToken || response.data.error) throw requireLogin();
  return response.data;
};

const beforeReq = (config) => {
  const member = getCookie("member");
  if (!member?.email || !member.accessToken || !member.refreshToken) return Promise.reject(requireLogin());
  config.headers = config.headers || {};
  config.headers.Authorization = `Bearer ${member.accessToken}`;
  return config;
};

const requestFail = (error) => Promise.reject(error);

const retryRequest = async (original) => {
  const member = getCookie("member");
  if (!original || original._retry || !member?.accessToken || !member.refreshToken) {
    store.dispatch(logout());
    throw requireLogin();
  }
  original._retry = true;
  const session = member.refreshToken;
  try {
    if (original.headers.Authorization !== `Bearer ${member.accessToken}`) {
      return await jwtAxios(original);
    }
    if (!refreshPromise) {
      refreshPromise = refreshJWT(member.accessToken, session).then((tokens) => {
        const current = getCookie("member");
        if (!current || current.refreshToken !== session) throw requireLogin();
        const renewed = { ...current, ...tokens };
        setCookie("member", JSON.stringify(renewed), 1);
        store.dispatch(login(renewed));
        return tokens;
      }).finally(() => { refreshPromise = null; });
    }
    const tokens = await refreshPromise;
    original.headers.Authorization = `Bearer ${tokens.accessToken}`;
    return await jwtAxios(original);
  } catch {
    if (getCookie("member")?.refreshToken === session) store.dispatch(logout());
    throw requireLogin();
  }
};

const beforeRes = (response) => {
  if (response.data?.error === "ERROR_ACCESS_TOKEN") return retryRequest(response.config);
  return response;
};

const responseFail = (error) => {
  if (error.response?.status === 401 && error.response?.data?.error === "ERROR_ACCESS_TOKEN") {
    return retryRequest(error.config);
  }
  return Promise.reject(error);
};

jwtAxios.interceptors.request.use(beforeReq, requestFail);
jwtAxios.interceptors.response.use(beforeRes, responseFail);

export default jwtAxios;
