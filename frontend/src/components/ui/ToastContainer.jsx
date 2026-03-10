import React from "react";
import { useSelector, useDispatch } from "react-redux";
import Toast from "./Toast.jsx";
import { hideToast } from "../../features/ui/uiSlice.js";

const ToastContainer = () => {
  const dispatch = useDispatch();
  const { message, type } = useSelector(
    (s) => s.ui || { message: null, type: "success" },
  );

  return (
    <Toast
      message={message}
      variant={type}
      onClose={() => dispatch(hideToast())}
      autoClose={5000}
    />
  );
};

export default ToastContainer;
