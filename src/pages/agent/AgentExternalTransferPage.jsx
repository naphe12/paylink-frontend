import { useEffect, useMemo, useState } from "react";
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

function getMostFrequentBeneficiaryCountry(beneficiaries = [], fallback = "") {
  const counts = new Map();
  for (const beneficiary of beneficiaries) {
    const country = String(beneficiary?.country_destination || "").trim();
    if (!country) continue;
    counts.set(country, (counts.get(country) || 0) + 1);
  }
  let bestCountry = "";
  let bestCount = -1;
  for (const [country, count] of counts.entries()) {
    if (count > bestCount) {
      bestCountry = country;
      bestCount = count;
    }
  }
  return bestCountry || fallback;
}

function beneficiaryOptionValue(beneficiary) {
  return [
    beneficiary.recipient_name || "",
    beneficiary.recipient_phone || "",
    beneficiary.partner_name || "",
    beneficiary.country_destination || "",
  ].join("|");
}

const EMPTY_FORM = {
  recipient_name: "",
  recipient_phone: "",
  country_destination: "",
  partner_name: PARTNERS[0],
  amount: "",
  local_amount: "",
};

export default function AgentExternalTransferPage() {
  const [countries, setCountries] = useState([]);
  const [users, setUsers] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [userSelectSearch, setUserSelectSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedBeneficiary, setSelectedBeneficiary] = useState("");
  const [isManualBeneficiary, setIsManualBeneficiary] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [amountMode, setAmountMode] = useState("send_eur");
  const [rate, setRate] = useState(0);
  const [feesPercent, setFeesPercent] = useState(0);
  const [feesAmountSource, setFeesAmountSource] = useState(0);
  const [recipientAmount, setRecipientAmount] = useState(0);
  const [loadingRate, setLoadingRate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitIdempotencyKey, setSubmitIdempotencyKey] = useState("");

  const destinationOptions = buildDestinationOptions(countries, form.country_destination);
  const filteredUsers = useMemo(() => {
    const query = userSelectSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => String(user.full_name || "").toLowerCase().includes(query));
  }, [users, userSelectSearch]);

  const getDestinationCurrency = (countryName) =>
    destinationOptions.find((option) => option.value === countryName)?.currency || "EUR";

  const selectedUserCurrency =
    users.find((user) => user.user_id === selectedUser)?.currency || "EUR";
  const destinationCurrency = getDestinationCurrency(form.country_destination);
  const isBifDestination = destinationCurrency === "BIF";
  const effectiveSourceAmount =
    amountMode === "receive_local" && isBifDestination
      ? rate > 0 && form.local_amount
        ? Number(form.local_amount) / rate
        : 0
      : Number(form.amount || 0);

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

  const loadUsers = async () => {
    try {
      setLoadError("");
      const data = await api.getExternalUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err?.message || "Impossible de charger les utilisateurs (transferts externes).");
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
      setLoadError(err?.message || "Impossible de charger la liste des pays.");
    }
  };

  const loadRate = async (countryDestination) => {
    if (!countryDestination) return;
    try {
      setLoadError("");
      setLoadingRate(true);
      const target = getDestinationCurrency(countryDestination);
      if (selectedUserCurrency !== "EUR" && target === "BIF") {
        const [sourceToEur, eurToDest] = await Promise.all([
          api.getExchangeRate(selectedUserCurrency, "EUR"),
          api.getExchangeRate("EUR", target),
        ]);
        const chainedRate = Number(sourceToEur?.rate || 0) * Number(eurToDest?.rate || 0);
        if (chainedRate > 0) setRate(chainedRate);
        if (eurToDest?.fees_percent !== undefined && eurToDest?.fees_percent !== null) {
          setFeesPercent(Number(eurToDest.fees_percent));
        }
      } else {
        const res = await api.getExchangeRate(selectedUserCurrency, target);
        if (res?.rate) setRate(Number(res.rate));
        if (res?.fees_percent !== undefined && res?.fees_percent !== null) {
          setFeesPercent(Number(res.fees_percent));
        }
      }
    } catch (err) {
      setLoadError(err?.message || "Impossible de charger le taux FX pour cette destination.");
    } finally {
      setLoadingRate(false);
    }
  };

  const retryLoad = async () => {
    await Promise.allSettled([loadUsers(), loadCountries()]);
    if (form.country_destination) {
      await loadRate(form.country_destination);
    }
  };

  useEffect(() => {
    loadUsers();
    loadCountries();
  }, []);

  useEffect(() => {
    if (form.country_destination) {
      loadRate(form.country_destination);
    }
  }, [form.country_destination, countries.length, selectedUserCurrency]);

  useEffect(() => {
    if (!selectedUser) {
      setBeneficiaries([]);
      setSelectedBeneficiary("");
      setIsManualBeneficiary(false);
      setForm((prev) => ({
        ...EMPTY_FORM,
        country_destination: prev.country_destination || getDefaultDestinationCountry(countries),
      }));
      return;
    }

    const loadBeneficiaries = async () => {
      try {
        setLoadError("");
        const data = await api.getExternalBeneficiariesByUser(selectedUser);
        const list = Array.isArray(data) ? data : [];
        const preferredCountry = getMostFrequentBeneficiaryCountry(
          list,
          getDefaultDestinationCountry(countries)
        );
        setBeneficiaries(list);
        setSelectedBeneficiary("");
        setIsManualBeneficiary(list.length === 0);
        setForm({
          ...EMPTY_FORM,
          country_destination: preferredCountry,
        });
      } catch (err) {
        setLoadError(err?.message || "Impossible de charger les beneficiaires de cet utilisateur.");
      }
    };

    loadBeneficiaries();
  }, [selectedUser, countries]);

  const handleChange = (event) => {
    setSubmitIdempotencyKey("");
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "recipient_phone" ? normalizeRecipientPhone(value) : value,
    }));
  };

  const handleBeneficiaryChange = (event) => {
    const value = event.target.value;
    setSelectedBeneficiary(value);
    setSubmitIdempotencyKey("");
    setSubmitError("");
    setSuccess("");

    if (!value) {
      setIsManualBeneficiary(beneficiaries.length === 0);
      setForm((prev) => ({
        ...EMPTY_FORM,
        country_destination: prev.country_destination || getDefaultDestinationCountry(countries),
      }));
      return;
    }

    if (value === "__manual__") {
      setIsManualBeneficiary(true);
      setForm((prev) => ({
        ...EMPTY_FORM,
        partner_name: prev.partner_name || PARTNERS[0],
        country_destination: prev.country_destination || getDefaultDestinationCountry(countries),
      }));
      return;
    }

    const chosen = beneficiaries.find((beneficiary) => beneficiaryOptionValue(beneficiary) === value);
    if (!chosen) return;

    setIsManualBeneficiary(false);
    setForm((prev) => ({
      ...prev,
      recipient_name: chosen.recipient_name,
      recipient_phone: chosen.recipient_phone,
      partner_name: chosen.partner_name,
      country_destination: chosen.country_destination || prev.country_destination,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setSubmitError("");
    setSuccess("");

    const requestedAmount = effectiveSourceAmount;
    const normalizedPhone = normalizeRecipientPhone(form.recipient_phone);

    if (!selectedUser) {
      setSubmitError("Selectionnez un utilisateur.");
      setLoading(false);
      return;
    }
    if (!isManualBeneficiary && !selectedBeneficiary) {
      setSubmitError("Selectionnez un beneficiaire ou choisissez Nouveau beneficiaire.");
      setLoading(false);
      return;
    }
    if (!form.recipient_name.trim()) {
      setSubmitError("Saisissez le nom du beneficiaire.");
      setLoading(false);
      return;
    }
    if (!/^\+?[0-9]{8,15}$/.test(normalizedPhone)) {
      setSubmitError("Le numero du beneficiaire doit etre valide.");
      setLoading(false);
      return;
    }
    if (!form.partner_name.trim() || !form.country_destination.trim()) {
      setSubmitError("Renseignez le partenaire et le pays de destination.");
      setLoading(false);
      return;
    }
    if (requestedAmount <= 0) {
      setSubmitError("Saisissez un montant valide.");
      setLoading(false);
      return;
    }

    try {
      const idemKey = submitIdempotencyKey || api.newIdempotencyKey("agent-external-transfer");
      if (!submitIdempotencyKey) setSubmitIdempotencyKey(idemKey);

      await api.createAgentExternalTransfer(
        {
          user_id: selectedUser,
          partner_name: form.partner_name,
          country_destination: form.country_destination,
          recipient_name: form.recipient_name.trim(),
          recipient_phone: normalizedPhone,
          amount: requestedAmount.toFixed(2),
        },
        idemKey
      );

      setSuccess("Transfert externe soumis avec succes.");
      setSubmitIdempotencyKey("");
      setSelectedBeneficiary("");
      setBeneficiaries((prev) => {
        const next = [
          {
            recipient_name: form.recipient_name.trim(),
            recipient_phone: normalizedPhone,
            partner_name: form.partner_name,
            country_destination: form.country_destination,
          },
          ...prev,
        ];
        const seen = new Set();
        return next.filter((beneficiary) => {
          const key = beneficiaryOptionValue(beneficiary);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
      setForm((prev) => ({
        ...EMPTY_FORM,
        country_destination: prev.country_destination || getDefaultDestinationCountry(countries),
      }));
    } catch (err) {
      setSubmitError(err?.message || "Erreur lors de l'envoi du transfert.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#0b3b64] flex items-center gap-2">
              <Send size={22} /> Transfert externe (agent)
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Creez un transfert externe pour un client avec le meme flux metier que cote client.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <div className="flex items-start gap-3">
            <Info size={18} className="mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p>Selectionnez d'abord le client, puis un beneficiaire existant ou un nouveau destinataire.</p>
              <p className="text-blue-700">
                Taux FX applique: <span className="font-semibold">{loadingRate ? "..." : rate || "-"}</span>
                {" · "}
                Frais: <span className="font-semibold">{feesPercent || 0}% ({feesAmountSource.toFixed(2)} {selectedUserCurrency})</span>
              </p>
              <p className="text-blue-700">
                Montant recu estime: <span className="font-semibold">{recipientAmount.toFixed(2)}</span>{" "}
                {destinationCurrency}
              </p>
              {isBifDestination ? (
                <p className="text-blue-700">
                  {selectedUserCurrency} necessaires: <span className="font-semibold">{effectiveSourceAmount.toFixed(2)} {selectedUserCurrency}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <ApiErrorAlert
        message={loadError}
        onRetry={retryLoad}
        retryLabel="Recharger les donnees"
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="space-y-5 xl:col-span-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <label className="block text-sm font-semibold mb-1">Client</label>
                <input
                  type="text"
                  value={userSelectSearch}
                  onChange={(e) => setUserSelectSearch(e.target.value)}
                  className="w-full px-3 py-2 mb-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  placeholder="Rechercher par full name"
                />
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="">-- Selectionner un utilisateur --</option>
                  {filteredUsers.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {(user.full_name || "Utilisateur")} {user.currency ? `(${user.currency})` : ""}
                    </option>
                  ))}
                </select>
                {selectedUser ? (
                  <p className="mt-2 text-xs text-slate-500">Devise source du wallet: {selectedUserCurrency}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <label className="block text-sm font-semibold mb-1">Beneficiaire enregistre</label>
                <select
                  value={selectedBeneficiary}
                  onChange={handleBeneficiaryChange}
                  disabled={!selectedUser}
                  className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-gray-100"
                >
                  <option value="">-- Selectionner --</option>
                  <option value="__manual__">Nouveau beneficiaire</option>
                  {beneficiaries.map((beneficiary) => {
                    const value = beneficiaryOptionValue(beneficiary);
                    return (
                      <option key={value} value={value}>
                        {beneficiary.recipient_name} - {beneficiary.partner_name} - {beneficiary.recipient_phone}
                      </option>
                    );
                  })}
                </select>
                {!beneficiaries.length && selectedUser ? (
                  <p className="text-xs text-slate-500 mt-1">
                    Aucun beneficiaire enregistre pour cet utilisateur. Saisie manuelle activee.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-5 xl:col-span-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Nom du beneficiaire</label>
                    <input
                      type="text"
                      name="recipient_name"
                      value={form.recipient_name}
                      onChange={handleChange}
                      readOnly={!isManualBeneficiary}
                      className={`w-full px-3 py-2 border rounded-md text-base ${isManualBeneficiary ? "focus:ring-2 focus:ring-blue-400 focus:outline-none" : "bg-gray-50"}`}
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
                      readOnly={!isManualBeneficiary}
                      className={`w-full px-3 py-2 border rounded-md text-base ${isManualBeneficiary ? "focus:ring-2 focus:ring-blue-400 focus:outline-none" : "bg-gray-50"}`}
                      placeholder="+257xxxxxxxx"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Pays de destination</label>
                    <select
                      name="country_destination"
                      value={form.country_destination}
                      onChange={handleChange}
                      disabled={!isManualBeneficiary}
                      className={`w-full px-3 py-2 border rounded-md text-base ${isManualBeneficiary ? "focus:ring-2 focus:ring-blue-400 focus:outline-none" : "bg-gray-50"}`}
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
                      disabled={!isManualBeneficiary}
                      className={`w-full px-3 py-2 border rounded-md text-base ${isManualBeneficiary ? "focus:ring-2 focus:ring-blue-400 focus:outline-none" : "bg-gray-50"}`}
                    >
                      {PARTNERS.map((partner) => (
                        <option key={partner} value={partner}>
                          {partner}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {isBifDestination ? (
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Mode de saisie du montant</label>
                  <div className="grid grid-cols-1 gap-2">
                    <label className={`rounded-lg border px-3 py-2 text-sm ${amountMode === "send_eur" ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"}`}>
                      <input
                        type="radio"
                        name="amount_mode_agent"
                        className="mr-2"
                        checked={amountMode === "send_eur"}
                        onChange={() => setAmountMode("send_eur")}
                      />
                      Montant a envoyer en {selectedUserCurrency}
                    </label>
                    <label className={`rounded-lg border px-3 py-2 text-sm ${amountMode === "receive_local" ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"}`}>
                      <input
                        type="radio"
                        name="amount_mode_agent"
                        className="mr-2"
                        checked={amountMode === "receive_local"}
                        onChange={() => setAmountMode("receive_local")}
                      />
                      Montant a recevoir en BIF
                    </label>
                  </div>
                </div>
              ) : null}

              {amountMode === "receive_local" && isBifDestination ? (
                <>
                  <label className="block text-sm font-semibold mb-1">Montant a recevoir (BIF)</label>
                  <input
                    type="number"
                    name="local_amount"
                    value={form.local_amount}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    placeholder="150000"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    {selectedUserCurrency} necessaires : {effectiveSourceAmount.toFixed(2)} {selectedUserCurrency}
                  </p>
                </>
              ) : (
                <>
                  <label className="block text-sm font-semibold mb-1">Montant ({selectedUserCurrency})</label>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    placeholder="100.00"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Frais estimes : {feesAmountSource.toFixed(2)} {selectedUserCurrency} ({feesPercent || 0}%)
                  </p>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Execution</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Mode</p>
                  <p className="font-semibold text-slate-900">
                    {isManualBeneficiary ? "Nouveau beneficiaire" : "Beneficiaire existant"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Destination</p>
                  <p className="font-semibold text-slate-900">
                    {form.country_destination || "-"} / {form.partner_name || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Resume</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <span>Taux applique</span>
                  <span className="font-semibold">{loadingRate ? "..." : rate || "-"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Frais</span>
                  <span className="font-semibold">{feesAmountSource.toFixed(2)} {selectedUserCurrency} ({feesPercent || 0}%)</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Montant recu estime</span>
                  <span className="font-semibold">
                    {recipientAmount.toFixed(2)} {destinationCurrency}
                  </span>
                </div>
                {isBifDestination ? (
                  <div className="flex items-center justify-between gap-4">
                    <span>{selectedUserCurrency} necessaires</span>
                    <span className="font-semibold">{effectiveSourceAmount.toFixed(2)} {selectedUserCurrency}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <ApiErrorAlert message={submitError} />
          {success ? <p className="text-sm text-green-600">{success}</p> : null}

          <button
            type="submit"
            disabled={loading || !selectedUser}
            className="w-full bg-[#0b3b64] text-white font-semibold py-3 rounded-lg hover:bg-[#0a3356] transition disabled:opacity-50"
          >
            {loading ? "Envoi en cours..." : "Envoyer le transfert"}
          </button>
        </form>
      </section>
    </div>
  );
}
