import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getCartItems, postChangeCart } from "../api/cartApi";

const initState = { items: [], status: "idle", error: null, owner: "", currentRequestId: null };
const options = {
  condition: (param, { getState }) => getState().cartSlice?.status !== "loading",
  getPendingMeta: (request, { getState }) => ({ email: getState().loginSlice.email }),
};

const loadCart = async (request, rejectWithValue) => {
  try {
    const data = await request();
    if (!Array.isArray(data)) throw new Error("INVALID_CART");
    return data;
  } catch (error) {
    return rejectWithValue({ error: error.response?.data?.error || "CART_UNAVAILABLE" });
  }
};

export const getCartItemsAsync = createAsyncThunk("getCartItemsAsync",
  (param, { rejectWithValue }) => loadCart(getCartItems, rejectWithValue), options);

export const postChangeCartAsync = createAsyncThunk("postCartItemsAsync",
  (param, { rejectWithValue }) => loadCart(() => postChangeCart(param), rejectWithValue), options);

const cartSlice = createSlice({
  name: "cartSlice",
  initialState: initState,
  reducers: {},
  extraReducers: (builder) => {
    for (const action of [getCartItemsAsync, postChangeCartAsync]) {
      builder.addCase(action.pending, (state, action) => {
        if (state.owner !== action.meta.email) state.items = [];
        state.owner = action.meta.email;
        state.status = "loading";
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      }).addCase(action.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.items = action.payload;
        state.status = "idle";
        state.currentRequestId = null;
      }).addCase(action.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = "idle";
        state.error = action.payload?.error || "CART_UNAVAILABLE";
        state.currentRequestId = null;
      });
    }
    builder.addCase("LoginSlice/logout", () => initState)
      .addCase("loginPostAsync/pending", () => initState)
      .addCase("loginPostAsync/rejected", () => initState)
      .addCase("LoginSlice/login", (state, action) => {
        if (state.owner && state.owner !== action.payload.email) return initState;
      });
  },
});

export default cartSlice.reducer;
