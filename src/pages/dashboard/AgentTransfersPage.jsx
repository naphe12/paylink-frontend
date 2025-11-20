import { useEffect, useState } from "react";
import api from "@/services/api";

import { CheckCircle, XCircle, RefreshCcw } from "lucide-react";

export default function AgentTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const data = await api.get("/agent/transfers/external/pending");
      setTransfers(data);
    } catch (err) {
      console.error("Erreur chargement transferts :", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Confirmer la validation du transfert ?")) return;

    try {
      await api.post(`/agent/transfers/external/${id}/approve`);
      fetchTransfers();
    } catch (err) {
      alert("Erreur lors de la validation ⚠️");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Confirmer le rejet du transfert ?")) return;

    try {
      await api.post(`/agent/transfers/external/${id}/reject`);
      fetchTransfers();
    } catch (err) {
      alert("Erreur lors du rejet ⚠️");
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  if (loading) return <p>Chargement des transferts...</p>;

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-[#0b3b64]">
          Transferts externes en attente
        </h2>
        <button
          onClick={fetchTransfers}
          className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
        >
          <RefreshCcw size={16} /> Rafraîchir
        </button>
      </div>

      {transfers.length === 0 ? (
        <p className="text-gray-500 italic">Aucun transfert en attente 👍</p>
      ) : (
        <table className="w-full text-left border border-gray-200 rounded-lg">
          <thead className="bg-gray-100 text-sm text-gray-700">
            <tr>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Bénéficiaire</th>
              <th className="px-3 py-2">Montant</th>
              <th className="px-3 py-2">Pays</th>
              <th className="px-3 py-2">Bonus (€)</th>
              <th className="px-3 py-2 text-center">Action</th>
            </tr>
          </thead>

          <tbody className="text-sm">
            {transfers.map((t) => (
              <tr key={t.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{t.user.full_name}</td>
                <td className="px-3 py-2">
                  {t.recipient_name}
                  <br />
                  <span className="text-gray-500 text-xs">{t.recipient_phone}</span>
                </td>
                <td className="px-3 py-2 font-semibold">
                  {Number(t.amount_eur).toFixed(2)}€ →{" "}
                  <span className="text-green-600">
                    {Number(t.amount_bif).toLocaleString()} BIF
                  </span>
                </td>
                <td className="px-3 py-2">{t.country}</td>
                <td className="px-3 py-2 text-blue-600 font-bold">
                  {t.bonus_earned} BIF
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleApprove(t.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs"
                    >
                      <CheckCircle size={14} /> Valider
                    </button>

                    <button
                      onClick={() => handleReject(t.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs"
                    >
                      <XCircle size={14} /> Rejeter
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
