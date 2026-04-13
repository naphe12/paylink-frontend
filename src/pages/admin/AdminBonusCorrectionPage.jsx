import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Gift, RefreshCcw, Search } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import useSessionStorageState from "@/hooks/useSessionStorageState";
import api from "@/services/api";
import { buildUserOptionLabel } from "@/utils/userRecentActivity";

const SCENARIOS = [
  { id: "credit_adjustment", label: "Credit bonus", description: "Ajoute un montant au bonus client." },
  { id: "debit_adjustment", label: "Debit bonus", description: "Retire un montant du bonus client." },
];

function formatAmount(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminBonusCorrectionPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useSessionStorageState("admin-bonus-correction:selected-user-id", "");
  const [summary, setSummary] = useState(null);
  const [scenario, setScenario] = useState("credit_adjustment");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  const selectedScenario = useMemo(
    () => SCENARIOS.find((item) => item.id === scenario) || SCENARIOS[0],
    [scenario]
  );

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const content = `${user.full_name || ""} ${user.email || ""} ${user.phone || ""}`.toLowerCase();
      return content.includes(q);
    });
  }, [query, users]);

  const loadUsers = async (search = query) => {
    setUsersLoading(true);
    try {
      const data = await api.getUsers({ q: search.trim() || undefined, role: "client", status: "active" });
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadSummary = async (userId) => {
    if (!userId) {
      setSummary(null);
      return;
    }
    setLoadingSummary(true);
    setError("");
    try {
      const data = await api.getAdminUserBonusBalance(userId);
      setSummary(data || null);
    } catch (err) {
      setSummary(null);
      setError(err?.message || "Impossible de charger le solde bonus.");
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadUsers("");
  }, []);

  useEffect(() => {
    loadSummary(selectedUserId);
  }, [selectedUserId]);

  const payload = () => ({
    user_id: selectedUserId,
    scenario,
    amount: Number(amount || 0),
    reason: reason.trim(),
    note: note.trim() || null,
  });

  const handlePreview = async () => {
    setPreviewLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.previewAdminBonusCorrection(payload());
      setPreview(data || null);
    } catch (err) {
      setPreview(null);
      setError(err?.message || "Impossible de previsualiser la correction bonus.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    setError("");
    try {
      const data = await api.applyAdminBonusCorrection(payload());
      setResult(data || null);
      setPreview(data?.preview || null);
      await loadSummary(selectedUserId);
    } catch (err) {
      setError(err?.message || "Impossible d'appliquer la correction bonus.");
    } finally {
      setApplying(false);
    }
  };

  const canPreview = Boolean(
    selectedUserId &&
      Number(amount || 0) > 0 &&
      reason.trim().length >= 3 &&
      !previewLoading
  );

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
          <Gift size={14} />
          Correction bonus
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Correction bonus client (credit / debit)</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ajuste le `bonus_balance` du client avec previsualisation avant application.
        </p>
      </header>

      <ApiErrorAlert message={error} />

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <p className="text-sm font-semibold text-slate-900">Client cible</p>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom, email, telephone"
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loadUsers(query)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
            >
              Rechercher
            </button>
            <button
              type="button"
              onClick={() => loadUsers("")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              <RefreshCcw size={15} />
              Reset
            </button>
          </div>
          <select
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">
              {usersLoading ? "Chargement..." : "Selectionner un client"}
            </option>
            {filteredUsers.map((user) => (
              <option key={user.user_id} value={user.user_id}>
                {buildUserOptionLabel(user)}
              </option>
            ))}
          </select>

          {summary ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">{summary.full_name || "Client"}</p>
              <p className="text-xs">{summary.email || summary.phone_e164 || "-"}</p>
              <p className="mt-2">
                Bonus actuel: <span className="font-bold">{formatAmount(summary.bonus_balance)} {summary.currency_code || "BIF"}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">{loadingSummary ? "Chargement du solde bonus..." : "Aucun client selectionne."}</p>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold text-slate-900">Parametres correction</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {SCENARIOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setScenario(item.id);
                    setPreview(null);
                    setResult(null);
                  }}
                  className={`rounded-2xl border p-4 text-left ${
                    scenario === item.id ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Scenario</span>
                <input
                  value={selectedScenario.label}
                  disabled
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Montant (BIF)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Motif</span>
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ex: regularisation manuelle bonus"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Note (optionnel)</span>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!canPreview}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {previewLoading ? "Simulation..." : "Previsualiser"}
              </button>
            </div>
          </section>

          {preview ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg font-semibold text-slate-900">Previsualisation correction bonus</p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase text-slate-500">Avant</p>
                  <p className="font-bold">{formatAmount(preview.bonus_before)} {preview.currency_code}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase text-slate-500">Delta</p>
                  <p className="font-bold">{formatAmount(preview.signed_delta)} {preview.currency_code}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase text-slate-500">Apres</p>
                  <p className="font-bold">{formatAmount(preview.bonus_after)} {preview.currency_code}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs uppercase text-slate-500">Sens</p>
                  <p className="font-bold">{preview.direction}</p>
                </div>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying || !preview.can_apply}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {applying ? "Application..." : "Appliquer la correction"}
                </button>
              </div>
            </section>
          ) : null}

          {result ? (
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="inline-flex items-center gap-2 text-emerald-900 font-semibold">
                <CheckCircle2 size={16} />
                Correction bonus appliquee
              </p>
              <p className="mt-2 text-sm text-emerald-900">
                Nouveau solde: <span className="font-bold">{formatAmount(result.bonus_balance)} {result.currency_code}</span>
              </p>
              <p className="text-xs text-emerald-800">Reference: {result.reference_id}</p>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}

