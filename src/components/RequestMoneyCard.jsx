// src/components/RequestMoneyCard.jsx
import { useState } from "react";
import api from "@/services/api";
import { HandCoins } from "lucide-react";

export default function RequestMoneyCard() {
  const [toIdentifier, setToIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    if (!toIdentifier || !amount) return alert("Veuillez remplir tous les champs !");
    setLoading(true);
    setMessage("");
    try {
      const res = await api.post("/wallet/request", { to: toIdentifier, amount: Number(amount) });
      setMessage(res.message || "Demande envoyee !");
      setToIdentifier("");
      setAmount("");
    } catch (err) {
      setMessage("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border text-center w-full max-w-md mx-auto">
      <h3 className="text-lg font-semibold text-[#0b3b64] mb-4 flex justify-center gap-2">
        <HandCoins size={22} /> Demande de paiement
      </h3>

      <input
        type="text"
        placeholder="Email, username ou paytag"
        value={toIdentifier}
        onChange={(e) => setToIdentifier(e.target.value)}
        className="border w-full mb-3 rounded-lg px-3 py-2"
      />

      <input
        type="number"
        placeholder="Montant (F)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="border w-full mb-4 rounded-lg px-3 py-2"
      />

      <button
        onClick={handleRequest}
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-70"
      >
        {loading ? "Envoi..." : "Envoyer la demande"}
      </button>

      {message && (
        <p className={`mt-4 text-sm ${message.toLowerCase().includes("erreur") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
