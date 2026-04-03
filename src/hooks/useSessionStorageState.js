import { useEffect, useState } from "react";

export default function useSessionStorageState(key, initialValue = "") {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = window.sessionStorage.getItem(key);
      return stored ?? initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (value === undefined || value === null || value === "") {
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, String(value));
      }
    } catch {}
  }, [key, value]);

  return [value, setValue];
}
