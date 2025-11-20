import { useState, useEffect } from "react";
import api from "@/services/api";

import { Send, Globe, Smartphone, DollarSign, Info } from "lucide-react";

export default function ExternalTransferPage() {
  const [form, setForm] = useState({
    recipient_name: "",
    recipient_phone: "",
    country_destination: "Burundi",
    partner_name: "Lumicash",
    amount: "",
  });

  const [rate, setRate] = useState(7000);
  const [feesPercent, setFeesPercent] = useState(2.5);
  const [recipientAmount, setRecipientAmount] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(100);
  const [creditLimit, setCreditLimit] = useState(150);
  const totalAvailable = availableBalance + creditLimit;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!form.amount || isNaN(form.amount)) {
      setRecipientAmount(0);
      return;
    }
    const eur = parseFloat(form.amount);
    const fees = eur * (feesPercent / 100);
    const afterFees = eur - fees;
    const converted = afterFees * rate;
    setRecipientAmount(converted);
  }, [form.amount, rate, feesPercent]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

    if (parseFloat(form.amount) > totalAvailable) {
      setError("❌ Montant supérieur à votre limite disponible !");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        partner_name: form.partner_name,
        country_destination: form.country_destination,
        recipient_name: form.recipient_name,
        recipient_phone: form.recipient_phone,
        amount: form.amount,
      };
      await api.post("/wallet/transfer/external", payload);
      setSuccess("✅ Transfert soumis avec succès !");
      setForm({
        recipient_name: "",
        recipient_phone: "",
        country_destination: "Burundi",
        partner_name: "Lumicash",
        amount: "",
      });
    } catch (err) {
      console.error(err);
      setError("❌ Erreur lors de l’envoi du transfert.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
      {/* 🔹 Titre */}
      <h2 className="text-2xl font-bold text-[#0b3b64] mb-6 flex items-center gap-2">
        <Send size={22} /> Transfert externe 🌍
      </h2>

      {/* 💡 Info limite */}
      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 mb-5 flex items-start gap-3 text-sm">
        <Info size={18} className="mt-0.5" />
        <div>
          <p>
            Vous pouvez envoyer jusqu’à{" "}
            <span className="font-semibold">{totalAvailable} €</span>
          </p>
          <p className="text-[13px] text-blue-700">
            ({availableBalance} € solde + {creditLimit} € crédit)
          </p>
        </div>
      </div>

      {/* 🔹 Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-5 text-gray-800">
        {/* Nom / Téléphone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Nom du bénéficiaire
            </label>
            <input
              type="text"
              name="recipient_name"
              value={form.recipient_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Jean Ndayisenga"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Téléphone du bénéficiaire
            </label>
            <input
              type="text"
              name="recipient_phone"
              value={form.recipient_phone}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="+257..."
            />
          </div>
        </div>

        {/* Pays / Opérateur */}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1 flex items-center gap-1">
              <Globe size={14} /> Pays
            </label>
            <select
              name="country_destination"
              value={form.country_destination}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="Burundi">🇧🇮 Burundi</option>
              <option value="Rwanda">🇷🇼 Rwanda</option>
              <option value="Congo">🇨🇩 RDC</option>
              <option value="Kenya">🇰🇪 Kenya</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 flex items-center gap-1">
              <Smartphone size={14} /> Compte Mobile Money
            </label>
            <select
              name="partner_name"
              value={form.partner_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="Lumicash">Lumicash</option>
              <option value="Ecocash">Ecocash</option>
              <option value="eNoti">eNoti</option>
            </select>
          </div>
        </div>

        {/* Montant / Taux */}
        <div className="grid grid-cols-2 gap-5 items-end">
          <div>
            <label className="block text-sm font-semibold mb-1 flex items-center gap-1">
              <DollarSign size={14} /> Montant (€)
            </label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Taux de change (1 € = ? BIF)
            </label>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>
        </div>

        {/* 🧾 Résumé */}
        {form.amount && (
          <div className="bg-gray-50 rounded-md p-4 border flex flex-col md:flex-row justify-between items-center text-sm font-semibold">
            <div>
              💶 {form.amount} € | ⚙️ Frais :{" "}
              {((form.amount * feesPercent) / 100).toFixed(2)} €
            </div>
            <div className="mt-2 md:mt-0 md:border-l md:pl-3 text-green-700">
              💵 Reçu :{" "}
              <span className="font-bold text-green-600">
                {recipientAmount.toLocaleString()} BIF
              </span>
            </div>
          </div>
        )}

        {/* 🔘 Bouton */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#0b3b64] text-white rounded-lg font-semibold text-base hover:bg-[#0a2f52] transition"
        >
          {loading ? "Envoi..." : "📤 Envoyer le transfert"}
        </button>

        {success && (
          <p className="text-green-600 text-center font-medium text-sm mt-3">
            {success}
          </p>
        )}
        {error && (
          <p className="text-red-600 text-center font-medium text-sm mt-3">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
