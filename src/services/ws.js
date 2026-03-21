import { getConfiguredApiUrl } from "@/services/api";

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

export function getConfiguredWsBase() {
  const explicit = normalizeBaseUrl(import.meta.env.VITE_WS_URL || "");
  if (explicit) {
    return explicit;
  }

  const apiBase = normalizeBaseUrl(getConfiguredApiUrl());
  if (apiBase.startsWith("https://")) {
    return `wss://${apiBase.slice("https://".length)}`;
  }
  if (apiBase.startsWith("http://")) {
    return `ws://${apiBase.slice("http://".length)}`;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }

  return "ws://127.0.0.1:8000";
}

export function resolveWsUrl(path) {
  const base = getConfiguredWsBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
