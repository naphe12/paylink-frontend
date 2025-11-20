// src/App.jsx
import { useEffect } from "react";
import AppRouter from "./AppRouter";

export default function App() {
  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission().then((permission) => {
        console.log("🔔 Notification permission:", permission);
      });
    }
  }, []);

  return <AppRouter />;
}
