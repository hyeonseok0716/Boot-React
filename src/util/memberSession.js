import { getCookie, setCookie, removeCookie } from "./cookieUtil";
import queryClient from "./queryClient";

export const MEMBER_SESSION_EVENT = "mall-member-session";
export const emptyMember = { email: "", nickname: "", social: false, accessToken: "", refreshToken: "", status: "idle", error: null };
let sessionVersion = 0;
export const getSessionVersion = () => sessionVersion;

export const loadMemberSession = () => {
  const member = getCookie("member");
  return member?.email && member.accessToken && member.refreshToken ? { ...member, status: "idle", error: null } : { ...emptyMember };
};

const publish = (member, changed) => {
  if (changed) {
    sessionVersion += 1;
    queryClient.clear();
  }
  window.dispatchEvent(new CustomEvent(MEMBER_SESSION_EVENT, { detail: { member, changed } }));
};

export const saveMemberSession = (member, newSession = false) => {
  const changed = newSession || loadMemberSession().email !== member.email;
  const data = { email: member.email, nickname: member.nickname, social: member.social,
    roleNames: member.roleNames || [], accessToken: member.accessToken, refreshToken: member.refreshToken };
  setCookie("member", JSON.stringify(data), 1);
  publish({ ...data, status: "idle", error: null }, changed);
};

export const clearMemberSession = () => {
  removeCookie("member");
  publish({ ...emptyMember }, true);
};
