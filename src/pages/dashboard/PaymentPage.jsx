// src/pages/PaymentPage.jsx
import { useEffect, useState } from "react";
import api from "@/services/api";

import { Send, PlusCircle } from "lucide-react";

export default function PaymentPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");

  // 🔹 Charger les demandes de paiement existantes
  const fetchRequests = async () => {
    try {
      const data = await api.get("/wallet/requests");
      setRequests(data);
    } catch (err) {
      console.error("Erreur chargement demandes :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // 🔹 Créer une nouvelle demande
  const createRequest = async () => {
    if (!amount || !receiverEmail) return alert("Veuillez remplir tous les champs.");
    try {
      await api.post("/wallet/request", {
        amount: Number(amount),
        receiver_email: receiverEmail,
      });
      alert("✅ Demande envoyée !");
      setAmount("");
      setReceiverEmail("");
      fetchRequests();
    } catch (err) {
      alert("Erreur création demande : " + err.message);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#0b3b64] mb-6 flex items-center gap-2">
        <Send /> Demandes de paiement
      </h2>

      {/* Formulaire nouvelle demande */}
      <div className="bg-white p-5 rounded-2xl shadow mb-6">
        <h3 className="font-semibold mb-3">Créer une nouvelle demande</h3>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Email du destinataire"
            value={receiverEmail}
            onChange={(e) => setReceiverEmail(e.target.value)}
            className="border rounded-lg px-3 py-2 flex-1"
          />
          <input
            type="number"
            placeholder="Montant (€)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border rounded-lg px-3 py-2 w-28"
          />
          <button
            onClick={createRequest}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <PlusCircle size={18} /> Envoyer
          </button>
        </div>
      </div>

      {/* Liste des demandes */}
      <div className="bg-white p-5 rounded-2xl shadow">
        <h3 className="font-semibold mb-3">Mes demandes récentes</h3>
        {loading ? (
          <p>Chargement...</p>
        ) : requests.length === 0 ? (
          <p className="text-gray-500">Aucune demande pour l’instant.</p>
        ) : (
          <ul className="divide-y">
            {requests.map((r) => (
              <li key={r.id} className="py-3 flex justify-between">
                <span>{r.receiver_email}</span>
                <span className="font-semibold text-blue-600">
                  € {Number(r.amount).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
