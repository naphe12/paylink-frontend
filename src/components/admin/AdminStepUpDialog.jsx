import { useEffect, useState } from "react";

export default function AdminStepUpDialog({
  open,
  actionLabel = "Confirmer l'action admin",
  loading = false,
  error = "",
  onClose,
  onConfirm,
}) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setPassword("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900">Confirmation admin</h2>
        <p className="mt-2 text-sm text-slate-500">
          {actionLabel}. Saisissez votre mot de passe admin pour continuer.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe admin"
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          autoFocus
        />

        {error ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(password)}
            disabled={loading || !password.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Verification..." : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
