import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Info, Send } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api, { fetchPublicApi } from "@/services/api";
import { normalizeDecimalInput, parseDecimalInput } from "@/utils/decimalInput";

const FALLBACK_PARTNERS = ["Lumicash", "Ecocash", "eNoti"];

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

function getTransferStatusBadgeClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (["pending", "initiated"].includes(normalized)) {
    return "bg-amber-100 text-amber-800 border border-amber-200";
  }
  if (normalized === "approved") {
    return "bg-blue-100 text-blue-800 border border-blue-200";
  }
  if (["succeeded", "completed"].includes(normalized)) {
    return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  }
  if (normalized === "partially_repaid") {
    return "bg-amber-100 text-amber-800 border border-amber-200";
  }
  if (normalized === "repaid") {
    return "bg-teal-100 text-teal-800 border border-teal-200";
  }
  if (normalized === "failed") {
    return "bg-rose-100 text-rose-800 border border-rose-200";
  }
  if (["cancelled", "reversed"].includes(normalized)) {
    return "bg-slate-200 text-slate-700 border border-slate-300";
  }
  return "bg-white text-slate-700 border border-slate-300";
}

function getRepaymentBadgeClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "fully_repaid" || normalized === "repaid") {
    return "bg-teal-100 text-teal-800 border border-teal-200";
  }
  if (normalized === "partially_repaid") {
    return "bg-amber-100 text-amber-800 border border-amber-200";
  }
  if (normalized === "not_repaid") {
    return "bg-slate-100 text-slate-700 border border-slate-300";
  }
  return "bg-white text-slate-700 border border-slate-300";
}

function formatTransferMoney(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatSimulationMoney(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatLimitAmount(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrencyAmount(value, currency) {
  const isBif = String(currency || "").toUpperCase() === "BIF";
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: isBif ? 0 : 2,
    maximumFractionDigits: isBif ? 0 : 2,
  });
}

function roundUpToPrecision(value, precision = 2) {
  const amount = Number(value || 0);
  if (!(amount > 0)) return 0;
  const safePrecision = Math.max(0, Math.min(Number(precision || 0), 8));
  const factor = 10 ** safePrecision;
  return Math.ceil(amount * factor) / factor;
}

function getDefaultPartnerName(partners = []) {
  return String(partners?.[0] || FALLBACK_PARTNERS[0] || "").trim();
}

export default function ExternalTransferPage() {
  const [partners, setPartners] = useState(FALLBACK_PARTNERS);
  const [countries, setCountries] = useState([]);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [sourceCurrency, setSourceCurrency] = useState("EUR");
  const [creditCurrency, setCreditCurrency] = useState("EUR");
  const [form, setForm] = useState({
    recipient_name: "",
    recipient_phone: "",
    country_destination: "",
    partner_name: getDefaultPartnerName(FALLBACK_PARTNERS),
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
  const [createdTransferReference, setCreatedTransferReference] = useState("");
  const [confirmationNote, setConfirmationNote] = useState(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [selectedBeneficiary, setSelectedBeneficiary] = useState("");
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [submitIdempotencyKey, setSubmitIdempotencyKey] = useState("");
  const [simulationAmount, setSimulationAmount] = useState("");
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationError, setSimulationError] = useState("");
  const [walletLimits, setWalletLimits] = useState({
    daily_limit: 0,
    used_daily: 0,
    monthly_limit: 0,
    used_monthly: 0,
  });
  const [kycProfile, setKycProfile] = useState({
    kyc_tier: null,
    kyc_verified: null,
  });
  const [limitsInsights, setLimitsInsights] = useState(null);
  const isBifWallet = sourceCurrency === "BIF";
  const sameFundingCurrency = sourceCurrency === creditCurrency;
  const hasNegativeWallet = availableBalance < 0;
  const totalAvailable = isBifWallet
    ? creditAvailable
    : sameFundingCurrency
      ? hasNegativeWallet
        ? creditAvailable
        : availableBalance + creditAvailable
      : availableBalance;
  const destinationOptions = buildDestinationOptions(countries, form.country_destination);
  const partnerOptionsBase = partners.length > 0 ? partners : FALLBACK_PARTNERS;
  const partnerOptions = Array.from(
    new Set(
      [
        ...partnerOptionsBase,
        String(form.partner_name || "").trim(),
      ].filter(Boolean)
    )
  );

  const getDestinationCurrency = (countryName) =>
    destinationOptions.find((option) => option.value === countryName)?.currency || "EUR";

  const destinationCurrency = getDestinationCurrency(form.country_destination);
  const isBifDestination = destinationCurrency === "BIF";
  const desiredLocalAmount = parseDecimalInput(form.local_amount);
  const computedSourceAmountFromLocal =
    amountMode === "receive_local" && isBifDestination && rate > 0 && desiredLocalAmount > 0
      ? roundUpToPrecision(desiredLocalAmount / rate, 6)
      : 0;
  const effectiveSourceAmount =
    amountMode === "receive_local" && isBifDestination
      ? computedSourceAmountFromLocal
      : parseDecimalInput(form.amount);
  const hasEnteredAmount =
    (amountMode === "receive_local" && isBifDestination
      ? parseDecimalInput(form.local_amount)
      : parseDecimalInput(form.amount)) > 0;
  const totalDebitSourceAmount = effectiveSourceAmount + feesAmountSource;
  const displayDailyLimit = Number(limitsInsights?.limits?.current_daily_limit ?? walletLimits.daily_limit ?? 0);
  const displayMonthlyLimit = Number(limitsInsights?.limits?.current_monthly_limit ?? walletLimits.monthly_limit ?? 0);
  const displayUsedDaily = Number(limitsInsights?.limits?.used_daily ?? walletLimits.used_daily ?? 0);
  const displayUsedMonthly = Number(limitsInsights?.limits?.used_monthly ?? walletLimits.used_monthly ?? 0);
  const dailyRemaining = Math.max(
    Number((displayDailyLimit - displayUsedDaily) || 0),
    0
  );
  const monthlyRemaining = Math.max(
    Number((displayMonthlyLimit - displayUsedMonthly) || 0),
    0
  );
  const requiredDailyIncrease = Math.max(effectiveSourceAmount - dailyRemaining, 0);
  const requiredMonthlyIncrease = Math.max(effectiveSourceAmount - monthlyRemaining, 0);
  const suggestedDailyIncrease = Math.max(
    Number(limitsInsights?.limits?.recommended_daily_limit || 0) - displayDailyLimit,
    0
  );
  const suggestedMonthlyIncrease = Math.max(
    Number(limitsInsights?.limits?.recommended_monthly_limit || 0) - displayMonthlyLimit,
    0
  );

  useEffect(() => {
    if (rate === 0) {
      setRecipientAmount(0);
      setFeesAmountSource(0);
      return;
    }
    const sourceAmount =
      amountMode === "receive_local" && isBifDestination
        ? computedSourceAmountFromLocal
        : parseDecimalInput(form.amount);
    if (!sourceAmount || Number.isNaN(sourceAmount)) {
      setRecipientAmount(0);
      setFeesAmountSource(0);
      return;
    }
    const fee = sourceAmount * (feesPercent / 100);
    setFeesAmountSource(fee);
    setRecipientAmount(
      amountMode === "receive_local" && isBifDestination
        ? Math.floor(sourceAmount * rate)
        : sourceAmount * rate
    );
  }, [form.amount, form.local_amount, rate, feesPercent, amountMode, isBifDestination, computedSourceAmountFromLocal]);

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

  const loadPartners = async () => {
    try {
      setLoadError("");
      const data = await api.get("/wallet/transfer/external/partners");
      const names = Array.isArray(data)
        ? data
            .map((item) => String(item?.partner_name || item?.name || "").trim())
            .filter(Boolean)
        : [];
      const nextPartners = names.length > 0 ? names : FALLBACK_PARTNERS;
      setPartners(nextPartners);
      setForm((prev) => {
        if (nextPartners.includes(prev.partner_name)) return prev;
        return { ...prev, partner_name: getDefaultPartnerName(nextPartners) };
      });
    } catch (err) {
      setPartners(FALLBACK_PARTNERS);
      setLoadError((current) => current || err?.message || "Impossible de charger les partenaires.");
    }
  };

  const loadRecentTransfers = async () => {
    try {
      const data = await api.get("/wallet/transfer/external/mine?limit=8");
      setRecentTransfers(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError((current) => current || err?.message || "Impossible de charger l'historique des transferts externes.");
    }
  };

  const loadFinancialCapacity = async () => {
    try {
      const data = await api.getFinancialSummary();
      setAvailableBalance(Number(data?.wallet_available || 0));
      setCreditAvailable(Number(data?.credit_available || 0));
      setSourceCurrency(normalizeSourceCurrency(String(data?.wallet_currency || "EUR")));
      setCreditCurrency(normalizeSourceCurrency(String(data?.credit_currency || data?.wallet_currency || "EUR")));
    } catch (err) {
      setLoadError(err?.message || "Impossible de charger la capacite de transfert.");
    }
  };

  const loadWalletLimits = async () => {
    try {
      const data = await api.getWalletLimits();
      setWalletLimits({
        daily_limit: Number(data?.daily_limit || 0),
        used_daily: Number(data?.used_daily || 0),
        monthly_limit: Number(data?.monthly_limit || 0),
        used_monthly: Number(data?.used_monthly || 0),
      });
    } catch (err) {
      try {
        const profile = await api.get("/auth/me");
        setWalletLimits({
          daily_limit: Number(profile?.daily_limit || 0),
          used_daily: Number(profile?.used_daily || 0),
          monthly_limit: Number(profile?.monthly_limit || 0),
          used_monthly: Number(profile?.used_monthly || 0),
        });
      } catch {
        // Do not block the page if limits endpoint is unavailable in a given deployment.
        setWalletLimits({
          daily_limit: 0,
          used_daily: 0,
          monthly_limit: 0,
          used_monthly: 0,
        });
      }
    }
  };

  const loadKycProfile = async () => {
    try {
      const profile = await api.get("/auth/me");
      const status = String(profile?.kyc_status || "").toLowerCase();
      setKycProfile({
        kyc_tier: profile?.kyc_tier ?? null,
        kyc_verified: status ? status === "verified" : null,
      });
    } catch (err) {
      setLoadError((current) => current || err?.message || "Impossible de charger le profil KYC.");
    }
  };

  const loadLimitsInsights = async () => {
    try {
      const data = await api.getMyExternalTransferLimitsInsights();
      setLimitsInsights(data || null);
    } catch (err) {
      setLoadError((current) => current || err?.message || "Impossible de charger l'analyse des limites externes.");
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
    loadPartners();
    loadBeneficiaries();
    loadFinancialCapacity();
    loadWalletLimits();
    loadKycProfile();
    loadLimitsInsights();
    loadRecentTransfers();
  }, []);

  const retryLoad = async () => {
    await Promise.allSettled([
      loadCountries(),
      loadPartners(),
      loadRate(),
      loadBeneficiaries(),
      loadFinancialCapacity(),
      loadWalletLimits(),
      loadKycProfile(),
      loadLimitsInsights(),
      loadRecentTransfers(),
    ]);
  };

  const handleChange = (e) => {
    setSubmitIdempotencyKey("");
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]:
        name === "recipient_phone"
          ? normalizeRecipientPhone(value)
          : name === "local_amount" && amountMode === "receive_local" && isBifDestination
            ? String(value || "").replace(/[^\d]/g, "")
          : name === "amount" || name === "local_amount"
            ? normalizeDecimalInput(value)
            : value,
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
    setCreatedTransferReference("");
    setConfirmationNote(null);

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
      setError(
        isBifWallet
          ? "Montant superieur a votre capacite disponible (ligne de credit disponible uniquement pour wallet BIF)."
          : sameFundingCurrency
            ? "Montant superieur a votre capacite disponible (wallet + credit disponible)."
            : "Montant superieur a votre capacite disponible dans la devise du wallet."
      );
      setLoading(false);
      return;
    }

    try {
      const idemKey = submitIdempotencyKey || api.newIdempotencyKey("external-transfer");
      if (!submitIdempotencyKey) setSubmitIdempotencyKey(idemKey);
      const response = await api.postIdempotent(
        "/wallet/transfer/external",
        {
          partner_name: form.partner_name,
          country_destination: form.country_destination,
          recipient_name: form.recipient_name,
          recipient_phone: normalizedPhone,
          amount:
            amountMode === "receive_local" && isBifDestination
              ? requestedAmount.toFixed(6)
              : requestedAmount.toFixed(2),
        },
        idemKey,
        "external-transfer"
      );
      const createdReference = String(response?.reference_code || response?.transfer_id || "");
      setSuccess("Transfert soumis avec succes.");
      setCreatedTransferReference(createdReference);
      setConfirmationNote({
        reference: createdReference,
        recipient_name: form.recipient_name,
        recipient_phone: normalizedPhone,
        country_destination: form.country_destination,
        partner_name: form.partner_name,
        amount: requestedAmount.toFixed(2),
        fee_amount: feesAmountSource.toFixed(2),
        total_amount: (requestedAmount + feesAmountSource).toFixed(2),
        recipient_amount: formatCurrencyAmount(recipientAmount, destinationCurrency),
      });
      if (createdReference) {
        window.localStorage.setItem(
          "paylink_last_transfer_reference",
          createdReference
        );
      }
      setSubmitIdempotencyKey("");
      setForm({
        recipient_name: "",
        recipient_phone: "",
        country_destination: getDefaultDestinationCountry(countries),
        partner_name: getDefaultPartnerName(partners),
        amount: "",
        local_amount: "",
      });
      setSelectedBeneficiary("");
      await loadFinancialCapacity();
      await loadWalletLimits();
      await loadKycProfile();
      await loadLimitsInsights();
      await loadRecentTransfers();
    } catch (err) {
      const rawMessage = String(err?.message || "");
      const normalizedMessage = rawMessage.toLowerCase();
      if (
        normalizedMessage.includes("requete dupliquee en cours de traitement")
        || normalizedMessage.includes("idempotency-key deja utilisee")
      ) {
        // Force a fresh key on next submit to avoid being stuck on a stale in-progress key.
        setSubmitIdempotencyKey("");
      }
      if (normalizedMessage.includes("limite journaliere atteinte")) {
        setError(
          `Limite journaliere atteinte. Reste aujourd'hui: ${formatLimitAmount(dailyRemaining)} ${sourceCurrency}. ` +
          `Pour ce montant, prevoir au moins +${formatLimitAmount(requiredDailyIncrease)} ${sourceCurrency} de plafond journalier.`
        );
      } else if (normalizedMessage.includes("limite mensuelle atteinte")) {
        setError(
          `Limite mensuelle atteinte. Reste ce mois: ${formatLimitAmount(monthlyRemaining)} ${sourceCurrency}. ` +
          `Pour ce montant, prevoir au moins +${formatLimitAmount(requiredMonthlyIncrease)} ${sourceCurrency} de plafond mensuel.`
        );
      } else {
        setError(err?.message || "Erreur lors de l'envoi du transfert.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSimulation = async () => {
    setSimulationError("");
    const parsedAmount = parseDecimalInput(simulationAmount);
    if (!(parsedAmount > 0)) {
      setSimulationError("Saisis un montant valide pour la simulation.");
      return;
    }
    setSimulationLoading(true);
    try {
      const data = await api.simulateClientExternalTransfer({
        amount: Number(parsedAmount.toFixed(2)),
        currency: sourceCurrency,
      });
      setSimulationResult(data || null);
    } catch (err) {
      setSimulationResult(null);
      setSimulationError(err?.message || "Simulation impossible.");
    } finally {
      setSimulationLoading(false);
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
            {isBifWallet
              ? `(${creditAvailable.toFixed(2)} ${creditCurrency} ligne de credit disponible, wallet BIF non utilise)`
              : sameFundingCurrency
                ? hasNegativeWallet
                  ? `(Wallet negatif: capacite limitee a la ligne de credit disponible ${creditAvailable.toFixed(2)} ${creditCurrency})`
                  : `(${availableBalance.toFixed(2)} ${sourceCurrency} solde + ${creditAvailable.toFixed(2)} ${creditCurrency} credit disponible)`
                : `(${availableBalance.toFixed(2)} ${sourceCurrency} solde disponible; ligne de credit: ${creditAvailable.toFixed(2)} ${creditCurrency})`}
          </p>
          <p className="text-[13px] text-blue-700 mt-1">
            Taux FX applique: <span className="font-semibold">{rate || "-"}</span>
            {hasEnteredAmount ? (
              <>
                {" "} | Frais:{" "}
                <span className="font-semibold">{feesPercent || 0}% ({feesAmountSource.toFixed(2)} {sourceCurrency})</span>
              </>
            ) : null}
          </p>
          {hasEnteredAmount ? (
            <p className="text-[13px] text-blue-700">
              Montant recu estime: <span className="font-semibold">{formatCurrencyAmount(recipientAmount, destinationCurrency)} </span>
              {destinationCurrency}
            </p>
          ) : null}
          {hasEnteredAmount && isBifDestination ? (
            <p className="text-[13px] text-blue-700">
              {sourceCurrency} necessaires: <span className="font-semibold">{totalDebitSourceAmount.toFixed(2)} {sourceCurrency}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-semibold">Limites transfert externe actuelles</p>
            <p className="text-xs text-amber-800">
              Niveau KYC: <span className="font-semibold">{kycProfile.kyc_tier ?? "-"}</span> | Statut:{" "}
              <span className="font-semibold">
                {kycProfile.kyc_verified == null ? "-" : kycProfile.kyc_verified ? "verifie" : "non verifie"}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/dashboard/client/account/kyc"
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              Ouvrir KYC
            </Link>
            <Link
              to="/dashboard/client/kyc-agent"
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              Assistant KYC
            </Link>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
            <p>
              Journalier:{" "}
              <span className="font-semibold">
                {formatLimitAmount(displayUsedDaily)} / {formatLimitAmount(displayDailyLimit)} {sourceCurrency}
              </span>
            </p>
            <p>
              Reste aujourd'hui: <span className="font-semibold">{formatLimitAmount(dailyRemaining)} {sourceCurrency}</span>
            </p>
            {requiredDailyIncrease > 0 ? (
              <p>
                Augmentation min pour ce montant:{" "}
                <span className="font-semibold">+{formatLimitAmount(requiredDailyIncrease)} {sourceCurrency}</span>
              </p>
            ) : null}
            {suggestedDailyIncrease > 0 ? (
              <p className="text-xs text-amber-800">
                Suggestion historique externe (basee sur tes transferts):{" "}
                <span className="font-semibold">+{formatLimitAmount(suggestedDailyIncrease)} {sourceCurrency}</span>
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
            <p>
              Mensuel:{" "}
              <span className="font-semibold">
                {formatLimitAmount(displayUsedMonthly)} / {formatLimitAmount(displayMonthlyLimit)} {sourceCurrency}
              </span>
            </p>
            <p>
              Reste ce mois: <span className="font-semibold">{formatLimitAmount(monthlyRemaining)} {sourceCurrency}</span>
            </p>
            {requiredMonthlyIncrease > 0 ? (
              <p>
                Augmentation min pour ce montant:{" "}
                <span className="font-semibold">+{formatLimitAmount(requiredMonthlyIncrease)} {sourceCurrency}</span>
              </p>
            ) : null}
            {suggestedMonthlyIncrease > 0 ? (
              <p>
                Suggestion historique externe:{" "}
                <span className="font-semibold">+{formatLimitAmount(suggestedMonthlyIncrease)} {sourceCurrency}</span>
              </p>
            ) : null}
          </div>
        </div>
        {limitsInsights?.policy_mode === "dynamic" &&
        (Number(limitsInsights?.limits?.effective_daily_limit || 0) > displayDailyLimit ||
          Number(limitsInsights?.limits?.effective_monthly_limit || 0) > displayMonthlyLimit) ? (
          <p className="mt-2 text-xs text-amber-800">
            Note: les plafonds ci-dessus sont ceux en base (`users`). En mode `dynamic`, un plafond effectif plus eleve peut s'appliquer au controle.
          </p>
        ) : null}
      </div>

      {confirmationNote ? (
        <section className="mb-6 overflow-hidden rounded-2xl border border-emerald-200 bg-white text-sm text-slate-800 shadow-sm">
          <div className="border-b border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4">
            <p className="inline-flex rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Demande enregistree
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Note de paiement</h3>
            <p className="mt-1 text-slate-600">
              Le transfert a ete soumis avec succes. La note de paiement a ete envoyee par email.
            </p>
            {success ? <p className="mt-2 font-medium text-emerald-800">{success}</p> : null}
          </div>

          <div className="space-y-4 p-5">
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Reference</p>
                <p className="font-mono font-semibold text-slate-900">{confirmationNote.reference || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Partenaire</p>
                <p className="font-semibold text-slate-900">{confirmationNote.partner_name || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Beneficiaire</p>
                <p className="font-semibold text-slate-900">{confirmationNote.recipient_name || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Telephone</p>
                <p className="font-semibold text-slate-900">{confirmationNote.recipient_phone || "-"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Pays de destination</p>
                <p className="font-semibold text-slate-900">{confirmationNote.country_destination || "-"}</p>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-emerald-700">Montant envoye</p>
                <p className="text-base font-semibold text-emerald-900">{confirmationNote.amount} {sourceCurrency}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-emerald-700">Frais</p>
                <p className="text-base font-semibold text-emerald-900">{confirmationNote.fee_amount} {sourceCurrency}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-emerald-700">Total a payer</p>
                <p className="text-base font-semibold text-emerald-900">{confirmationNote.total_amount} {sourceCurrency}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-emerald-700">Montant recu estime</p>
                <p className="text-base font-semibold text-emerald-900">{confirmationNote.recipient_amount} {destinationCurrency}</p>
              </div>
            </div>

            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Conservez la reference ci-dessus pour le suivi de votre dossier.
            </p>

            <div className="flex flex-wrap gap-2">
              {createdTransferReference ? (
                <Link
                  to={`/dashboard/client/transfer-support-agent?reference=${encodeURIComponent(createdTransferReference)}`}
                  className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700"
                >
                  Suivre cette demande
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setConfirmationNote(null);
                  setSuccess(null);
                  setError("");
                  setCreatedTransferReference("");
                }}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800 hover:bg-slate-100"
              >
                Nouveau transfert
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
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
              {partnerOptions.map((opt) => (
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
              type="text"
              inputMode="decimal"
              name="local_amount"
              value={form.local_amount}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="150000"
            />
            <p className="text-xs text-slate-500 mt-1">
              Pour garantir au moins {desiredLocalAmount.toFixed(0)} BIF, le debit sera calcule avec arrondi superieur:{" "}
              {totalDebitSourceAmount.toFixed(2)} {sourceCurrency} (frais inclus). Estimation recu: {formatCurrencyAmount(recipientAmount, "BIF")} BIF.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold mb-1">Montant ({sourceCurrency})</label>
            <input
              type="text"
              inputMode="decimal"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              required
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
              {formatCurrencyAmount(recipientAmount, destinationCurrency)} {destinationCurrency}
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
        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="font-semibold">{success}</p>
            {createdTransferReference ? <p className="mt-1">Reference : {createdTransferReference}</p> : null}
            {createdTransferReference ? (
              <Link
                to={`/dashboard/client/transfer-support-agent?reference=${encodeURIComponent(createdTransferReference)}`}
                className="mt-3 inline-flex items-center rounded-lg border border-emerald-300 bg-white px-3 py-2 font-medium text-emerald-800 hover:bg-emerald-100/60"
              >
                Suivre cette demande
              </Link>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0b3b64] text-white font-semibold py-3 rounded-lg hover:bg-[#0a3356] transition disabled:opacity-50"
        >
          {loading ? "Envoi en cours..." : "Envoyer le transfert"}
        </button>
          </form>
        </>
      )}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Simulation transfert externe</h3>
            <p className="text-sm text-slate-500">Verifie la capacite et le montant estimatif recu avant envoi.</p>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-stretch">
            <input
              type="text"
              inputMode="decimal"
              value={simulationAmount}
              onChange={(e) => setSimulationAmount(normalizeDecimalInput(e.target.value))}
              placeholder={`Montant (${sourceCurrency})`}
              className="w-full min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
            />
            <input
              type="text"
              value={sourceCurrency}
              readOnly
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm uppercase text-slate-600 md:w-28"
            />
            <button
              type="button"
              onClick={handleSimulation}
              disabled={simulationLoading}
              className="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {simulationLoading ? "Simulation..." : "Simuler"}
            </button>
          </div>
        </div>

        {simulationError ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {simulationError}
          </p>
        ) : null}

        {simulationResult ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className={`rounded-xl border px-4 py-3 text-sm ${simulationResult.possible ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
              <p className="font-semibold">
                {simulationResult.possible ? "Transfert possible" : "Transfert non possible"}
              </p>
              {Array.isArray(simulationResult.reasons) && simulationResult.reasons.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {simulationResult.reasons.map((reason, idx) => (
                    <li key={`${reason}-${idx}`}>- {reason}</li>
                  ))}
                </ul>
              ) : null}
              {!simulationResult.possible ? (
                <Link
                  to="/dashboard/client/external-transfer-limits"
                  className="mt-3 inline-flex items-center rounded-lg border border-red-300 bg-white px-3 py-2 font-medium text-red-800 hover:bg-red-100/60"
                >
                  Comprendre le blocage
                </Link>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p>
                Total a couvrir:{" "}
                <span className="font-semibold">
                  {formatSimulationMoney(simulationResult.amounts?.total_required)} {simulationResult.before?.wallet_currency}
                </span>
              </p>
              <p>
                Capacite actuelle:{" "}
                <span className="font-semibold">
                  {formatSimulationMoney(simulationResult.before?.financial_capacity)} {simulationResult.before?.wallet_currency}
                </span>
              </p>
              <p>
                Montant recu estime:{" "}
                <span className="font-semibold">
                  {formatSimulationMoney(simulationResult.amounts?.local_amount)} {simulationResult.rule?.destination_currency}
                </span>
              </p>
              <p>
                Taux FX applique: <span className="font-semibold">{formatSimulationMoney(simulationResult.amounts?.fx_rate)}</span>
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Demandes recentes</h3>
            <p className="text-sm text-slate-500">Suivi rapide de tes derniers transferts externes.</p>
          </div>
          <button
            type="button"
            onClick={loadRecentTransfers}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Rafraichir
          </button>
        </div>

        {recentTransfers.length === 0 ? (
          <p className="mt-4 text-sm italic text-slate-500">Aucune demande recente.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
	            <table className="w-full min-w-[980px] text-left text-sm">
	              <thead className="text-slate-500">
	                <tr>
	                  <th className="py-2 pr-4">Reference</th>
	                  <th className="py-2 pr-4">Beneficiaire</th>
	                  <th className="py-2 pr-4">Destination</th>
	                  <th className="py-2 pr-4">Montant</th>
	                  <th className="py-2 pr-4">Statut</th>
	                  <th className="py-2 pr-4">Remboursement dette</th>
	                  <th className="py-2 pr-4">Date remboursement</th>
	                  <th className="py-2 pr-0 text-right">Action</th>
	                </tr>
	              </thead>
	              <tbody className="divide-y divide-slate-200 text-slate-700">
	                {recentTransfers.map((transfer) => {
	                  const reference = transfer.reference_code || transfer.transfer_id;
	                  const creditUsedAmount = Number(transfer.credit_used_amount || 0);
	                  const creditRepaidAmount = Number(transfer.credit_repaid_amount || 0);
	                  const creditOutstandingAmount = Number(transfer.credit_outstanding_amount || 0);
	                  const repaymentStatus = String(transfer.credit_repayment_status || "").toLowerCase();
	                  return (
	                    <tr key={transfer.transfer_id}>
                      <td className="py-3 pr-4 font-mono text-xs">{reference}</td>
                      <td className="py-3 pr-4">
                        <div>{transfer.recipient_name}</div>
                        <div className="text-xs text-slate-500">{transfer.recipient_phone}</div>
                      </td>
                      <td className="py-3 pr-4">
                        {transfer.country_destination} / {transfer.partner_name}
                      </td>
	                      <td className="py-3 pr-4 font-medium">
	                        {transfer.amount} {transfer.currency}
	                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getTransferStatusBadgeClass(
                            transfer.status
                          )}`}
                        >
	                          {transfer.status}
	                        </span>
	                      </td>
	                      <td className="py-3 pr-4">
	                        {creditUsedAmount > 0 ? (
	                          <div className="space-y-1">
	                            <span
	                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getRepaymentBadgeClass(
	                                repaymentStatus
	                              )}`}
	                            >
	                              {repaymentStatus || "not_repaid"}
	                            </span>
	                            <div className="text-xs text-slate-600">
	                              Rembourse: {formatTransferMoney(creditRepaidAmount)} / {formatTransferMoney(creditUsedAmount)} {transfer.currency}
	                            </div>
	                            <div className="text-xs text-slate-600">
	                              Reste: {formatTransferMoney(creditOutstandingAmount)} {transfer.currency}
	                            </div>
	                          </div>
	                        ) : (
	                          <span className="text-xs text-slate-500">Aucune dette liee</span>
	                        )}
	                      </td>
	                      <td className="py-3 pr-4 text-xs text-slate-600">
	                        {formatDateTime(transfer.credit_repayment_updated_at)}
	                      </td>
	                      <td className="py-3 pr-0 text-right">
	                        <Link
                          to={`/dashboard/client/transfer-support-agent?reference=${encodeURIComponent(reference)}`}
                          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
                        >
                          Suivre
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
