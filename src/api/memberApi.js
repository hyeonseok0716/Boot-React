import axios from "axios";
import { API_SERVER_HOST } from "./apiConfig";

const host = `${API_SERVER_HOST}/api/member`;

export const loginPost = async (loginParam) => {
  const form = new URLSearchParams();
  form.append("username", loginParam.email);
  form.append("password", loginParam.pw);
  const res = await axios.post(`${host}/login`, form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.data;
};
