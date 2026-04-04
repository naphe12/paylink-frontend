import { useEffect, useMemo, useRef, useState } from "react";
import { Check, RefreshCcw, X } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import useSessionStorageState from "@/hooks/useSessionStorageState";
import api from "@/services/api";
import { buildUserOptionLabel } from "@/utils/userRecentActivity";

const statusOptions = [
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuvees" },
  { value: "rejected", label: "Rejetees" },
];

function isRecentRequest(createdAt) {
  if (!createdAt) return false;
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return false;
  return Date.now() - createdMs <= 60 * 60 * 1000;
}

function formatDateTime(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

function getAgeHours(value) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return 0;
  return (Date.now() - ms) / (60 * 60 * 1000);
}

export default function CashRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("pending");
  const [requestType, setRequestType] = useState("deposit");
  const [recentOnly, setRecentOnly] = useState(false);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useSessionStorageState("admin-cash-requests:selected-user-id", "");
  const [depositAmount, setDepositAmount] = useState("");
  const [error, setError] = useState("");
  const directDepositIdemRef = useRef(null);
  const decisionIdemRef = useRef({});
  const [decisionLoading, setDecisionLoading] = useState({});
  const stalePendingCount = requests.filter(
    (item) => item.status === "pending" && getAgeHours(item.created_at) >= 2
  ).length;
  const criticalPendingCount = requests.filter(
    (item) => item.status === "pending" && getAgeHours(item.created_at) >= 6
  ).length;
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) =>
      [u.full_name, u.email, u.phone_e164]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [users, userSearch]);

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminCashRequests({
        status,
        type: requestType,
        created_from: createdFrom ? `${createdFrom}T00:00:00` : "",
        created_to: createdTo ? `${createdTo}T23:59:59` : "",
      });
      const list = Array.isArray(data) ? data : [];
      list.sort(
        (a, b) =>
          new Date(b.created_at || b.processed_at || 0).getTime() -
          new Date(a.created_at || a.processed_at || 0).getTime()
      );
      setRequests(recentOnly ? list.filter((item) => isRecentRequest(item.created_at)) : list);
    } catch (err) {
      setError(err?.message || "Erreur chargement demandes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [status, requestType, recentOnly, createdFrom, createdTo]);

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

  const handleDirectCashAction = async () => {
    setError("");
    if (!selectedUserId || !Number(depositAmount)) {
      alert("Selectionnez un user et un montant valide.");
      return;
    }
    const isWithdraw = requestType === "withdraw";
    const note = (window.prompt(`Ajouter une note admin ${isWithdraw ? "pour le retrait" : "pour le depot"} (optionnel)`) || "").trim();
    try {
      if (!directDepositIdemRef.current) {
        directDepositIdemRef.current = api.newIdempotencyKey(isWithdraw ? "admin-cash-withdraw" : "admin-cash-deposit");
      }
      const res = await (isWithdraw ? api.adminCashWithdraw : api.adminCashDeposit)(
        {
          user_id: selectedUserId,
          amount: Number(depositAmount),
          note,
        },
        directDepositIdemRef.current
      );
      directDepositIdemRef.current = null;
      alert(`${isWithdraw ? "Retrait" : "Depot"} effectue: ${res.amount} ${res.currency} | nouveau solde: ${res.new_balance}`);
      setDepositAmount("");
      fetchRequests();
    } catch (err) {
      setError(err?.message || `${isWithdraw ? "Retrait" : "Depot"} impossible.`);
    }
  };

  const handleDecision = async (requestId, action) => {
    setError("");
    const rawNote = window.prompt(
      action === "reject" ? "Ajouter une note (optionnel, un message par defaut sera ajoute sinon)" : "Ajouter une note (optionnel)"
    );
    const note = rawNote?.trim() || undefined;
    const decisionScope = `${action}:${requestId}`;
    try {
      if (!decisionIdemRef.current[decisionScope]) {
        decisionIdemRef.current[decisionScope] = api.newIdempotencyKey(`admin-cash-${action}`);
      }
      setDecisionLoading((prev) => ({ ...prev, [decisionScope]: true }));
      if (action === "approve") {
        await api.approveCashRequest(requestId, { note }, decisionIdemRef.current[decisionScope]);
      } else {
        await api.rejectCashRequest(requestId, { note }, decisionIdemRef.current[decisionScope]);
      }
      delete decisionIdemRef.current[decisionScope];
      setDecisionLoading((prev) => ({ ...prev, [decisionScope]: false }));
      fetchRequests();
    } catch (err) {
      setDecisionLoading((prev) => ({ ...prev, [decisionScope]: false }));
      setError(err?.message || "Action impossible.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Validation cash in/out</h1>
          <p className="text-slate-500 text-sm">
            Suivez les demandes des clients et appliquez les decisions d'encaissement.
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          <RefreshCcw size={16} /> Rafraichir
        </button>
      </header>

      <ApiErrorAlert message={error} onRetry={fetchRequests} retryLabel="Recharger les demandes" />

      {(stalePendingCount > 0 || criticalPendingCount > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-wrap items-center gap-4">
            <span>{stalePendingCount} demande(s) pending depuis plus de 2h</span>
            {criticalPendingCount > 0 ? (
              <span className="font-semibold text-red-700">
                {criticalPendingCount} demande(s) pending depuis plus de 6h
              </span>
            ) : null}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 bg-white rounded-2xl shadow p-4">
        <div className="w-full">
          <label className="text-xs uppercase tracking-wide text-slate-500">Type de demande</label>
          <div className="mt-2 inline-flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setRequestType("deposit")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                requestType === "deposit"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Depots
            </button>
            <button
              type="button"
              onClick={() => setRequestType("withdraw")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                requestType === "withdraw"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Retraits
            </button>
          </div>
        </div>
        <div className="w-full lg:w-auto lg:min-w-[340px]">
          <label className="text-xs uppercase tracking-wide text-slate-500">
            {requestType === "withdraw" ? "Retrait direct user" : "Depot direct user"}
          </label>
          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Rechercher ou filtrer user (nom/email/telephone)"
            className="mt-1 border rounded-lg px-3 py-2 text-sm w-full"
          />
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="mt-2 border rounded-lg px-3 py-2 text-sm w-full"
          >
            <option value="">-- selectionner --</option>
            {filteredUsers.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {buildUserOptionLabel(u)} - {u.email || "-"} - {u.phone_e164 || "-"}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Montant"
              className="border rounded-lg px-3 py-2 text-sm w-full"
            />
            <button
              onClick={handleDirectCashAction}
              className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-600"
            >
              {requestType === "withdraw" ? "Retirer" : "Deposer"}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 border rounded-lg px-3 py-2 text-sm"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Du</label>
          <input
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            className="mt-1 border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Au</label>
          <input
            type="date"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            className="mt-1 border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={recentOnly}
            onChange={(e) => setRecentOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          Recent uniquement
        </label>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left py-3 px-4">Client</th>
              <th className="text-left py-3 px-4">Type</th>
              <th className="text-left py-3 px-4">Reference</th>
              <th className="text-left py-3 px-4">Montant</th>
              <th className="text-left py-3 px-4">Frais</th>
              <th className="text-left py-3 px-4">Total</th>
              <th className="text-left py-3 px-4">Canal / compte</th>
              <th className="text-left py-3 px-4">Note admin</th>
              <th className="text-left py-3 px-4">Statut</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => {
              const requestBusy =
                !!decisionLoading[`approve:${req.request_id}`] ||
                !!decisionLoading[`reject:${req.request_id}`];
              return (
                <tr key={req.request_id} className="border-t">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{req.user?.full_name || "-"}</p>
                    {isRecentRequest(req.created_at) ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                        Recent
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">{req.user?.email}</p>
                  <p className="text-xs text-slate-400">Cree le {formatDateTime(req.created_at)}</p>
                </td>
                <td className="py-3 px-4 capitalize">{req.type}</td>
                <td className="py-3 px-4 text-slate-600 font-mono">{req.reference_code || "-"}</td>
                <td className="py-3 px-4">EUR {Number(req.amount).toFixed(2)}</td>
                <td className="py-3 px-4">EUR {Number(req.fee_amount).toFixed(2)}</td>
                <td className="py-3 px-4">EUR {Number(req.total_amount).toFixed(2)}</td>
                <td className="py-3 px-4 text-slate-600">
                  {req.provider_name || "-"} {req.mobile_number ? `- ${req.mobile_number}` : ""}
                </td>
                <td className="py-3 px-4 text-slate-600">{req.admin_note || "-"}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      req.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : req.status === "rejected"
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {req.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {req.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        disabled={requestBusy}
                        onClick={() => handleDecision(req.request_id, "approve")}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check size={14} /> Valider
                      </button>
                      <button
                        disabled={requestBusy}
                        onClick={() => handleDecision(req.request_id, "reject")}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-red-100 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X size={14} /> Rejeter
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">
                      <div>Traite le {formatDateTime(req.processed_at || req.created_at)}</div>
                      {req.processed_by_admin?.full_name || req.processed_by_admin?.email ? (
                        <div>
                          Par {req.processed_by_admin?.full_name || req.processed_by_admin?.email}
                        </div>
                      ) : null}
                    </div>
                  )}
                </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td className="py-6 text-center text-slate-500" colSpan={10}>
                  {loading ? "Chargement..." : "Aucune demande pour ce filtre."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
