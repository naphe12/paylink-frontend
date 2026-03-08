import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

export default function CashOutPage() {
  const navigate = useNavigate();
  const [clientUid, setClientUid] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleCashOut = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!clientUid || !amount || Number(amount) <= 0) {
      setErrorMessage("Veuillez entrer un montant valide.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/agent/agent/cash-out", {
        client_uid: clientUid,
        amount: Number(amount),
      });

      setSuccessMessage("Cash-out effectue avec succes.");
      setAmount("");
      setClientUid("");
      setTimeout(() => navigate("/dashboard/agent"), 1500);
    } catch (err) {
      setErrorMessage(err?.message || "Echec cash-out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Cash-Out Client</h1>

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
        placeholder="Montant a retirer"
      />

      <button
        onClick={handleCashOut}
        disabled={loading}
        className="bg-red-600 text-white px-4 py-3 rounded w-full"
      >
        {loading ? "Traitement..." : "Confirmer le Cash-Out"}
      </button>

      <ApiErrorAlert message={errorMessage} className="mt-4" />
      {successMessage && <p className="mt-4 text-center text-green-700">{successMessage}</p>}
    </div>
  );
}
