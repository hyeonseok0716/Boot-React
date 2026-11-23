import { Cookies } from "react-cookie";

const cookies = new Cookies();

export const setCookie = (name, value, days) => {
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + days);
  return cookies.set(name, value, {
    path: "/", expires, sameSite: "lax",
    secure: typeof window !== "undefined" && window.location.protocol === "https:",
  });
};

export const getCookie = (name) => {
  try {
    const value = cookies.get(name);
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return undefined;
  }
};

export const removeCookie = (name, path = "/") => {
  cookies.remove(name, { path });
};
