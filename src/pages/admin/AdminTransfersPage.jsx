import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "@/services/api";

const statusBadge = (status) => {
  const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
  switch (status) {
    case "pending":
    case "initiated":
      return `${base} bg-yellow-100 text-yellow-700`;
    case "failed":
    case "cancelled":
      return `${base} bg-red-100 text-red-700`;
    case "completed":
    case "succeeded":
      return `${base} bg-emerald-100 text-emerald-700`;
    default:
      return `${base} bg-slate-100 text-slate-600`;
  }
};

const STATUS_FILTERS = ["", "pending", "cancelled", "completed"];

function getAgeHours(value) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return 0;
  return (Date.now() - ms) / (60 * 60 * 1000);
}

export default function AdminTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [simulationAmount, setSimulationAmount] = useState("");
  const [simulationCurrency, setSimulationCurrency] = useState("EUR");
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationError, setSimulationError] = useState("");
  const [copyingSimulation, setCopyingSimulation] = useState(false);
  const simulationCardRef = useRef(null);
  const location = useLocation();

  const userId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("user_id") || "";
  }, [location.search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (channel) params.set("channel", channel);
    if (userId) params.set("user_id", userId);
    return params.toString();
  }, [status, channel, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, transfersData] = await Promise.all([
        api.get("/admin/transfers/summary"),
        api.get(`/admin/transfers${queryString ? `?${queryString}` : ""}`),
      ]);
      setSummary(summaryData);
      setTransfers(Array.isArray(transfersData) ? transfersData : []);
    } catch (err) {
      console.error("Erreur chargement transferts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [queryString]);

  useEffect(() => {
    if (userId) {
      setSelectedUserId(userId);
    }
  }, [userId]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await api.searchAdminCashUsers(userSearch, 30);
        setUsers(Array.isArray(data) ? data : []);
      } catch {
        setUsers([]);
      }
    };
    loadUsers();
  }, [userSearch]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) =>
      [u.full_name, u.email, u.phone_e164]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [users, userSearch]);

  const handleSimulation = async () => {
    setSimulationError("");
    if (!selectedUserId || !Number(simulationAmount) || !simulationCurrency.trim()) {
      setSimulationError("Selectionnez un utilisateur, un montant valide et une devise.");
      return;
    }
    setSimulationLoading(true);
    try {
      const data = await api.simulateAdminExternalTransfer({
        user_id: selectedUserId,
        amount: Number(simulationAmount),
        currency: simulationCurrency.trim().toUpperCase(),
      });
      setSimulationResult(data || null);
    } catch (err) {
      setSimulationError(err?.message || "Simulation impossible.");
    } finally {
      setSimulationLoading(false);
    }
  };

  const handleCopySimulationScreenshot = async () => {
    const node = simulationCardRef.current;
    if (!node) {
      setSimulationError("Capture impossible: resultat introuvable.");
      return;
    }
    if (!navigator?.clipboard?.write || typeof window.ClipboardItem === "undefined") {
      setSimulationError("Copie image non supportee par ce navigateur.");
      return;
    }

    setCopyingSimulation(true);
    setSimulationError("");
    try {
      const blob = await renderNodeToPngBlob(node);
      await navigator.clipboard.write([
        new window.ClipboardItem({
          "image/png": blob,
        }),
      ]);
    } catch (err) {
      setSimulationError(err?.message || "Copie de la capture impossible.");
    } finally {
      setCopyingSimulation(false);
    }
  };

  const uniqueChannels = useMemo(() => {
    const set = new Set(transfers.map((t) => t.channel).filter(Boolean));
    return Array.from(set);
  }, [transfers]);

  const staleTransfersCount = transfers.filter(
    (item) => ["pending", "initiated"].includes(String(item.status || "").toLowerCase()) && getAgeHours(item.created_at) >= 2
  ).length;
  const criticalTransfersCount = transfers.filter(
    (item) => ["pending", "initiated"].includes(String(item.status || "").toLowerCase()) && getAgeHours(item.created_at) >= 6
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            Transferts externes
          </h1>
          <p className="text-sm text-slate-500">
            Flux sortants (bank transfer, mobile money, etc.) avec suivi des statuts.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? `Statut : ${s}` : "Tous les statuts"}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option value="">Tous les canaux</option>
            {uniqueChannels.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
          >
            Rafraichir
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Total" value={summary.total} accent="bg-slate-900 text-white" />
          <StatCard label="En attente" value={summary.pending} accent="bg-yellow-100 text-yellow-700" />
          <StatCard label="Reussis" value={summary.succeeded} accent="bg-emerald-100 text-emerald-700" />
          <StatCard label="Echecs" value={summary.failed} accent="bg-red-100 text-red-700" />
        </div>
      )}

      {summary?.pending ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">{summary.pending} transfert(s) en attente de validation</p>
              <p className="text-xs text-amber-800">
                Utilise la page de validations pour approuver les transferts pending avant execution.
              </p>
            </div>
            <Link
              to="/dashboard/admin/transfer-approvals"
              className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-white"
            >
              Ouvrir les validations
            </Link>
          </div>
        </div>
      ) : null}

      {(staleTransfersCount > 0 || criticalTransfersCount > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-wrap items-center gap-4">
            <span>{staleTransfersCount} transfert(s) pending depuis plus de 2h</span>
            {criticalTransfersCount > 0 ? (
              <span className="font-semibold text-red-700">
                {criticalTransfersCount} transfert(s) pending depuis plus de 6h
              </span>
            ) : null}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-white p-5 shadow">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Simulation transfert externe</h2>
            <p className="text-sm text-slate-500">
              Verifie si un client peut envoyer un montant et montre la capacite financiere restante.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Recherche user</span>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Nom, email, telephone"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-1">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Utilisateur</span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Choisir un utilisateur</option>
              {filteredUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name || "Sans nom"} {u.email ? `- ${u.email}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Montant a envoyer</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={simulationAmount}
              onChange={(e) => setSimulationAmount(e.target.value)}
              placeholder="100"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Monnaie</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={simulationCurrency}
                onChange={(e) => setSimulationCurrency(e.target.value.toUpperCase())}
                placeholder="EUR"
                className="w-full rounded-lg border px-3 py-2 text-sm uppercase"
                maxLength={10}
              />
              <button
                onClick={handleSimulation}
                disabled={simulationLoading}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {simulationLoading ? "Simulation..." : "Simuler"}
              </button>
            </div>
          </label>
        </div>
        {simulationError ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {simulationError}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Initiateur</th>
              <th className="p-3 text-left">Reference</th>
              <th className="p-3 text-left">Transaction</th>
              <th className="p-3 text-left">Montant</th>
              <th className="p-3 text-left">Montant local</th>
              <th className="p-3 text-left">Canal</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-left">Creee</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : transfers.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  Aucun transfert avec ces filtres.
                </td>
              </tr>
            ) : (
              transfers.map((tx) => (
                <tr key={tx.tx_id} className="border-t hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-medium text-slate-900">{tx.initiator_name || "Inconnu"}</div>
                    <div className="text-xs text-slate-500">{tx.initiator_email}</div>
                  </td>
                  <td className="p-3 font-mono text-slate-700">{tx.reference_code || "-"}</td>
                  <td className="p-3 font-mono text-slate-700">{tx.tx_id.slice(0, 10)}...</td>
                  <td className="p-3 font-semibold text-slate-900">
                    {Number(tx.amount || 0).toLocaleString()} {tx.currency}
                  </td>
                  <td className="p-3 text-slate-800">
                    {tx.local_amount != null
                      ? `${Number(tx.local_amount).toLocaleString()} ${tx.local_currency || ""}`.trim()
                      : "-"}
                  </td>
                  <td className="p-3 text-slate-600">{tx.channel}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={statusBadge(tx.status)}>{tx.status}</span>
                      {["pending", "initiated"].includes(String(tx.status || "").toLowerCase()) && getAgeHours(tx.created_at) >= 6 ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-700">
                          Urgent
                        </span>
                      ) : ["pending", "initiated"].includes(String(tx.status || "").toLowerCase()) && getAgeHours(tx.created_at) >= 2 ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                          Alerte
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-slate-500">
                    {tx.created_at ? new Date(tx.created_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {simulationResult ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div ref={simulationCardRef} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {simulationResult.possible ? "Transfert possible" : "Transfert refuse"}
                </h3>
                <p className="text-sm text-slate-500">
                  {simulationResult.user?.full_name || "Utilisateur"} {simulationResult.user?.email ? `- ${simulationResult.user.email}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySimulationScreenshot}
                  disabled={copyingSimulation}
                  className="rounded-lg border px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copyingSimulation ? "Copie..." : "Copie ecran"}
                </button>
                <button
                  onClick={() => setSimulationResult(null)}
                  className="rounded-lg border px-3 py-2 text-sm text-slate-600"
                >
                  Fermer
                </button>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5 text-sm">
              <div className={`rounded-xl border px-4 py-3 ${simulationResult.possible ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                <p className="font-medium">
                  {simulationResult.possible
                    ? "Le transfert peut etre execute avec les regles actuelles."
                    : "Le transfert ne peut pas etre execute avec les regles actuelles."}
                </p>
                {Array.isArray(simulationResult.reasons) && simulationResult.reasons.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {simulationResult.reasons.map((reason, index) => (
                      <li key={`${reason}-${index}`}>- {reason}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <h4 className="font-semibold text-slate-900">Simulation</h4>
                  <div className="mt-3 space-y-2 text-slate-700">
                    <p>Montant: <span className="font-medium">{formatMoney(simulationResult.amounts?.amount)} {simulationResult.rule?.requested_currency}</span></p>
                    <p>Frais: <span className="font-medium">{formatMoney(simulationResult.amounts?.fee_amount)} {simulationResult.before?.wallet_currency}</span> ({formatMoney(simulationResult.amounts?.fee_rate)}%)</p>
                    <p>Total a couvrir: <span className="font-medium">{formatMoney(simulationResult.amounts?.total_required)} {simulationResult.before?.wallet_currency}</span></p>
                    <p>Taux FX: <span className="font-medium">{formatMoney(simulationResult.amounts?.fx_rate)}</span></p>
                    <p>Montant recu estime: <span className="font-medium">{formatMoney(simulationResult.amounts?.local_amount)} {simulationResult.rule?.destination_currency}</span></p>
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <h4 className="font-semibold text-slate-900">Regles appliquees</h4>
                  <div className="mt-3 space-y-2 text-slate-700">
                    <p>Devise client: <span className="font-medium">{simulationResult.rule?.sender_currency || "-"}</span></p>
                    <p>Devise demandee: <span className="font-medium">{simulationResult.rule?.requested_currency || "-"}</span></p>
                    <p>Mode financement: <span className="font-medium">{simulationResult.rule?.wallet_bif_credit_only ? "Wallet BIF: credit seul" : "Wallet puis credit"}</span></p>
                    {Array.isArray(simulationResult.refusal_reasons) && simulationResult.refusal_reasons.length > 0 ? (
                      <p>Codes refus: <span className="font-medium">{simulationResult.refusal_reasons.join(", ")}</span></p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <CapacityCard title="Avant transfert" data={simulationResult.before} />
                <CapacityCard title="Apres transfert" data={simulationResult.after} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${accent}`}>
      <p className="text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function formatMoney(value) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function CapacityCard({ title, data }) {
  return (
    <div className="rounded-xl border p-4">
      <h4 className="font-semibold text-slate-900">{title}</h4>
      <div className="mt-3 space-y-2 text-sm text-slate-700">
        <p>Wallet: <span className="font-medium">{formatMoney(data?.wallet_balance)} {data?.wallet_currency}</span></p>
        <p>Credit disponible: <span className="font-medium">{formatMoney(data?.credit_available)} {data?.credit_currency}</span></p>
        <p>Capacite financiere: <span className="font-medium">{formatMoney(data?.financial_capacity)} {data?.wallet_currency}</span></p>
        {"wallet_debit_amount" in (data || {}) ? (
          <p>Debit wallet: <span className="font-medium">{formatMoney(data?.wallet_debit_amount)} {data?.wallet_currency}</span></p>
        ) : null}
        {"credit_used" in (data || {}) ? (
          <p>Credit consomme: <span className="font-medium">{formatMoney(data?.credit_used)} {data?.credit_currency}</span></p>
        ) : null}
      </div>
    </div>
  );
}

async function renderNodeToPngBlob(node) {
  const rect = node.getBoundingClientRect();
  const width = Math.max(Math.ceil(rect.width), 1);
  const height = Math.max(Math.ceil(rect.height), 1);
  const clonedNode = node.cloneNode(true);

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.background = "#ffffff";
  wrapper.style.padding = "0";
  wrapper.appendChild(clonedNode);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">${serialized}</foreignObject>
    </svg>
  `;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas indisponible pour la capture.");
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0);
    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error("Generation PNG impossible."));
      }, "image/png");
    });
    return pngBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Chargement image impossible pour la capture."));
    image.src = src;
  });
}
