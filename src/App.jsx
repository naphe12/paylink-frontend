// src/App.jsx
import { useEffect } from "react";
import AppRouter from "./AppRouter";
import { Toaster } from "react-hot-toast";
import { bootstrapAuth } from "@/services/authStore";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { useVersionCheck } from "@/hooks/useVersionCheck";

export default function App() {
  const { updateAvailable, remoteVersion, localVersion, reloadNow, dismissUpdate, isSafeToReloadNow } =
    useVersionCheck();

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
    <AppErrorBoundary>
      <>
        <AppRouter />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
          }}
        />
        {updateAvailable ? (
          <div className="fixed bottom-4 right-4 z-[70] w-[min(92vw,380px)] rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-50 shadow-2xl">
            <p className="text-sm font-semibold">Nouvelle version disponible</p>
            <p className="mt-1 text-xs text-slate-300">
              Version serveur: {remoteVersion || "?"} | locale: {localVersion || "?"}
            </p>
            {!isSafeToReloadNow ? (
              <p className="mt-2 text-xs text-amber-300">
                Page sensible detectee. Termine l'operation en cours avant actualisation.
              </p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => reloadNow({ force: true })}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                Actualiser
              </button>
              <button
                type="button"
                onClick={dismissUpdate}
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Plus tard
              </button>
            </div>
          </div>
        ) : null}
      </>
    </AppErrorBoundary>
  );
}
