import { useState } from "react";

import { getConfiguredApiFallbackUrl, getConfiguredApiUrl } from "@/services/api";

export default function ApiErrorAlert({
  message,
  onRetry,
  retryLabel = "Reessayer",
  className = "",
}) {
  const [copied, setCopied] = useState(false);
  const [copiedError, setCopiedError] = useState(false);
  const [diagnostic, setDiagnostic] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);
  if (!message) return null;

  const requestIdMatch = String(message).match(/request_id=([a-zA-Z0-9-]+)/);
  const requestId = requestIdMatch?.[1] || null;
  const canUseClipboard = Boolean(typeof navigator !== "undefined" && navigator.clipboard);
  const canCopy = Boolean(requestId && canUseClipboard);
  const apiUrl = getConfiguredApiUrl();
  const fallbackApiUrl = getConfiguredApiFallbackUrl();
  const isNetworkOrHtmlError =
    String(message).includes("impossible de joindre l'API") ||
    String(message).includes("reponse HTML recue");
  const statusMatch = String(message).match(/->\s*(\d{3})/);
  const statusCode = statusMatch ? Number(statusMatch[1]) : null;
  const isBusiness4xx = Number.isFinite(statusCode) && statusCode >= 400 && statusCode < 500 && !isNetworkOrHtmlError;
  const title = isBusiness4xx ? "Operation refusee" : "Une erreur est survenue";

  const copyRequestId = async () => {
    if (!requestId || !canCopy) return;
    try {
      await navigator.clipboard.writeText(requestId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const copyErrorMessage = async () => {
    if (!canUseClipboard) return;
    try {
      await navigator.clipboard.writeText(String(message));
      setCopiedError(true);
      setTimeout(() => setCopiedError(false), 1500);
    } catch {
      setCopiedError(false);
    }
  };

  const runDiagnostic = async () => {
    const targets = [apiUrl, fallbackApiUrl].filter(Boolean);
    if (targets.length === 0) {
      setDiagnostic({
        status: "error",
        lines: ["Aucune URL API configuree dans la build frontend."],
      });
      return;
    }

    setDiagnosing(true);
    setDiagnostic(null);
    try {
      const lines = [];
      for (const base of [...new Set(targets)]) {
        try {
          const res = await fetch(`${base}/health`, {
            method: "GET",
            headers: { Accept: "application/json" },
          });
          const contentType = (res.headers.get("content-type") || "").toLowerCase();
          if (contentType.includes("application/json")) {
            const body = await res.json();
            lines.push(`${base}/health -> ${res.status} ${JSON.stringify(body)}`);
          } else {
            const text = await res.text();
            lines.push(`${base}/health -> ${res.status} non-JSON: ${text.slice(0, 120)}`);
          }
        } catch (err) {
          lines.push(`${base}/health -> echec reseau (${err?.message || "Failed to fetch"})`);
        }
      }
      setDiagnostic({
        status: "ok",
        lines,
      });
    } finally {
      setDiagnosing(false);
    }
  };

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-3 text-sm ${className}`}>
      <p className="font-medium text-red-700">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-red-700">{message}</p>
      {!isBusiness4xx && (
        <div className="mt-2 space-y-1 text-xs text-red-700">
          <p>API configuree: {apiUrl || "(vide)"}</p>
          {fallbackApiUrl && <p>API fallback: {fallbackApiUrl}</p>}
        </div>
      )}
      <div className="mt-2 flex items-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            {retryLabel}
          </button>
        )}
        {isNetworkOrHtmlError && (
          <button
            type="button"
            onClick={runDiagnostic}
            disabled={diagnosing}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            {diagnosing ? "Diagnostic..." : "Tester /health"}
          </button>
        )}
        {requestId && <span className="text-xs text-red-600">request_id: {requestId}</span>}
        {canCopy && (
          <button
            type="button"
            onClick={copyRequestId}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            {copied ? "Copie" : "Copier request_id"}
          </button>
        )}
        {canUseClipboard && (
          <button
            type="button"
            onClick={copyErrorMessage}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            {copiedError ? "Copie" : "Copier erreur"}
          </button>
        )}
      </div>
      {diagnostic?.lines?.length > 0 && (
        <div className="mt-3 rounded-md border border-red-200 bg-white p-2 text-xs text-red-700">
          {diagnostic.lines.map((line) => (
            <p key={line} className="whitespace-pre-wrap">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
