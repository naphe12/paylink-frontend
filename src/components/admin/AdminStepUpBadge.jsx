export default function AdminStepUpBadge({ enabled, expiresInSeconds, headerFallbackEnabled }) {
  if (!enabled) return null;
  const minutes = Math.max(1, Math.round(Number(expiresInSeconds || 0) / 60));
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      Confirmation admin forte active. Un mot de passe sera demande pour les actions critiques.
      {minutes ? ` Jeton valable ~${minutes} min.` : ""}
      {headerFallbackEnabled ? " Attention: fallback header encore autorise." : ""}
    </div>
  );
}
