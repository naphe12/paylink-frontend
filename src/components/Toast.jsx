import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/** Contexte */
const ToastCtx = createContext({ push: () => {} });

/** Hook pour pousser un toast depuis n'importe où */
export function useToast() {
  return useContext(ToastCtx);
}

/** Stream + provider */
export default function ToastStream() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((msg, { type = "info", duration = 4000 } = {}) => {
    const id = ++idRef.current;
    setToasts((cur) => [...cur, { id, msg, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((cur) => cur.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  return createPortal(
    <ToastCtx.Provider value={{ push }}>
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`min-w-[260px] max-w-[360px] rounded-xl px-4 py-3 shadow-lg border text-sm
              ${
                t.type === "success"
                  ? "bg-green-50 border-green-300 text-green-900"
                  : t.type === "error"
                  ? "bg-red-50 border-red-300 text-red-900"
                  : t.type === "warn"
                  ? "bg-yellow-50 border-yellow-300 text-yellow-900"
                  : "bg-white border-gray-200 text-gray-900"
              }
            `}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>,
    document.body
  );
}
