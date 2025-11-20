import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import api from "@/services/api";

export default function CashInPage() {
  const [params] = useSearchParams();
  const uid = params.get("uid");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState(null);

  const submit = async () => {
    const res = await api.post("/agent/cash-in", {
      user_id: uid,
      amount: Number(amount),
    });
    setMsg(`✅ Cash-in effectué. Commission agent: ${res.commission} BIF`);
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-[#0b3b64]">💰 Cash-In</h2>

      <input
        type="number"
        className="input w-full"
        placeholder="Montant BIF"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button className="btn-primary w-full py-3 rounded-xl" onClick={submit}>
        Valider
      </button>

      {msg && (
        <div className="p-3 bg-green-100 text-green-700 rounded-lg">{msg}</div>
      )}
    </div>
  );
}
