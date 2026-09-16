import { createContext, useContext, useState } from "react";

import "./ToastContext.css";

const ToastContext = createContext(null);

function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  function showToast(message, type = "success") {
    setToast({
      message,
      type,
    });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </ToastContext.Provider>
  );
}

function useToast() {
  return useContext(ToastContext);
}

export { ToastProvider, useToast };
