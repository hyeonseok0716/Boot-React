import { atom } from "recoil";
import { emptyMember, loadMemberSession, MEMBER_SESSION_EVENT } from "../util/memberSession";

const signinState = atom({
  key: "signinState",
  default: emptyMember,
  effects: [({ setSelf, trigger }) => {
    if (trigger === "get") setSelf(loadMemberSession());
    const sync = event => setSelf(event.detail.member);
    window.addEventListener(MEMBER_SESSION_EVENT, sync);
    return () => window.removeEventListener(MEMBER_SESSION_EVENT, sync);
  }],
});

export default signinState;
