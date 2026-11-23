import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { loginPost } from "../api/memberApi";
import { getCookie, setCookie, removeCookie } from "../util/cookieUtil";

const initState = { email: "", status: "idle", error: null };

const loadMemberCookie = () => {
  const member = getCookie("member");
  if (!member?.email || !member.accessToken || !member.refreshToken) return undefined;
  return { ...member, status: "idle", error: null };
};

export const loginPostAsync = createAsyncThunk("loginPostAsync", async (param, { rejectWithValue }) => {
  try {
    const data = await loginPost(param);
    if (data.error || !data.email || !data.accessToken || !data.refreshToken) {
      return rejectWithValue({ error: data.error || "ERROR_LOGIN" });
    }
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data || { error: "LOGIN_UNAVAILABLE" });
  }
});

const loginSlice = createSlice({
  name: "LoginSlice",
  initialState: () => loadMemberCookie() || { ...initState },
  reducers: {
    login: (state, action) => {
      const member = action.payload;
      setCookie("member", JSON.stringify(member), 1);
      return { ...member, status: "idle", error: null };
    },
    logout: () => {
      removeCookie("member");
      return { ...initState };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loginPostAsync.pending, (state) => {
      state.status = "loading";
      state.error = null;
    }).addCase(loginPostAsync.fulfilled, (state, action) => {
      setCookie("member", JSON.stringify(action.payload), 1);
      return { ...action.payload, status: "idle", error: null };
    }).addCase(loginPostAsync.rejected, (state, action) => {
      removeCookie("member");
      return { ...initState, error: action.payload?.error || "ERROR_LOGIN" };
    });
  },
});

export const { login, logout } = loginSlice.actions;
export default loginSlice.reducer;
