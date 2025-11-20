import { useEffect, useState } from "react";
import api from "@/services/api";
import { CheckCircle, RefreshCcw, AlertTriangle } from "lucide-react";

function normalizeTransfer(transfer) {
  const id = transfer.transfer_id || transfer.id;
  const rawLocalAmount =
    transfer.local_amount ??
    transfer.metadata?.local_amount ??
    null;

  return {
    id,
    reference: transfer.reference_code || transfer.reference || id,
    partner: transfer.partner_name || transfer.partner || "N/A",
    recipient: transfer.recipient_name || transfer.metadata?.recipient_name,
    recipientPhone:
      transfer.recipient_phone || transfer.metadata?.recipient_phone,
    amount: Number(transfer.amount || 0),
    localAmount:
      rawLocalAmount !== null ? Number(rawLocalAmount) : null,
    localCurrency:
      transfer.metadata?.local_currency ||
      transfer.local_currency ||
      transfer.metadata?.payout_currency ||
      "BIF",
    currency: transfer.currency || transfer.metadata?.currency || "EUR",
    createdAt: transfer.created_at || transfer.createdAt,
    status: transfer.status,
    userName: transfer.user?.full_name || transfer.user_name,
    userEmail: transfer.user?.email || transfer.user_email,
  };
}

export default function ExternalTransferApprovalsPage() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState({});

  const fetchTransfers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPendingExternalTransfers();
      const mapped = Array.isArray(data) ? data.map(normalizeTransfer) : [];
      setTransfers(mapped);
    } catch (err) {
      setError(err.message || "Impossible de charger les transferts en attente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const approve = async (transferId) => {
    setApproving((prev) => ({ ...prev, [transferId]: true }));
    try {
      await api.approveExternalTransfer(transferId);
      setTransfers((prev) => prev.filter((t) => t.id !== transferId));
    } catch (err) {
      setError(
        err.message ||
          "La validation a échoué; merci de réessayer ou de vérifier les logs."
      );
    } finally {
      setApproving((prev) => ({ ...prev, [transferId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Approvals transferts externes
          </h1>
          <p className="text-sm text-slate-500">
            Validez les demandes en attente avant exécution chez le partenaire.
          </p>
        </div>
        <button
          onClick={fetchTransfers}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
        >
          <RefreshCcw size={16} /> Rafraichir
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-center text-slate-500">
          Chargement des transferts en attente...
        </div>
      ) : transfers.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-center text-slate-500">
          Aucun transfert externe en attente.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Réf.</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Bénéficiaire</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Montant reçu</th>
                <th className="px-4 py-3">Partenaire</th>
                <th className="px-4 py-3">Crée le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((transfer) => (
                <tr key={transfer.id} className="text-slate-700">
                  <td className="px-4 py-3 font-semibold">
                    {transfer.reference}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span>{transfer.userName || "Utilisateur"}</span>
                      <span className="text-xs text-slate-500">
                        {transfer.userEmail}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span>{transfer.recipient || "N/A"}</span>
                      <span className="text-xs text-slate-500">
                        {transfer.recipientPhone}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {transfer.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {transfer.currency}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">
                    {transfer.localAmount !== null
                      ? `${transfer.localAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })} ${transfer.localCurrency}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{transfer.partner}</td>
                  <td className="px-4 py-3">
                    {transfer.createdAt
                      ? new Date(transfer.createdAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => approve(transfer.id)}
                      disabled={!!approving[transfer.id]}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle size={14} />
                      {approving[transfer.id] ? "Validation..." : "Valider"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5" />
          <p>
            La validation interne confirme uniquement que le transfert peut être
            soumis au partenaire (Lumicash, banques...). Assurez-vous d'avoir
            effectué les vérifications KYC/AML nécessaires.
          </p>
        </div>
      </div>
    </div>
  );
}
