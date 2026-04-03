// src/App.jsx
import { useEffect } from "react";
import AppRouter from "./AppRouter";
import { Toaster } from "react-hot-toast";
import { bootstrapAuth } from "@/services/authStore";

export default function App() {
  useEffect(() => {
    const supportsNotifications =
      typeof window !== "undefined" && typeof window.Notification !== "undefined";
    if (supportsNotifications && window.Notification.permission !== "granted") {
      window.Notification.requestPermission()
        .then((permission) => {
          console.log("Notification permission:", permission);
        })
        .catch(() => {});
    }
    bootstrapAuth();
  }, []);

  return (
    <>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
        }}
      />
    </>
  );
}
