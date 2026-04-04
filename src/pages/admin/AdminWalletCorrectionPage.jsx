import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCcw, Search, Wallet } from "lucide-react";

import api from "@/services/api";
import useSessionStorageState from "@/hooks/useSessionStorageState";
import { buildUserOptionLabel } from "@/utils/userRecentActivity";

const SCENARIOS = [
  {
    id: "credit_adjustment",
    label: "Credit manuel",
    description: "Ajoute un montant au wallet disponible.",
    amountLabel: "Montant a crediter",
    needsAmount: true,
  },
  {
    id: "debit_adjustment",
    label: "Debit manuel",
    description: "Retire un montant du wallet disponible.",
    amountLabel: "Montant a debiter",
    needsAmount: true,
  },
  {
    id: "set_available_balance",
    label: "Fixer le solde",
    description: "Remet le wallet a un solde disponible cible exact.",
    amountLabel: "Solde cible",
    needsAmount: true,
  },
  {
    id: "clear_negative_balance",
    label: "Remettre a zero un negatif",
    description: "Si le wallet est negatif, applique le credit necessaire pour revenir a zero.",
    amountLabel: "",
    needsAmount: false,
  },
];

function SummaryBox({ label, value, tone = "slate" }) {
  const toneClass = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    rose: "border-rose-200 bg-rose-50 text-rose-950",
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass[tone] || toneClass.slate}`}>
      <p className="text-xs uppercase tracking-[0.22em] opacity-70">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value || "-"}</p>
    </div>
  );
}

export default function AdminWalletCorrectionPage() {
  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useSessionStorageState("admin-wallet-correction:selected-user-id", "");
  const [selectedUser, setSelectedUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [scenario, setScenario] = useState("credit_adjustment");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setUsersLoading(true);
      try {
        const data = await api.getUsers({ q: userSearch.trim(), role: "client" });
        if (!active) return;
        setUsers(Array.isArray(data) ? data : []);
      } catch {
        if (active) setUsers([]);
      } finally {
        if (active) setUsersLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [userSearch]);

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    if (!search) return users;
    return users.filter((user) =>
      [user.full_name, user.email, user.phone, user.phone_e164]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [users, userSearch]);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null);
      setWallets([]);
      setSelectedWalletId("");
      setPreview(null);
      setResult(null);
      return;
    }
    let active = true;
    const loadWallets = async () => {
      setWalletsLoading(true);
      setError("");
      try {
        const [userData, walletsData] = await Promise.all([
          api.getUser(selectedUserId),
          api.getAdminWallets({ user_id: selectedUserId, limit: 50 }),
        ]);
        if (!active) return;
        const normalizedWallets = Array.isArray(walletsData) ? walletsData : [];
        setSelectedUser(userData || null);
        setWallets(normalizedWallets);
        setSelectedWalletId((current) => current || normalizedWallets[0]?.wallet_id || "");
        setPreview(null);
        setResult(null);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Impossible de charger les wallets.");
      } finally {
        if (active) setWalletsLoading(false);
      }
    };
    loadWallets();
    return () => {
      active = false;
    };
  }, [selectedUserId]);

  const selectedWallet = wallets.find((item) => item.wallet_id === selectedWalletId) || null;
  const selectedScenario = SCENARIOS.find((item) => item.id === scenario) || SCENARIOS[0];

  const buildPayload = () => ({
    wallet_id: selectedWalletId,
    scenario,
    ...(selectedScenario.needsAmount
      ? scenario === "set_available_balance"
        ? { ...(amount !== "" ? { target_balance: amount } : {}) }
        : { ...(amount !== "" ? { amount } : {}) }
      : {}),
    reason,
    note,
  });

  const handlePreview = async () => {
    if (!selectedWalletId) return;
    setLoadingPreview(true);
    setError("");
    setResult(null);
    try {
      const data = await api.previewAdminWalletCorrection(buildPayload());
      setPreview(data);
    } catch (err) {
      setPreview(null);
      setError(err?.message || "Impossible de previsualiser la correction.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApply = async () => {
    if (!preview?.can_apply) return;
    setApplying(true);
    setError("");
    try {
      const data = await api.applyAdminWalletCorrection(buildPayload());
      setResult(data);
      setPreview(data.preview || null);
      const refreshedWallets = await api.getAdminWallets({ user_id: selectedUserId, limit: 50 });
      setWallets(Array.isArray(refreshedWallets) ? refreshedWallets : []);
    } catch (err) {
      setError(err?.message || "Impossible d'appliquer la correction.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Administration</p>
            <h1 className="text-2xl font-bold text-slate-900">Correction wallet</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Route de correction admin avec previsualisation obligatoire. La correction met a jour
              le wallet disponible, cree un mouvement wallet et un balance event, sans toucher au
              pending, au bonus ni a la ligne de credit.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Utilise cette page pour des regularisations, pas pour de l'exploitation normale.
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Client cible</p>
            <div className="relative mt-3">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Nom, email, telephone"
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{usersLoading ? "Chargement..." : "Selectionner un client"}</option>
              {filteredUsers.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {buildUserOptionLabel(user, user.user_id)}
                </option>
              ))}
            </select>
            {selectedUser ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{selectedUser.full_name || "Client"}</p>
                <p>{selectedUser.email || "-"}</p>
                <p>{selectedUser.phone_e164 || selectedUser.phone || "-"}</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Wallet cible</p>
            <div className="mt-3 space-y-3">
              {walletsLoading ? (
                <p className="text-sm text-slate-500">Chargement...</p>
              ) : wallets.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Aucun wallet charge.
                </p>
              ) : (
                wallets.map((wallet) => (
                  <button
                    key={wallet.wallet_id}
                    type="button"
                    onClick={() => {
                      setSelectedWalletId(wallet.wallet_id);
                      setPreview(null);
                      setResult(null);
                    }}
                    className={`w-full rounded-2xl border p-4 text-left ${
                      selectedWalletId === wallet.wallet_id
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{String(wallet.type || "").toUpperCase()}</p>
                        <p className="text-xs text-slate-500">{wallet.currency}</p>
                      </div>
                      <Wallet size={18} className="text-slate-400" />
                    </div>
                    <p className="mt-3 text-lg font-bold text-slate-900">
                      {Number(wallet.available || 0).toLocaleString()} {wallet.currency}
                    </p>
                    <p className="text-xs text-slate-500">
                      Pending: {Number(wallet.pending || 0).toLocaleString()} {wallet.currency}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold text-slate-900">Scenario de correction</p>
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

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Scenario</span>
                <input
                  value={selectedScenario.label}
                  disabled
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {selectedScenario.needsAmount ? selectedScenario.amountLabel : "Montant"}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={!selectedScenario.needsAmount}
                  placeholder={selectedScenario.needsAmount ? "0.00" : "Automatique"}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Motif</span>
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ex: regularisation apres replay incomplet legacy"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Note complementaire</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Details operatoires, ticket incident, reference externe..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!selectedWalletId || !reason.trim() || (selectedScenario.needsAmount && amount === "") || loadingPreview}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {loadingPreview ? "Simulation..." : "Previsualiser"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setResult(null);
                  setAmount("");
                  setReason("");
                  setNote("");
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                <RefreshCcw size={15} />
                Reinitialiser
              </button>
            </div>
          </div>

          {selectedWallet ? (
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryBox label="Wallet" value={`${String(selectedWallet.type || "").toUpperCase()} ${selectedWallet.currency}`} tone="slate" />
              <SummaryBox label="Disponible" value={`${Number(selectedWallet.available || 0).toLocaleString()} ${selectedWallet.currency}`} tone="blue" />
              <SummaryBox label="Pending" value={`${Number(selectedWallet.pending || 0).toLocaleString()} ${selectedWallet.currency}`} tone="amber" />
              <SummaryBox label="Alerte" value={selectedWallet.alert || "ok"} tone={selectedWallet.alert === "critical" ? "rose" : "emerald"} />
            </div>
          ) : null}

          {preview ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-900">Previsualisation</p>
                  <p className="text-sm text-slate-500">
                    Le mouvement sera historise comme `{preview.operation_type}`.
                  </p>
                </div>
                {preview.warnings?.length ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
                    <AlertTriangle size={14} />
                    {preview.warnings.length} alerte(s)
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 size={14} />
                    Prete
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <SummaryBox label="Avant" value={`${Number(preview.wallet_before || 0).toLocaleString()} ${preview.currency_code}`} tone="slate" />
                <SummaryBox label="Delta" value={`${Number(preview.signed_delta || 0).toLocaleString()} ${preview.currency_code}`} tone={Number(preview.signed_delta || 0) >= 0 ? "emerald" : "rose"} />
                <SummaryBox label="Apres" value={`${Number(preview.wallet_after || 0).toLocaleString()} ${preview.currency_code}`} tone="blue" />
                <SummaryBox label="Sens" value={preview.direction} tone="amber" />
              </div>

              {preview.implications?.length ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Implications</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    {preview.implications.map((item) => (
                      <p key={item}>- {item}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {preview.warnings?.length ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-amber-900">Points d'attention</p>
                  <div className="mt-3 space-y-2 text-sm text-amber-800">
                    {preview.warnings.map((item) => (
                      <p key={item}>- {item}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying || !preview.can_apply}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {applying ? "Application..." : "Appliquer la correction"}
                </button>
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
              <p className="text-lg font-semibold text-emerald-950">Correction appliquee</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <SummaryBox label="Reference" value={result.reference} tone="emerald" />
                <SummaryBox label="Movement ID" value={result.movement_id} tone="slate" />
                <SummaryBox label="Solde final" value={`${Number(result.wallet?.available || 0).toLocaleString()} ${result.wallet?.currency_code || ""}`.trim()} tone="blue" />
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
