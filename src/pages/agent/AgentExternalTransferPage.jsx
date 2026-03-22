import { useEffect, useMemo, useState } from "react";
import api, { fetchPublicApi } from "@/services/api";
import { Send, Info } from "lucide-react";
import ApiErrorAlert from "@/components/ApiErrorAlert";

const PARTNERS = ["Lumicash", "Ecocash", "eNoti"];

function getCountryName(country) {
  return String(country?.name || country?.caption || "").trim();
}

function getCountryCurrency(country) {
  return String(country?.currency_code || country?.currency || "EUR").toUpperCase();
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

const EMPTY_PREFILL = {
  recipient_name: "",
  recipient_phone: "",
  partner_name: PARTNERS[0],
  country_destination: "",
};

function beneficiaryOptionValue(beneficiary) {
  return [
    beneficiary.recipient_name || "",
    beneficiary.recipient_phone || "",
    beneficiary.partner_name || "",
    beneficiary.country_destination || "",
  ].join("|");
}

function normalizeRecipientPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

export default function AgentExternalTransferPage() {
  const [countries, setCountries] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSelectSearch, setUserSelectSearch] = useState("");
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedBeneficiary, setSelectedBeneficiary] = useState("");
  const [isManualBeneficiary, setIsManualBeneficiary] = useState(false);
  const [prefill, setPrefill] = useState({
    ...EMPTY_PREFILL,
  });
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState(0);
  const [feesPercent, setFeesPercent] = useState(0);
  const [feesAmountEur, setFeesAmountEur] = useState(0);
  const [recipientAmount, setRecipientAmount] = useState(0);
  const [loadingRate, setLoadingRate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const destinationOptions = buildDestinationOptions(countries, prefill.country_destination);
  const filteredUsers = useMemo(() => {
    const query = userSelectSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) => String(u.full_name || "").toLowerCase().includes(query));
  }, [users, userSelectSearch]);

  const getDestinationCurrency = (countryName) =>
    destinationOptions.find((option) => option.value === countryName)?.currency || "EUR";

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await api.getExternalUsers();
        setUsers(data || []);
      } catch (err) {
        setError("Impossible de charger les utilisateurs (transferts externes).");
        console.error(err);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const res = await fetchPublicApi("/api/countries/", {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Impossible de charger les pays.");
        const data = await res.json();
        const list = Array.isArray(data?.countries) ? data.countries : Array.isArray(data) ? data : [];
        setCountries(list);
        setPrefill((prev) => {
          if (prev.country_destination) return prev;
          const firstCountryName = getCountryName(list[0]);
          return {
            ...prev,
            country_destination: firstCountryName || "",
          };
        });
      } catch (err) {
        setError("Impossible de charger la liste des pays.");
        console.error(err);
      }
    };
    loadCountries();
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      setBeneficiaries([]);
      setSelectedBeneficiary("");
      setIsManualBeneficiary(false);
      setPrefill({
        ...EMPTY_PREFILL,
        country_destination: destinationOptions[0]?.value || "",
      });
      return;
    }
    const loadBeneficiaries = async () => {
      try {
        const data = await api.getExternalBeneficiariesByUser(selectedUser);
        const list = Array.isArray(data) ? data : [];
        setBeneficiaries(list);
        setSelectedBeneficiary("");
        setIsManualBeneficiary(list.length === 0);
        setPrefill({
          ...EMPTY_PREFILL,
          country_destination: destinationOptions[0]?.value || "",
        });
      } catch (err) {
        setError("Impossible de charger les beneficiaires de cet utilisateur.");
        console.error(err);
      }
    };
    loadBeneficiaries();
  }, [selectedUser]);

  const handleBeneficiaryChange = (value) => {
    setSelectedBeneficiary(value);
    if (!value) {
      setIsManualBeneficiary(beneficiaries.length === 0);
      setPrefill({
        ...EMPTY_PREFILL,
        country_destination: destinationOptions[0]?.value || "",
      });
      setError("");
      return;
    }
    if (value === "__manual__") {
      setIsManualBeneficiary(true);
      setPrefill((prev) => ({
        recipient_name: "",
        recipient_phone: "",
        partner_name: prev.partner_name || PARTNERS[0],
        country_destination: prev.country_destination || destinationOptions[0]?.value || "",
      }));
      setError("");
      return;
    }
    const found = beneficiaries.find((b) => beneficiaryOptionValue(b) === value);
    if (found) {
      setIsManualBeneficiary(false);
      setPrefill({
        recipient_name: found.recipient_name,
        recipient_phone: found.recipient_phone,
        partner_name: found.partner_name,
        country_destination: found.country_destination,
      });
      setError("");
    }
  };

  useEffect(() => {
    if (!amount || isNaN(amount) || rate === 0) {
      setRecipientAmount(0);
      setFeesAmountEur(0);
      return;
    }
    const eur = parseFloat(amount);
    const fees = eur * (feesPercent / 100);
    setFeesAmountEur(fees);
    setRecipientAmount(eur * rate);
  }, [amount, rate, feesPercent]);

  useEffect(() => {
    const dest = prefill.country_destination || "";
    if (!dest) return;
    const loadRate = async () => {
      setLoadingRate(true);
      try {
        const target = getDestinationCurrency(dest);
        const res = await api.getExchangeRate("EUR", target);
        if (res?.rate) setRate(Number(res.rate));
        if (res?.fees_percent !== undefined && res?.fees_percent !== null) {
          setFeesPercent(Number(res.fees_percent));
        }
      } catch (err) {
        console.error("Impossible de charger le taux FX", err);
        setError("Impossible de charger le taux FX pour cette destination.");
      } finally {
        setLoadingRate(false);
      }
    };
    loadRate();
  }, [prefill.country_destination, countries.length]);

  const handlePrefillChange = (e) => {
    const { name, value } = e.target;
    setPrefill((prev) => ({
      ...prev,
      [name]: name === "recipient_phone" ? normalizeRecipientPhone(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedUser) {
      setError("Selectionnez un utilisateur.");
      return;
    }
    if (
      !isManualBeneficiary &&
      !selectedBeneficiary
    ) {
      setError("Selectionnez un beneficiaire ou choisissez Nouveau beneficiaire.");
      return;
    }
    if (!prefill.recipient_name.trim()) {
      setError("Saisissez le nom du beneficiaire.");
      return;
    }
    if (!/^\+?[0-9]{8,15}$/.test(normalizeRecipientPhone(prefill.recipient_phone))) {
      setError("Saisissez un numero de telephone beneficiaire valide.");
      return;
    }
    if (!prefill.partner_name.trim() || !prefill.country_destination.trim()) {
      setError("Renseignez le partenaire et le pays de destination.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Saisissez un montant valide.");
      return;
    }
    setSubmitting(true);
    try {
      // TODO: brancher l'appel API agent de creation d'un transfert externe pour ce client.
      alert(
        "Transfert agent (envoi a connecter a l'API):\n" +
          JSON.stringify(
            {
              user_id: selectedUser,
              partner_name: prefill.partner_name,
              country_destination: prefill.country_destination,
              recipient_name: prefill.recipient_name.trim(),
              recipient_phone: normalizeRecipientPhone(prefill.recipient_phone),
              amount,
            },
            null,
            2
          )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Send size={22} /> Transfert externe (agent)
      </h2>

      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 mb-5 flex items-start gap-3 text-sm">
        <Info size={18} className="mt-0.5" />
        <div className="space-y-1">
          <p>Selectionnez l'utilisateur, puis un beneficiaire existant ou creez un nouveau destinataire.</p>
          <p className="text-[13px] text-blue-700">
            Si le beneficiaire n'existe pas encore, l'agent peut saisir manuellement le nom, le telephone, le partenaire et le pays de destination.
          </p>
        </div>
      </div>

      <ApiErrorAlert message={error} className="mb-4" />

      <form className="space-y-5 text-gray-800" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Utilisateur</label>
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
              {filteredUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name || "Utilisateur"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Beneficiaire</label>
            <select
              value={selectedBeneficiary}
              onChange={(e) => handleBeneficiaryChange(e.target.value)}
              disabled={!selectedUser}
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-gray-100"
            >
              <option value="">-- Selectionner --</option>
              <option value="__manual__">Nouveau beneficiaire</option>
              {beneficiaries.map((b) => (
                <option key={beneficiaryOptionValue(b)} value={beneficiaryOptionValue(b)}>
                  {b.recipient_name} - {b.partner_name} - {b.recipient_phone}
                </option>
              ))}
            </select>
            {!beneficiaries.length && selectedUser ? (
              <p className="text-xs text-slate-500 mt-1">
                Aucun beneficiaire enregistre pour cet utilisateur. Saisie manuelle activee.
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Montant (EUR)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="100.00"
            />
            <p className="text-xs text-slate-500 mt-1">
              Frais estimes : {feesAmountEur.toFixed(2)} EUR ({feesPercent || 0}%)
            </p>
          </div>

          <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span>Taux applique</span>
              <span className="font-semibold">{loadingRate ? "..." : rate || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span>Frais</span>
              <span className="font-semibold">{feesAmountEur.toFixed(2)} EUR ({feesPercent || 0}%)</span>
            </div>
            <div className="flex justify-between">
              <span>Montant recu estime</span>
              <span className="font-semibold">
                {recipientAmount.toFixed(2)} {getDestinationCurrency(prefill.country_destination)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Nom du beneficiaire</label>
            <input
              type="text"
              name="recipient_name"
              value={prefill.recipient_name}
              onChange={handlePrefillChange}
              readOnly={!isManualBeneficiary}
              className={`w-full px-3 py-2 border rounded-md text-base ${isManualBeneficiary ? "focus:ring-2 focus:ring-blue-400 focus:outline-none" : "bg-gray-50"}`}
              placeholder="Jean Ndayisenga"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Telephone</label>
            <input
              type="text"
              name="recipient_phone"
              value={prefill.recipient_phone}
              onChange={handlePrefillChange}
              readOnly={!isManualBeneficiary}
              className={`w-full px-3 py-2 border rounded-md text-base ${isManualBeneficiary ? "focus:ring-2 focus:ring-blue-400 focus:outline-none" : "bg-gray-50"}`}
              placeholder="+257xxxxxxxx"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Partenaire</label>
            <select
              name="partner_name"
              value={prefill.partner_name}
              onChange={handlePrefillChange}
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
          <div>
            <label className="block text-sm font-semibold mb-1">Pays de destination</label>
            <select
              name="country_destination"
              value={prefill.country_destination}
              onChange={handlePrefillChange}
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
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedUser}
          className="w-full bg-teal-700 text-white font-semibold py-3 rounded-lg hover:bg-teal-800 transition disabled:opacity-50"
        >
          {submitting ? "Preparation..." : "Envoyer le transfert (agent)"}
        </button>
      </form>
    </div>
  );
}
