import React, { useEffect } from "react";
import Alert from "./Alert.jsx";

const Toast = ({ message, variant = "success", onClose, autoClose = 5000 }) => {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => {
      onClose && onClose();
    }, autoClose);
    return () => clearTimeout(id);
  }, [message, autoClose, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-96">
      <Alert
        variant={variant}
        dismissible
        onClose={onClose}
        className="shadow-lg"
      >
        {message}
      </Alert>
    </div>
  );
};

export default Toast;
