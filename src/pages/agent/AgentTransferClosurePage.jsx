import { useEffect, useState } from "react";
import { RefreshCcw, CheckCircle } from "lucide-react";
import api from "@/services/api";

export default function AgentTransferClosurePage() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState({});
  const [error, setError] = useState("");

  const loadTransfers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getReadyExternalTransfers();
      setTransfers(data);
    } catch (err) {
      console.error("Erreur chargement transferts clôture:", err);
      setError("Impossible de récupérer les transferts à clôturer.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (transferId) => {
    if (!window.confirm("Confirmer la clôture de ce transfert ?")) return;
    setClosing((prev) => ({ ...prev, [transferId]: true }));
    try {
      await api.completeExternalTransfer(transferId);
      setTransfers((prev) => prev.filter((t) => t.transfer_id !== transferId));
      alert("Transfert clôturé et solde mis à jour !");
    } catch (err) {
      console.error("Erreur clôture transfert:", err);
      alert("Impossible de clôturer le transfert : " + err.message);
    } finally {
      setClosing((prev) => ({ ...prev, [transferId]: false }));
    }
  };

  useEffect(() => {
    loadTransfers();
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow-lg">
        <p>Chargement des transferts...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#0b3b64]">
          Transferts à clôturer
        </h2>
        <button
          onClick={loadTransfers}
          className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
        >
          <RefreshCcw size={16} /> Rafraîchir
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-sm">
          {error}
        </p>
      )}

      {transfers.length === 0 ? (
        <p className="text-gray-500 italic">
          Aucun transfert en attente de clôture.
        </p>
      ) : (
        <div className="space-y-4">
          {transfers.map((transfer) => (
            <div
              key={transfer.transfer_id}
              className="border rounded-xl p-4 shadow-sm bg-slate-50"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-slate-900">
                    {transfer.reference_code || transfer.reference}
                  </p>
                  <p className="text-slate-500">
                    Client : {transfer.user?.full_name || "N/A"}
                  </p>
                  <p className="text-slate-500">
                    Montant :{" "}
                    <span className="font-bold">
                      {Number(transfer.local_amount || transfer.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>{" "}
                    {transfer.currency || transfer.local_currency || "BIF"}
                  </p>
                  <p className="text-slate-500">
                    Destinataire : {transfer.recipient_name} ({transfer.recipient_phone})
                  </p>
                </div>
                <button
                  onClick={() => handleClose(transfer.transfer_id)}
                  disabled={closing[transfer.transfer_id]}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-40"
                >
                  <CheckCircle size={16} />
                  {closing[transfer.transfer_id] ? "Clôture..." : "Clôturer"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
