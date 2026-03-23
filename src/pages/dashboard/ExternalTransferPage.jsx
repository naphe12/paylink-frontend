import { useEffect, useState } from "react";
import { Info, Send } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api, { fetchPublicApi } from "@/services/api";

const PARTNERS = ["Lumicash", "Ecocash", "eNoti"];

function normalizeRecipientPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function getCountryName(country) {
  return String(country?.name || country?.caption || "").trim();
}

function getCountryCurrency(country) {
  return String(country?.currency_code || country?.currency || "EUR").toUpperCase();
}

function normalizeSourceCurrency(value) {
  const raw = String(value || "EUR").trim().toUpperCase();
  if (raw === "CFA") return "XOF";
  if (raw === "FCFA") return "XAF";
  return raw;
}

function getDefaultDestinationCountry(countries = []) {
  const burundi = countries.find(
    (country) => getCountryName(country).toLowerCase() === "burundi"
  );
  return getCountryName(burundi) || getCountryName(countries[0]) || "";
}

function buildDestinationOptions(countries, currentValue = "") {
  const normalizedCurrent = String(currentValue || "").trim();
  const options = countries
    .map((country) => ({
      value: getCountryName(country),
      label: getCountryName(country),
      currency: getCountryCurrency(country),
    }))
    .filter((option) => option.value);

  if (normalizedCurrent && !options.some((option) => option.value === normalizedCurrent)) {
    options.unshift({
      value: normalizedCurrent,
      label: normalizedCurrent,
      currency: "EUR",
    });
  }

  return options;
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
  const [countries, setCountries] = useState([]);
  const [sourceCurrency, setSourceCurrency] = useState("EUR");
  const [form, setForm] = useState({
    recipient_name: "",
    recipient_phone: "",
    country_destination: "",
    partner_name: PARTNERS[0],
    amount: "",
    local_amount: "",
  });
  const [amountMode, setAmountMode] = useState("send_eur");
  const [rate, setRate] = useState(0);
  const [feesPercent, setFeesPercent] = useState(0);
  const [feesAmountSource, setFeesAmountSource] = useState(0);
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
  const destinationOptions = buildDestinationOptions(countries, form.country_destination);

  const getDestinationCurrency = (countryName) =>
    destinationOptions.find((option) => option.value === countryName)?.currency || "EUR";

  const destinationCurrency = getDestinationCurrency(form.country_destination);
  const isBifDestination = destinationCurrency === "BIF";
  const effectiveSourceAmount =
    amountMode === "receive_local" && isBifDestination
      ? rate > 0 && form.local_amount
        ? Number(form.local_amount) / rate
        : 0
      : Number(form.amount || 0);
  const totalDebitSourceAmount = effectiveSourceAmount + feesAmountSource;

  useEffect(() => {
    if (rate === 0) {
      setRecipientAmount(0);
      setFeesAmountSource(0);
      return;
    }
    const sourceAmount =
      amountMode === "receive_local" && isBifDestination
        ? Number(form.local_amount || 0) / rate
        : Number(form.amount || 0);
    if (!sourceAmount || Number.isNaN(sourceAmount)) {
      setRecipientAmount(0);
      setFeesAmountSource(0);
      return;
    }
    const fee = sourceAmount * (feesPercent / 100);
    setFeesAmountSource(fee);
    setRecipientAmount(
      amountMode === "receive_local" && isBifDestination
        ? Number(form.local_amount || 0)
        : sourceAmount * rate
    );
  }, [form.amount, form.local_amount, rate, feesPercent, amountMode, isBifDestination]);

  useEffect(() => {
    if (!isBifDestination && amountMode !== "send_eur") {
      setAmountMode("send_eur");
    }
  }, [isBifDestination, amountMode]);

  const loadRate = async () => {
    try {
      setLoadError("");
      setRate(0);
      setFeesPercent(0);
      const dest = getDestinationCurrency(form.country_destination);
      const normalizedSourceCurrency = normalizeSourceCurrency(sourceCurrency);
      if (normalizedSourceCurrency === "BIF" && dest === "BIF") {
        setRate(1);
        setFeesPercent(6.25);
        return;
      }
      if (normalizedSourceCurrency !== "EUR" && dest === "BIF") {
        const [sourceToEur, eurToDest] = await Promise.all([
          api.getExchangeRate(normalizedSourceCurrency, "EUR"),
          api.getExchangeRate("EUR", dest),
        ]);
        const chainedRate = Number(sourceToEur?.rate || 0) * Number(eurToDest?.rate || 0);
        if (!(chainedRate > 0)) {
          throw new Error("Taux source vers EUR introuvable.");
        }
        setRate(chainedRate);
        if (eurToDest?.fees_percent !== undefined && eurToDest?.fees_percent !== null) {
          setFeesPercent(Number(eurToDest.fees_percent));
        }
        return;
      }
      const res = await api.getExchangeRate(normalizedSourceCurrency, dest);
      if (!(Number(res?.rate || 0) > 0)) {
        throw new Error("Taux de change introuvable.");
      }
      setRate(Number(res.rate));
      if (res?.fees_percent !== undefined && res?.fees_percent !== null) {
        setFeesPercent(Number(res.fees_percent));
      }
    } catch (err) {
      setRate(0);
      setFeesPercent(0);
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
      setSourceCurrency(normalizeSourceCurrency(String(data?.wallet_currency || "EUR")));
    } catch (err) {
      setLoadError(err?.message || "Impossible de charger la capacite de transfert.");
    }
  };

  const loadCountries = async () => {
    try {
      setLoadError("");
      const res = await fetchPublicApi("/api/countries/", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Impossible de charger les pays.");
      const data = await res.json();
      const list = Array.isArray(data?.countries) ? data.countries : Array.isArray(data) ? data : [];
      setCountries(list);
      setForm((prev) => {
        if (prev.country_destination) return prev;
        return {
          ...prev,
          country_destination: getDefaultDestinationCountry(list),
        };
      });
    } catch (err) {
      setLoadError(err?.message || "Impossible de charger les pays.");
    }
  };

  useEffect(() => {
    if (form.country_destination) {
      loadRate();
    }
  }, [form.country_destination, countries.length, sourceCurrency]);

  useEffect(() => {
    loadCountries();
    loadBeneficiaries();
    loadFinancialCapacity();
  }, []);

  const retryLoad = async () => {
    await Promise.allSettled([loadCountries(), loadRate(), loadBeneficiaries(), loadFinancialCapacity()]);
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

    const requestedAmount = effectiveSourceAmount;
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

    if (requestedAmount + feesAmountSource > totalAvailable) {
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
          amount: requestedAmount.toFixed(2),
        },
        idemKey,
        "external-transfer"
      );
      setSuccess("Transfert soumis avec succes.");
      setSubmitIdempotencyKey("");
      setForm({
        recipient_name: "",
        recipient_phone: "",
        country_destination: getDefaultDestinationCountry(countries),
        partner_name: PARTNERS[0],
        amount: "",
        local_amount: "",
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
            Vous pouvez envoyer jusqu'a <span className="font-semibold">{totalAvailable.toFixed(2)} {sourceCurrency}</span>
          </p>
          <p className="text-[13px] text-blue-700">
            ({availableBalance.toFixed(2)} {sourceCurrency} solde + {creditAvailable.toFixed(2)} {sourceCurrency} credit disponible)
          </p>
          <p className="text-[13px] text-blue-700 mt-1">
            Taux FX applique: <span className="font-semibold">{rate || "-"}</span> | Frais:{" "}
            <span className="font-semibold">{feesPercent || 0}% ({feesAmountSource.toFixed(2)} {sourceCurrency})</span>
          </p>
          <p className="text-[13px] text-blue-700">
            Montant recu estime: <span className="font-semibold">{recipientAmount.toFixed(2)} </span>
            {destinationCurrency}
          </p>
          {isBifDestination ? (
            <p className="text-[13px] text-blue-700">
              {sourceCurrency} necessaires: <span className="font-semibold">{totalDebitSourceAmount.toFixed(2)} {sourceCurrency}</span>
            </p>
          ) : null}
        </div>
      </div>

      {isBifDestination ? (
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="block text-sm font-semibold mb-2">Mode de saisie du montant</label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className={`rounded-lg border px-3 py-3 text-sm ${amountMode === "send_eur" ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"}`}>
              <input
                type="radio"
                name="amount_mode"
                className="mr-2"
                checked={amountMode === "send_eur"}
                onChange={() => setAmountMode("send_eur")}
              />
              Montant a envoyer en {sourceCurrency}
            </label>
            <label className={`rounded-lg border px-3 py-3 text-sm ${amountMode === "receive_local" ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"}`}>
              <input
                type="radio"
                name="amount_mode"
                className="mr-2"
                checked={amountMode === "receive_local"}
                onChange={() => setAmountMode("receive_local")}
              />
              Montant a recevoir en BIF
            </label>
          </div>
        </div>
      ) : null}

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
              {destinationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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

        {amountMode === "receive_local" && isBifDestination ? (
          <div>
            <label className="block text-sm font-semibold mb-1">Montant a recevoir (BIF)</label>
            <input
              type="number"
              name="local_amount"
              value={form.local_amount}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="150000"
            />
            <p className="text-xs text-slate-500 mt-1">
              Le beneficiaire recevra {Number(form.local_amount || 0).toFixed(2)} BIF et il faudra {totalDebitSourceAmount.toFixed(2)} {sourceCurrency} au total, frais inclus.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold mb-1">Montant ({sourceCurrency})</label>
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
            <p className="text-xs text-slate-500 mt-1">Frais estimes : {feesAmountSource.toFixed(2)} {sourceCurrency} ({feesPercent || 0}%)</p>
          </div>
        )}

        <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700 space-y-1">
          <div className="flex justify-between">
            <span>Taux applique</span>
            <span className="font-semibold">{rate || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span>Frais</span>
            <span className="font-semibold">{feesAmountSource.toFixed(2)} {sourceCurrency} ({feesPercent || 0}%)</span>
          </div>
          <div className="flex justify-between">
            <span>Montant recu estime</span>
            <span className="font-semibold">
              {recipientAmount.toFixed(2)} {destinationCurrency}
            </span>
          </div>
          {isBifDestination ? (
            <div className="flex justify-between">
              <span>{sourceCurrency} necessaires</span>
              <span className="font-semibold">{totalDebitSourceAmount.toFixed(2)} {sourceCurrency}</span>
            </div>
          ) : null}
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
