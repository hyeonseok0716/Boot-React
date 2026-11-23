import { atom, selector } from "recoil";
import { MEMBER_SESSION_EVENT } from "../util/memberSession";

export const cartState = atom({
  key: "cartState",
  default: [],
  effects: [({ setSelf }) => {
    const sync = event => { if (event.detail.changed) setSelf([]); };
    window.addEventListener(MEMBER_SESSION_EVENT, sync);
    return () => window.removeEventListener(MEMBER_SESSION_EVENT, sync);
  }],
});

export const cartTotalState = selector({
  key: "cartTotalState",
  get: ({ get }) => get(cartState).reduce((total, item) => total + item.price * item.qty, 0),
});

export const cartErrorState = atom({
  key: "cartErrorState",
  default: null,
  effects: [({ setSelf }) => {
    const sync = event => { if (event.detail.changed) setSelf(null); };
    window.addEventListener(MEMBER_SESSION_EVENT, sync);
    return () => window.removeEventListener(MEMBER_SESSION_EVENT, sync);
  }],
});
