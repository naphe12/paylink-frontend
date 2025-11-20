// src/pages/dashboard/TransferPage.jsx
import { useState } from "react";
import api from "@/services/api";

import { Send } from "lucide-react";

export default function TransferPage() {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");

  const handleTransfer = async () => {
    if (!email || !amount) return alert("Champs incomplets !");
    try {
      await api.post("/wallet/transfer", { receiver_email: email, amount: Number(amount) });
      alert("✅ Transfert effectué !");
      setEmail("");
      setAmount("");
    } catch (err) {
      alert("Erreur transfert : " + err.message);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#0b3b64] mb-6 flex items-center gap-2">
        <Send /> Transfert
      </h2>

      <div className="bg-white p-5 rounded-2xl shadow w-full max-w-md">
        <input
          type="email"
          placeholder="Email du destinataire"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full mb-3"
        />
        <input
          type="number"
          placeholder="Montant (€)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full mb-4"
        />
        <button
          onClick={handleTransfer}
          className="w-full bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
