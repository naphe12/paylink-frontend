import { useEffect, useState } from "react";
import { Info, Send } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

const PARTNERS = ["Lumicash", "Ecocash", "eNoti"];

function normalizeRecipientPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function beneficiaryOptionValue(beneficiary) {
  return [
    beneficiary.recipient_name || "",
    beneficiary.recipient_phone || "",
    beneficiary.partner_name || "",
    beneficiary.country_destination || "",
  ].join("|");
}

export default function ExternalTransferPage() {
  const [form, setForm] = useState({
    recipient_name: "",
    recipient_phone: "",
    country_destination: "Burundi",
    partner_name: PARTNERS[0],
    amount: "",
  });
  const [rate, setRate] = useState(0);
  const [feesPercent, setFeesPercent] = useState(0);
  const [feesAmountEur, setFeesAmountEur] = useState(0);
  const [recipientAmount, setRecipientAmount] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [creditAvailable, setCreditAvailable] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [selectedBeneficiary, setSelectedBeneficiary] = useState("");
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [submitIdempotencyKey, setSubmitIdempotencyKey] = useState("");
  const totalAvailable = availableBalance + creditAvailable;

  useEffect(() => {
    if (!form.amount || isNaN(form.amount) || rate === 0) {
      setRecipientAmount(0);
      setFeesAmountEur(0);
      return;
    }
    const eur = parseFloat(form.amount);
    const fee = eur * (feesPercent / 100);
    setFeesAmountEur(fee);
    setRecipientAmount(eur * rate);
  }, [form.amount, rate, feesPercent]);

  const loadRate = async () => {
    try {
      setLoadError("");
      const dest = form.country_destination === "Burundi" ? "BIF" : form.country_destination;
      const res = await api.getExchangeRate("EUR", dest);
      if (res?.rate) setRate(Number(res.rate));
      if (res?.fees_percent !== undefined && res?.fees_percent !== null) {
        setFeesPercent(Number(res.fees_percent));
      }
    } catch (err) {
      setLoadError(err?.message || "Impossible de charger le taux de change.");
    }
  };

  const loadBeneficiaries = async () => {
    try {
      setLoadError("");
      const data = await api.get("/wallet/transfer/external/beneficiaries");
      setBeneficiaries(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err?.message || "Impossible de charger les beneficiaires.");
    }
  };

  const loadFinancialCapacity = async () => {
    try {
      const data = await api.getFinancialSummary();
      setAvailableBalance(Number(data?.wallet_available || 0));
      setCreditAvailable(Number(data?.credit_available || 0));
    } catch (err) {
      setLoadError(err?.message || "Impossible de charger la capacite de transfert.");
    }
  };

  useEffect(() => {
    loadRate();
  }, [form.country_destination]);

  useEffect(() => {
    loadBeneficiaries();
    loadFinancialCapacity();
  }, []);

  const retryLoad = async () => {
    await Promise.allSettled([loadRate(), loadBeneficiaries(), loadFinancialCapacity()]);
  };

  const handleChange = (e) => {
    setSubmitIdempotencyKey("");
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "recipient_phone" ? normalizeRecipientPhone(value) : value,
    });
  };

  const handleBeneficiaryChange = (e) => {
    const value = e.target.value;
    setSelectedBeneficiary(value);
    setSubmitIdempotencyKey("");
    const chosen = beneficiaries.find((b) => beneficiaryOptionValue(b) === value);
    if (!chosen) return;
    setForm((prev) => ({
      ...prev,
      recipient_name: chosen.recipient_name,
      recipient_phone: chosen.recipient_phone,
      partner_name: chosen.partner_name,
      country_destination: chosen.country_destination || prev.country_destination,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

    const requestedAmount = Number(form.amount || 0);
    const normalizedPhone = normalizeRecipientPhone(form.recipient_phone);

    if (normalizedPhone.length < 8) {
      setError("Le numero du beneficiaire doit contenir au moins 8 chiffres.");
      setLoading(false);
      return;
    }

    if (!/^\+?[0-9]{8,15}$/.test(normalizedPhone)) {
      setError("Le numero du beneficiaire doit etre au format international ou numerique simple.");
      setLoading(false);
      return;
    }

    if (requestedAmount + feesAmountEur > totalAvailable) {
      setError("Montant superieur a votre capacite disponible (wallet + credit disponible).");
      setLoading(false);
      return;
    }

    try {
      const idemKey = submitIdempotencyKey || api.newIdempotencyKey("external-transfer");
      if (!submitIdempotencyKey) setSubmitIdempotencyKey(idemKey);
      await api.postIdempotent(
        "/wallet/transfer/external",
        {
          partner_name: form.partner_name,
          country_destination: form.country_destination,
          recipient_name: form.recipient_name,
          recipient_phone: normalizedPhone,
          amount: form.amount,
        },
        idemKey,
        "external-transfer"
      );
      setSuccess("Transfert soumis avec succes.");
      setSubmitIdempotencyKey("");
      setForm({
        recipient_name: "",
        recipient_phone: "",
        country_destination: "Burundi",
        partner_name: PARTNERS[0],
        amount: "",
      });
      setSelectedBeneficiary("");
      await loadFinancialCapacity();
    } catch (err) {
      setError(err?.message || "Erreur lors de l'envoi du transfert.");
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
        <div className="space-y-1">
          <p>
            Vous pouvez envoyer jusqu'a <span className="font-semibold">{totalAvailable.toFixed(2)} EUR</span>
          </p>
          <p className="text-[13px] text-blue-700">
            ({availableBalance.toFixed(2)} EUR solde + {creditAvailable.toFixed(2)} EUR credit disponible)
          </p>
          <p className="text-[13px] text-blue-700 mt-1">
            Taux FX applique: <span className="font-semibold">{rate || "-"}</span> | Frais:{" "}
            <span className="font-semibold">{feesPercent || 0}% ({feesAmountEur.toFixed(2)} EUR)</span>
          </p>
          <p className="text-[13px] text-blue-700">
            Montant recu estime: <span className="font-semibold">{recipientAmount.toFixed(2)} </span>
            {form.country_destination === "Burundi" ? "BIF" : form.country_destination}
          </p>
        </div>
      </div>

      <ApiErrorAlert
        message={loadError}
        onRetry={retryLoad}
        retryLabel="Recharger les donnees"
        className="mb-4"
      />

      <form onSubmit={handleSubmit} className="space-y-5 text-gray-800">
        <div>
          <label className="block text-sm font-semibold mb-1">Beneficiaire enregistre</label>
          <select
            value={selectedBeneficiary}
            onChange={handleBeneficiaryChange}
            className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            <option value="">-- Selectionner --</option>
            {beneficiaries.map((b) => {
              const value = beneficiaryOptionValue(b);
              return (
                <option key={value} value={value}>
                  {b.recipient_name} - {b.partner_name} - {b.recipient_phone}
                </option>
              );
            })}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Nom du beneficiaire</label>
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
            <label className="block text-sm font-semibold mb-1">Telephone du beneficiaire</label>
            <input
              type="text"
              name="recipient_phone"
              value={form.recipient_phone}
              onChange={handleChange}
              required
              minLength={8}
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
            <select
              name="partner_name"
              value={form.partner_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              {PARTNERS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Montant (EUR)</label>
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
          <p className="text-xs text-slate-500 mt-1">Frais estimes : {feesAmountEur.toFixed(2)} EUR ({feesPercent || 0}%)</p>
        </div>

        <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700 space-y-1">
          <div className="flex justify-between">
            <span>Taux applique</span>
            <span className="font-semibold">{rate || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span>Frais</span>
            <span className="font-semibold">{feesAmountEur.toFixed(2)} EUR ({feesPercent || 0}%)</span>
          </div>
          <div className="flex justify-between">
            <span>Montant recu estime</span>
            <span className="font-semibold">
              {recipientAmount.toFixed(2)} {form.country_destination === "Burundi" ? "BIF" : form.country_destination}
            </span>
          </div>
        </div>

        {error && <ApiErrorAlert message={error} />}
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
