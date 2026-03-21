// src/App.jsx
import { useEffect } from "react";
import AppRouter from "./AppRouter";
import { Toaster } from "react-hot-toast";
import { bootstrapAuth } from "@/services/authStore";

export default function App() {
  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission().then((permission) => {
        console.log("🔔 Notification permission:", permission);
      });
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
