import { createContext, useCallback, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, { type = "success", duration = 3200 } = {}) => {
    clearTimeout(timerRef.current);
    setToast({ id: Date.now(), message, type });
    timerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      showError: message => showToast(message, { type: "error", duration: 4200 })
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`toast${toast.type === "error" ? " error" : ""}`}>
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

ToastProvider.propTypes = { children: PropTypes.node.isRequired };
