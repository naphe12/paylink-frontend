import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchBackendVersion } from "@/services/api";
import { getFrontendReleaseInfo } from "@/utils/releaseInfo";

const VERSION_CHECK_INTERVAL_MS = 30000;
const RELOAD_DEBOUNCE_MS = 60000;
const UPDATE_BROADCAST_KEY = "paylink:update-version";
const RELOAD_GUARD_KEY = "paylink:last-version-reload-at";

const CRITICAL_PATH_HINTS = [
  "/payment",
  "/payments",
  "/external-transfer",
  "/escrow",
  "/p2p",
  "/checkout",
];

function getLocalVersion() {
  const info = getFrontendReleaseInfo();
  return String(info.version || info.releaseSha || "0.0.0").trim();
}

function getNow() {
  return Date.now();
}

function isSafePath(pathname) {
  const path = String(pathname || "").toLowerCase();
  return !CRITICAL_PATH_HINTS.some((hint) => path.includes(hint));
}

export function useVersionCheck() {
  const localVersion = useMemo(getLocalVersion, []);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState("");
  const [lastCheckAt, setLastCheckAt] = useState(null);
  const [dismissedForVersion, setDismissedForVersion] = useState("");

  const applyRemoteVersion = useCallback(
    (nextVersion) => {
      if (!nextVersion) return;
      if (nextVersion === localVersion) {
        setRemoteVersion(nextVersion);
        setUpdateAvailable(false);
        setDismissedForVersion("");
        return;
      }
      setRemoteVersion(nextVersion);
      if (dismissedForVersion !== nextVersion) {
        setUpdateAvailable(true);
      }
    },
    [dismissedForVersion, localVersion]
  );

  const checkVersion = useCallback(async () => {
    try {
      const data = await fetchBackendVersion();
      const nextVersion = String(data?.version || data?.commit_sha || "").trim();
      setLastCheckAt(getNow());
      applyRemoteVersion(nextVersion);
      if (nextVersion && nextVersion !== localVersion && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            UPDATE_BROADCAST_KEY,
            JSON.stringify({ version: nextVersion, checkedAt: getNow() })
          );
        } catch (error) {
          console.debug("Version broadcast skipped", error);
        }
      }
    } catch (error) {
      setLastCheckAt(getNow());
      console.error("Version check failed", error);
    }
  }, [applyRemoteVersion, localVersion]);

  const reloadNow = useCallback((options = {}) => {
    const force = Boolean(options?.force);
    if (typeof window === "undefined") return;
    const lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    if (!force && getNow() - lastReloadAt < RELOAD_DEBOUNCE_MS) return;
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(getNow()));
    if (force) {
      // Force a real navigation so browser/proxy cache cannot keep stale assets.
      const url = new URL(window.location.href);
      url.searchParams.set("_v", String(getNow()));
      window.location.replace(url.toString());
      return;
    }
    window.location.reload();
  }, []);

  const dismissUpdate = useCallback(() => {
    if (!remoteVersion) return;
    setDismissedForVersion(remoteVersion);
    setUpdateAvailable(false);
  }, [remoteVersion]);

  useEffect(() => {
    checkVersion();

    const interval = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      checkVersion();
    }, VERSION_CHECK_INTERVAL_MS);

    const onStorage = (event) => {
      if (event.key !== UPDATE_BROADCAST_KEY || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue);
        applyRemoteVersion(String(payload?.version || "").trim());
      } catch (error) {
        console.debug("Version broadcast parse failed", error);
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, [applyRemoteVersion, checkVersion]);

  useEffect(() => {
    const autoReloadEnabled = String(import.meta.env.VITE_AUTO_RELOAD_ON_UPDATE || "false").toLowerCase() === "true";
    if (!autoReloadEnabled || !updateAvailable || !remoteVersion) return;
    if (typeof window === "undefined") return;
    if (!isSafePath(window.location.pathname)) return;

    const timeout = window.setTimeout(() => {
      reloadNow();
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [reloadNow, remoteVersion, updateAvailable]);

  return {
    updateAvailable,
    remoteVersion,
    localVersion,
    lastCheckAt,
    reloadNow,
    dismissUpdate,
    isSafeToReloadNow: typeof window === "undefined" ? true : isSafePath(window.location.pathname),
  };
}
