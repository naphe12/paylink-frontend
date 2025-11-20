// src/components/PaymentRequestsList.jsx
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Check, X, Clock } from "lucide-react";

export default function PaymentRequestsList() {
  const [requests, setRequests] = useState([]);

  const fetchRequests = async () => {
    try {
      const data = await api.get("/wallet/transactions");
      const pending = data.filter((tx) => tx.type === "payment_request");
      setRequests(pending);
    } catch (err) {
      console.error("Erreur requêtes:", err);
    }
  };

  const respond = async (id, action) => {
    try {
      await api.post(`/wallet/request/${id}/respond`, { action });
      fetchRequests();
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border w-full max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-[#0b3b64] mb-4 flex items-center gap-2">
        <Clock size={20} /> Demandes en attente
      </h3>

      {requests.length === 0 && <p>Aucune demande de paiement.</p>}
      <ul className="divide-y divide-gray-200">
        {requests.map((r) => (
          <li key={r.transaction_id} className="py-3 flex justify-between items-center">
            <div>
              <p className="font-semibold">{r.details.from} → {r.details.to}</p>
              <p className="text-sm text-gray-500">{r.amount} €</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => respond(r.transaction_id, "accept")} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"><Check size={16} /></button>
              <button onClick={() => respond(r.transaction_id, "decline")} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"><X size={16} /></button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
