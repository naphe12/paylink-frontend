import { useEffect, useRef, useState } from "react";
import { ArrowDownCircle } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

const agentMobileAccount = import.meta.env.VITE_AGENT_CASH_ACCOUNT || "+257 71 11 11 11";
const bankTransferIban = "DE23 3706 9520 1020 0010 18";
const MOBILE_MONEY_PROVIDERS = [
  {
    provider_code: "lumicash_aggregator",
    provider_channel: "Lumicash",
    currency_code: "BIF",
  },
  {
    provider_code: "ecocash_aggregator",
    provider_channel: "Ecocash",
    currency_code: "BIF",
  },
  {
    provider_code: "enoti_aggregator",
    provider_channel: "eNoti",
    currency_code: "BIF",
  },
];

export default function DepositPage() {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [requests, setRequests] = useState([]);
  const [paymentIntents, setPaymentIntents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [agentAccounts, setAgentAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [depositChannel, setDepositChannel] = useState("mobile_money");
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState(MOBILE_MONEY_PROVIDERS[0].provider_code);
  const [payerIdentifier, setPayerIdentifier] = useState("");
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

  const fetchPaymentIntents = async () => {
    try {
      const data = await api.getPaymentIntents({ limit: 20 });
      setPaymentIntents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Impossible de charger les intents de paiement", err);
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
    fetchPaymentIntents();
  }, []);

  const handleSubmit = async () => {
    setSubmitError("");
    if (!amount || Number(amount) <= 0) {
      alert("Indiquez un montant valide.");
      return;
    }

    setLoading(true);
    try {
      if (depositChannel === "mobile_money") {
        const provider =
          MOBILE_MONEY_PROVIDERS.find((item) => item.provider_code === mobileMoneyProvider) ||
          MOBILE_MONEY_PROVIDERS[0];
        const res = await api.createMobileMoneyDepositIntent({
          amount: Number(amount),
          currency_code: provider.currency_code,
          provider_code: provider.provider_code,
          provider_channel: provider.provider_channel,
          payer_identifier: payerIdentifier.trim() || null,
          note: note?.trim() || null,
        });
        setConfirmation({
          mode: "mobile_money",
          amount: Number(res?.amount ?? amount),
          currency: res?.currency_code || provider.currency_code,
          referenceCode: res?.merchant_reference || null,
          status: res?.status || "created",
          instructions: res?.target_instructions || {},
        });
        fetchPaymentIntents().catch(() => {});
        alert("Intent de depot mobile money cree. Utilisez la reference ci-dessous.");
      } else {
        const selectedAccount = agentAccounts.find((a) => a.id === selectedAccountId) || agentAccounts[0];
        const mergedNote = [note?.trim(), `Depot via transfert bancaire IBAN ${bankTransferIban}`]
          .filter(Boolean)
          .join(" | ") || null;
        if (!idemKeyRef.current) {
          idemKeyRef.current = api.newIdempotencyKey("wallet-cash-deposit");
        }
        const res = await api.requestCashDeposit({
          amount: Number(amount),
          note: mergedNote,
        }, idemKeyRef.current);
        idemKeyRef.current = null;
        const confirmedAmount = Number(res?.amount ?? amount);
        const currency = res?.currency_code || "BIF";
        setConfirmation({
          mode: "bank_transfer",
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
      }
      setAmount("");
      setNote("");
      setPayerIdentifier("");
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
          <h2 className="text-2xl font-semibold text-slate-800">Depots wallet</h2>
          <p className="text-slate-500 text-sm">
            Lumicash sert aux depots locaux en BIF depuis le Burundi. Le virement bancaire reste un depot EUR hors Burundi.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 max-w-xl space-y-4">
        <ApiErrorAlert message={submitError} />
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Montant ({depositChannel === "mobile_money" ? "BIF" : "EUR"})
          </label>
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
            <option value="mobile_money">Mobile money Burundi (BIF)</option>
            <option value="bank_transfer">Virement bancaire hors Burundi (EUR)</option>
          </select>
        </div>

        {depositChannel === "mobile_money" ? (
          <div className="grid gap-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
              Depot local depuis le Burundi. Le wallet est credite en <span className="font-semibold">BIF</span> apres confirmation du paiement provider.
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Provider mobile money</label>
              <select
                value={mobileMoneyProvider}
                onChange={(e) => setMobileMoneyProvider(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {MOBILE_MONEY_PROVIDERS.map((provider) => (
                  <option key={provider.provider_code} value={provider.provider_code}>
                    {provider.provider_channel}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Votre numero mobile (optionnel)</label>
              <select
                value=""
                onChange={() => {}}
                className="hidden"
                disabled
              />
              <input
                value={payerIdentifier}
                onChange={(e) => setPayerIdentifier(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="+25761234567"
              />
              <p className="text-xs text-slate-500">
                Le systeme genere une reference unique et credite automatiquement le wallet BIF a reception du webhook provider.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 space-y-2">
            <p className="text-sm text-slate-700">
              Depot EUR par virement bancaire depuis l'exterieur du Burundi :
            </p>
            <p className="font-mono text-sm text-slate-900 mt-1">{bankTransferIban}</p>
            <p className="text-xs text-slate-500">
              Ce flux reste traite comme une demande de depot a valider, distincte des depots Lumicash BIF.
            </p>
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
                  {confirmation.mode === "mobile_money"
                    ? "Mobile money Burundi (BIF)"
                    : "Virement bancaire hors Burundi (EUR)"}
                </span>
              </p>
              {confirmation.referenceCode && (
                <p className="text-slate-800">
                  Reference: <span className="font-semibold font-mono">{confirmation.referenceCode}</span>
                </p>
              )}
              {confirmation.mode === "mobile_money" ? (
                <>
                  {confirmation.instructions?.merchant_name ? (
                    <p className="text-slate-800">
                      Marchand: <span className="font-semibold">{confirmation.instructions.merchant_name}</span>
                    </p>
                  ) : null}
                  {confirmation.instructions?.merchant_number ? (
                    <p className="text-slate-800">
                      Numero marchand: <span className="font-semibold">{confirmation.instructions.merchant_number}</span>
                    </p>
                  ) : null}
                  <p className="text-slate-700 text-sm mt-2">
                    {confirmation.instructions?.message || "Effectuez le depot mobile money avec cette reference."}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Statut actuel: <span className="font-semibold">{confirmation.status}</span>
                  </p>
                </>
              ) : (
                <p className="text-slate-800">
                  IBAN: <span className="font-semibold font-mono">{confirmation.bankIban}</span>
                </p>
              )}
              {confirmation.mode !== "mobile_money" && (
                <>
                  <p className="text-slate-700 text-sm">
                    Depot hors Burundi: utilisez l'IBAN ci-dessus pour votre virement EUR.
                  </p>
                  {confirmation.agentAccount ? (
                    <p className="text-xs text-slate-500">
                      Contact support si un compte agent local vous est explicitement communique:{" "}
                      <span className="font-semibold">{confirmation.agentAccount}</span>
                    </p>
                  ) : null}
                </>
              )}
              <p className="text-xs text-slate-500 mt-2">
                {confirmation.mode === "mobile_money"
                  ? "Le wallet BIF sera credite automatiquement a confirmation du provider."
                  : "Effectuez le virement EUR puis attendez la validation PesaPaid."}
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
          <h3 className="text-lg font-semibold text-slate-800">Historique des depots EUR hors Burundi</h3>
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

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Depots mobile money automatiques en BIF</h3>
          <button onClick={fetchPaymentIntents} className="text-sm text-blue-600 hover:underline">
            Rafraichir
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left py-2 px-3">Reference</th>
                <th className="text-left py-2 px-3">Montant</th>
                <th className="text-left py-2 px-3">Provider</th>
                <th className="text-left py-2 px-3">Statut</th>
                <th className="text-left py-2 px-3">Cree le</th>
              </tr>
            </thead>
            <tbody>
              {paymentIntents.map((intent) => (
                <tr key={intent.intent_id} className="border-t">
                  <td className="py-2 px-3 text-slate-600 font-mono">{intent.merchant_reference}</td>
                  <td className="py-2 px-3 font-medium text-slate-700">
                    {intent.currency_code} {Number(intent.amount).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-slate-600">{intent.provider_channel || intent.provider_code}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        intent.status === "credited" || intent.status === "settled"
                          ? "bg-green-100 text-green-700"
                          : intent.status === "failed" || intent.status === "cancelled"
                            ? "bg-red-100 text-red-600"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {intent.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-500">{new Date(intent.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {paymentIntents.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan={5}>
                    Aucun depot mobile money automatique pour l'instant.
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
