// src/components/RequestMoneyCard.jsx
import { useState } from "react";
import { api } from "@/services/api";
import { HandCoins } from "lucide-react";

export default function RequestMoneyCard() {
  const [toEmail, setToEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    if (!toEmail || !amount) return alert("Veuillez remplir tous les champs !");
    setLoading(true);
    setMessage("");
    try {
      const res = await api.post("/wallet/request", { to_email: toEmail, amount: Number(amount) });
      setMessage(res.message || "Demande envoyée !");
      setToEmail("");
      setAmount("");
    } catch (err) {
      setMessage("❌ " + err.message);
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
        type="email"
        placeholder="Email du payeur"
        value={toEmail}
        onChange={(e) => setToEmail(e.target.value)}
        className="border w-full mb-3 rounded-lg px-3 py-2"
      />

      <input
        type="number"
        placeholder="Montant (€)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="border w-full mb-4 rounded-lg px-3 py-2"
      />

      <button
        onClick={handleRequest}
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
      >
        {loading ? "Envoi..." : "Envoyer la demande 💰"}
      </button>

      {message && (
        <p className={`mt-4 text-sm ${message.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
