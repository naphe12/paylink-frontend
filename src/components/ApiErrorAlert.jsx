import { useState } from "react";

export default function ApiErrorAlert({
  message,
  onRetry,
  retryLabel = "Reessayer",
  className = "",
}) {
  const [copied, setCopied] = useState(false);
  const [copiedError, setCopiedError] = useState(false);
  if (!message) return null;

  const requestIdMatch = String(message).match(/request_id=([a-zA-Z0-9-]+)/);
  const requestId = requestIdMatch?.[1] || null;
  const canUseClipboard = Boolean(typeof navigator !== "undefined" && navigator.clipboard);
  const canCopy = Boolean(requestId && canUseClipboard);

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

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-3 text-sm ${className}`}>
      <p className="font-medium text-red-700">Une erreur est survenue</p>
      <p className="mt-1 whitespace-pre-wrap text-red-700">{message}</p>
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
    </div>
  );
}
