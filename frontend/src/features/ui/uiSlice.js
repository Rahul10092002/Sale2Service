import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  message: null,
  type: "success",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    showToast(state, action) {
      const { message, type = "success" } = action.payload;
      state.message = message;
      state.type = type;
    },
    hideToast(state) {
      state.message = null;
      state.type = "success";
    },
  },
});

export const { showToast, hideToast } = uiSlice.actions;
export default uiSlice.reducer;
