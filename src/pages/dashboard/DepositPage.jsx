import { useEffect, useRef, useState } from "react";
import { ArrowDownCircle } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

const agentMobileAccount = import.meta.env.VITE_AGENT_CASH_ACCOUNT || "+257 71 11 11 11";
const bankTransferIban = "DE23 3706 9520 1020 0010 18";

export default function DepositPage() {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [agentAccounts, setAgentAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [depositChannel, setDepositChannel] = useState("mobile_money");
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const idemKeyRef = useRef(null);

  const fetchRequests = async () => {
    try {
      setLoadError("");
      const data = await api.getCashRequests({ type: "deposit" });
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err?.message || "Impossible de charger les demandes.");
    }
  };

  const fetchAgentAccounts = async () => {
    try {
      const data = await api.getAgentAccounts();
      const list = Array.isArray(data) ? data : [];
      setAgentAccounts(list);
      if (list.length && !selectedAccountId) {
        setSelectedAccountId(list[0].id);
      }
    } catch (err) {
      console.error("Impossible de charger les comptes agents", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchAgentAccounts();
  }, []);

  const handleSubmit = async () => {
    setSubmitError("");
    if (!amount || Number(amount) <= 0) {
      alert("Indiquez un montant valide.");
      return;
    }

    const selectedAccount = agentAccounts.find((a) => a.id === selectedAccountId) || agentAccounts[0];
    const channelNote =
      depositChannel === "bank_transfer"
        ? `Depot via transfert bancaire IBAN ${bankTransferIban}`
        : null;
    const mergedNote = [note?.trim(), channelNote].filter(Boolean).join(" | ") || null;

    setLoading(true);
    try {
      if (!idemKeyRef.current) {
        idemKeyRef.current = api.newIdempotencyKey("wallet-cash-deposit");
      }
      const res = await api.requestCashDeposit({
        amount: Number(amount),
        note: mergedNote,
      }, idemKeyRef.current);
      idemKeyRef.current = null;
      setAmount("");
      setNote("");
      const confirmedAmount = Number(res?.amount ?? amount);
      const currency = res?.currency_code || "BIF";
      setConfirmation({
        amount: Number.isFinite(confirmedAmount) ? confirmedAmount : Number(amount),
        currency,
        referenceCode: res?.reference_code || null,
        depositChannel,
        bankIban: bankTransferIban,
        agentAccount: selectedAccount?.account_service || agentMobileAccount,
        agentService: selectedAccount?.service,
      });
      fetchRequests().catch(() => {});
      alert("Demande enregistree. Suivez les instructions de depot ci-dessous.");
    } catch (err) {
      setSubmitError(err?.message || "Erreur depot.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ArrowDownCircle className="text-blue-600" size={32} />
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Demande de depot cash</h2>
          <p className="text-slate-500 text-sm">
            Encodez un depot qui sera valide par un administrateur PesaPaid.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 max-w-xl space-y-4">
        <ApiErrorAlert message={submitError} />
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Montant (EUR)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Ex: 250"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Mode de depot</label>
          <select
            value={depositChannel}
            onChange={(e) => setDepositChannel(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="mobile_money">Mobile money</option>
            <option value="bank_transfer">Transfert bancaire</option>
          </select>
        </div>

        {depositChannel === "mobile_money" ? (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Service / compte agent</label>
            <div className="grid gap-2">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={!agentAccounts.length}
              >
                {agentAccounts.length === 0 && <option value="">Aucun compte agent disponible</option>}
                {agentAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.service} - {acc.account_service}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Envoyez le montant sur le numero mobile de l'agent choisi.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-sm text-slate-700">Transfert bancaire (IBAN):</p>
            <p className="font-mono text-sm text-slate-900 mt-1">{bankTransferIban}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Note (optionnelle)</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Ex: Depot effectue via PesaPaid"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-medium hover:bg-blue-700 transition disabled:opacity-60"
        >
          {loading ? "Envoi..." : "Soumettre la demande"}
        </button>
      </div>

      {confirmation && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-700">Recapitulatif de votre demande</p>
              <p className="text-slate-800 mt-2">
                Montant depose:{" "}
                <span className="font-semibold">
                  {confirmation.currency} {confirmation.amount.toFixed(2)}
                </span>
              </p>
              <p className="text-slate-800">
                Mode de depot:{" "}
                <span className="font-semibold">
                  {confirmation.depositChannel === "bank_transfer" ? "Transfert bancaire" : "Mobile money"}
                </span>
              </p>
              {confirmation.referenceCode && (
                <p className="text-slate-800">
                  Reference: <span className="font-semibold font-mono">{confirmation.referenceCode}</span>
                </p>
              )}
              {confirmation.depositChannel === "bank_transfer" ? (
                <p className="text-slate-800">
                  IBAN: <span className="font-semibold font-mono">{confirmation.bankIban}</span>
                </p>
              ) : (
                <p className="text-slate-800">
                  Compte mobile agent: <span className="font-semibold">{confirmation.agentAccount}</span>
                </p>
              )}
              {confirmation.depositChannel !== "bank_transfer" && confirmation.agentService && (
                <p className="text-slate-700 text-sm">
                  Service: <span className="font-semibold">{confirmation.agentService}</span>
                </p>
              )}
              <p className="text-xs text-slate-500 mt-2">
                Effectuez le depot puis attendez la validation PesaPaid.
              </p>
            </div>
            <button onClick={() => setConfirmation(null)} className="text-xs text-blue-700 hover:underline">
              Fermer
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow p-6">
        <ApiErrorAlert message={loadError} onRetry={fetchRequests} retryLabel="Recharger l'historique" className="mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Historique des depots</h3>
          <button onClick={fetchRequests} className="text-sm text-blue-600 hover:underline">
            Rafraichir
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left py-2 px-3">Reference</th>
                <th className="text-left py-2 px-3">Montant</th>
                <th className="text-left py-2 px-3">Statut</th>
                <th className="text-left py-2 px-3">Note</th>
                <th className="text-left py-2 px-3">Creee le</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.request_id} className="border-t">
                  <td className="py-2 px-3 text-slate-600 font-mono">{req.reference_code || "-"}</td>
                  <td className="py-2 px-3 font-medium text-slate-700">EUR {Number(req.amount).toFixed(2)}</td>
                  <td className="py-2 px-3">
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
                  <td className="py-2 px-3 text-slate-600">{req.note || "-"}</td>
                  <td className="py-2 px-3 text-slate-500">{new Date(req.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan={5}>
                    Aucune demande pour l'instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
