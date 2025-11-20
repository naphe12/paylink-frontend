// src/components/TransferCard.jsx
import { useState } from "react";
import { api } from "@/services/api";
import { Send } from "lucide-react";

export default function TransferCard() {
  const [toEmail, setToEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleTransfer = async () => {
    if (!toEmail || !amount) return alert("Remplissez tous les champs !");
    setLoading(true);
    setMessage("");
    try {
      const res = await api.post("/wallet/transfer", { to_email: toEmail, amount: Number(amount) });
      setMessage(res.message || "✅ Transfert effectué !");
      setToEmail("");
      setAmount("");
    } catch (err) {
      setMessage("❌ Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border text-center w-full max-w-md mx-auto">
      <h3 className="text-lg font-semibold text-[#0b3b64] mb-4">Transférer de l’argent 💸</h3>

      <input
        type="email"
        placeholder="Email destinataire"
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
        onClick={handleTransfer}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
      >
        {loading ? "Envoi en cours..." : <><Send size={18}/> Envoyer</>}
      </button>

      {message && (
        <p className={`mt-4 text-sm ${message.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
