import { useState } from "react";
import api from "@/services/api";
import { useNavigate } from "react-router-dom";

export default function CashOutPage() {
  const navigate = useNavigate();
  const [clientUid, setClientUid] = useState(""); // Identifiant du client
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleCashOut = async () => {
    if (!clientUid || !amount || Number(amount) <= 0) {
      setMessage("Veuillez entrer un montant valide.");
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      await api.post("/agent/agent/cash-out", {
        client_uid: clientUid,
        amount: Number(amount),
      });

      setMessage("✅ Cash-out effectué avec succès !");
      setAmount("");
      setClientUid("");

      setTimeout(() => navigate("/dashboard/agent"), 1500);
    } catch (error) {
      console.error("Erreur Cash-out:", error);
      setMessage(
        "❌ Échec : " + (error.response?.data?.detail || "Erreur inconnue")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-4">💸 Cash-Out Client</h1>

      <label className="block mb-2">UID du client (QR ou identifiant)</label>
      <input
        type="text"
        value={clientUid}
        onChange={(e) => setClientUid(e.target.value)}
        className="w-full p-3 border rounded mb-4"
        placeholder="Ex: user_78f23kd2"
      />

      <label className="block mb-2">Montant</label>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full p-3 border rounded mb-4"
        placeholder="Montant à retirer"
      />

      <button
        onClick={handleCashOut}
        disabled={loading}
        className="bg-red-600 text-white px-4 py-3 rounded w-full"
      >
        {loading ? "Traitement..." : "Confirmer le Cash-Out"}
      </button>

      {message && <p className="mt-4 text-center">{message}</p>}
    </div>
  );
}

