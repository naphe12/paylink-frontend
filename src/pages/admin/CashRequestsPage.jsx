import { useEffect, useRef, useState } from "react";
import { Check, RefreshCcw, X } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

const statusOptions = [
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuvees" },
  { value: "rejected", label: "Rejetees" },
];

export default function CashRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("pending");
  const [requestType, setRequestType] = useState("withdraw");
  const [loading, setLoading] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [error, setError] = useState("");
  const directDepositIdemRef = useRef(null);
  const decisionIdemRef = useRef({});
  const [decisionLoading, setDecisionLoading] = useState({});

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminCashRequests({
        status,
        type: requestType,
      });
      const list = Array.isArray(data) ? data : [];
      list.sort(
        (a, b) =>
          new Date(b.created_at || b.processed_at || 0).getTime() -
          new Date(a.created_at || a.processed_at || 0).getTime()
      );
      setRequests(list);
    } catch (err) {
      setError(err?.message || "Erreur chargement demandes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [status, requestType]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await api.searchAdminCashUsers(userQuery, 30);
        setUsers(Array.isArray(data) ? data : []);
      } catch {
        setUsers([]);
      }
    };
    loadUsers();
  }, [userQuery]);

  const handleDirectDeposit = async () => {
    setError("");
    if (!selectedUserId || !Number(depositAmount)) {
      alert("Selectionnez un user et un montant valide.");
      return;
    }
    try {
      if (!directDepositIdemRef.current) {
        directDepositIdemRef.current = api.newIdempotencyKey("admin-cash-deposit");
      }
      const res = await api.adminCashDeposit(
        {
          user_id: selectedUserId,
          amount: Number(depositAmount),
        },
        directDepositIdemRef.current
      );
      directDepositIdemRef.current = null;
      alert(`Depot effectue: ${res.amount} ${res.currency} | nouveau solde: ${res.new_balance}`);
      setDepositAmount("");
      fetchRequests();
    } catch (err) {
      setError(err?.message || "Depot impossible.");
    }
  };

  const handleDecision = async (requestId, action) => {
    setError("");
    const note = window.prompt("Ajouter une note (optionnel)") || undefined;
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
          <label className="text-xs uppercase tracking-wide text-slate-500">Depot direct user</label>
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Rechercher user (nom/email/telephone)"
            className="mt-1 border rounded-lg px-3 py-2 text-sm w-full"
          />
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="mt-2 border rounded-lg px-3 py-2 text-sm w-full"
          >
            <option value="">-- selectionner --</option>
            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.full_name || "Sans nom"} - {u.email || "-"} - {u.phone_e164 || "-"}
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
              onClick={handleDirectDeposit}
              className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-600"
            >
              Deposer
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
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left py-3 px-4">Client</th>
              <th className="text-left py-3 px-4">Type</th>
              <th className="text-left py-3 px-4">Montant</th>
              <th className="text-left py-3 px-4">Frais</th>
              <th className="text-left py-3 px-4">Total</th>
              <th className="text-left py-3 px-4">Reference</th>
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
                  <p className="font-semibold text-slate-800">{req.user?.full_name || "-"}</p>
                  <p className="text-xs text-slate-500">{req.user?.email}</p>
                </td>
                <td className="py-3 px-4 capitalize">{req.type}</td>
                <td className="py-3 px-4">EUR {Number(req.amount).toFixed(2)}</td>
                <td className="py-3 px-4">EUR {Number(req.fee_amount).toFixed(2)}</td>
                <td className="py-3 px-4">EUR {Number(req.total_amount).toFixed(2)}</td>
                <td className="py-3 px-4 text-slate-600">
                  {req.provider_name || "-"} {req.mobile_number ? `- ${req.mobile_number}` : ""}
                </td>
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
                    <span className="text-xs text-slate-400">
                      Traite le {new Date(req.processed_at || req.created_at).toLocaleDateString()}
                    </span>
                  )}
                </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td className="py-6 text-center text-slate-500" colSpan={8}>
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
