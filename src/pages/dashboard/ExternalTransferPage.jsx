import { useEffect, useState } from "react";
import api from "@/services/api";
import { Send, Info } from "lucide-react";

export default function ExternalTransferPage() {
  const [form, setForm] = useState({
    recipient_name: "",
    recipient_phone: "",
    country_destination: "Burundi",
    partner_name: "Lumicash",
    amount: "",
  });

  const [rate, setRate] = useState(0);
  const [feesPercent, setFeesPercent] = useState(0);
  const [recipientAmount, setRecipientAmount] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(100);
  const [creditLimit, setCreditLimit] = useState(150);
  const totalAvailable = availableBalance + creditLimit;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!form.amount || isNaN(form.amount) || rate === 0) {
      setRecipientAmount(0);
      return;
    }
    const eur = parseFloat(form.amount);
    const fees = eur * (feesPercent / 100);
    const converted = (eur - fees) * rate;
    setRecipientAmount(converted);
  }, [form.amount, rate, feesPercent]);

  useEffect(() => {
    const loadRate = async () => {
      try {
        const dest = form.country_destination === "Burundi" ? "BIF" : form.country_destination;
        const res = await api.getExchangeRate("EUR", dest);
        if (res?.rate) setRate(Number(res.rate));
        if (res?.fees_percent) setFeesPercent(Number(res.fees_percent));
      } catch (err) {
        console.error("Impossible de charger le taux FX", err);
      }
    };
    loadRate();
  }, [form.country_destination]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

    if (parseFloat(form.amount) > totalAvailable) {
      setError("Montant supérieur à votre limite disponible !");
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
      setSuccess("Transfert soumis avec succès !");
      setForm({
        recipient_name: "",
        recipient_phone: "",
        country_destination: "Burundi",
        partner_name: "Lumicash",
        amount: "",
      });
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'envoi du transfert.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold text-[#0b3b64] mb-6 flex items-center gap-2">
        <Send size={22} /> Transfert externe
      </h2>

      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 mb-5 flex items-start gap-3 text-sm">
        <Info size={18} className="mt-0.5" />
        <div>
          <p>
            Vous pouvez envoyer jusqu'à <span className="font-semibold">{totalAvailable} €</span>
          </p>
          <p className="text-[13px] text-blue-700">
            ({availableBalance} € solde + {creditLimit} € crédit)
          </p>
          <p className="text-[13px] text-blue-700 mt-1">
            Taux FX appliqué: <span className="font-semibold">{rate || "-"}</span> | Frais:{" "}
            <span className="font-semibold">{feesPercent || 0}%</span>
          </p>
          <p className="text-[13px] text-blue-700">
            Montant reçu estimé: <span className="font-semibold">{recipientAmount.toFixed(2)} </span>
            {form.country_destination === "Burundi" ? "BIF" : form.country_destination}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Nom du bénéficiaire</label>
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
            <label className="block text-sm font-semibold mb-1">Téléphone du bénéficiaire</label>
            <input
              type="text"
              name="recipient_phone"
              value={form.recipient_phone}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="+257 xx xx xx xx"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Pays de destination</label>
            <select
              name="country_destination"
              value={form.country_destination}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="Burundi">Burundi</option>
              <option value="Rwanda">Rwanda</option>
              <option value="DRC">RD Congo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Partenaire</label>
            <input
              type="text"
              name="partner_name"
              value={form.partner_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Montant (€)</label>
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            required
            min="1"
            className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
            placeholder="100.00"
          />
          <p className="text-xs text-slate-500 mt-1">
            Frais estimés : {(parseFloat(form.amount || 0) * (feesPercent / 100)).toFixed(2)} €
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0b3b64] text-white font-semibold py-3 rounded-lg hover:bg-[#0a3356] transition disabled:opacity-50"
        >
          {loading ? "Envoi en cours..." : "Envoyer le transfert"}
        </button>
      </form>
    </div>
  );
}
