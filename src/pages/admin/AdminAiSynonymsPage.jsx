import { useEffect, useMemo, useState } from "react";
import { Languages, Plus, RefreshCw, Trash2 } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

const DOMAIN_OPTIONS = [
  { value: "intent", label: "intent" },
  { value: "network", label: "network" },
];

const CANONICAL_OPTIONS_BY_DOMAIN = {
  intent: [
    "agent_onboarding.guide",
    "agent_onboarding.scenario",
    "beneficiary.add",
    "beneficiary.list",
    "cash.capacity",
    "cash.deposit",
    "cash.request_status",
    "cash.withdraw",
    "credit.capacity",
    "credit.pending_reason",
    "credit.simulate_capacity",
    "escrow.status",
    "help.explain_block_reason",
    "kyc.status",
    "p2p.offers_summary",
    "p2p.trade_status",
    "transfer.create",
    "transfer.status",
    "wallet.balance",
    "wallet.block_reason",
    "wallet.limits",
  ],
  network: ["Lumicash", "Ecocash", "eNoti", "MTN"],
};

const LANGUAGE_OPTIONS = [
  { value: "fr", label: "fr" },
  { value: "en", label: "en" },
  { value: "ki", label: "ki" },
  { value: "sw", label: "sw" },
];

function toApiLanguageCode(value) {
  return value === "ki" ? "rn" : value;
}

function fromApiLanguageCode(value) {
  return value === "rn" ? "ki" : value;
}

function SectionCard({ title, action = null, children }) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-cyan-900">
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function AdminAiSynonymsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    domain: "",
    language_code: "",
    canonical_value: "",
  });
  const [form, setForm] = useState({
    domain: "intent",
    canonical_value: CANONICAL_OPTIONS_BY_DOMAIN.intent[0],
    synonym: "",
    language_code: "fr",
  });

  const canonicalOptions = CANONICAL_OPTIONS_BY_DOMAIN[form.domain] || [];
  const filterCanonicalOptions = CANONICAL_OPTIONS_BY_DOMAIN[filters.domain] || [];

  const loadSynonyms = async (nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const normalizedFilters = {
        ...nextFilters,
        language_code: toApiLanguageCode(nextFilters.language_code || ""),
      };
      const data = await api.getAdminAiSynonyms({
        ...normalizedFilters,
        limit: 500,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRows([]);
      setError(err?.message || "Impossible de charger les synonymes IA.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSynonyms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const domains = new Set(rows.map((row) => row.domain));
    const languages = new Set(rows.map((row) => row.language_code));
    return {
      total: rows.length,
      domains: domains.size,
      languages: languages.size,
    };
  }, [rows]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createAdminAiSynonym({
        ...form,
        language_code: toApiLanguageCode(form.language_code),
      });
      setForm((prev) => ({ ...prev, synonym: "" }));
      await loadSynonyms();
    } catch (err) {
      setError(err?.message || "Impossible d'ajouter le synonyme.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (synonymId) => {
    setDeletingId(synonymId);
    setError("");
    try {
      await api.deleteAdminAiSynonym(synonymId);
      await loadSynonyms();
    } catch (err) {
      setError(err?.message || "Impossible de supprimer le synonyme.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Assistants IA</p>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <Languages className="text-cyan-600" />
            Synonymes IA
          </h1>
          <p className="text-sm text-slate-500">
            Gere les alias d’intents, de reseaux et de formulations multilingues sans passer par la base.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            value={filters.q}
            onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            placeholder="Recherche libre"
            className="rounded-xl border px-3 py-2 text-sm"
          />
          <select
            value={filters.domain}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                domain: event.target.value,
                canonical_value: "",
              }))
            }
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="">Tous les domaines</option>
            {DOMAIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.language_code}
            onChange={(event) => setFilters((prev) => ({ ...prev, language_code: event.target.value }))}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="">Toutes les langues</option>
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.canonical_value}
            onChange={(event) => setFilters((prev) => ({ ...prev, canonical_value: event.target.value }))}
            className="rounded-xl border px-3 py-2 text-sm"
            disabled={!filters.domain}
          >
            <option value="">
              {filters.domain ? "Toutes les valeurs canoniques" : "Choisir un domaine"}
            </option>
            {filterCanonicalOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => loadSynonyms(filters)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-60"
          >
            <RefreshCw size={16} />
            {loading ? "Chargement..." : "Rafraichir"}
          </button>
        </div>
      </header>

      <ApiErrorAlert message={error} onRetry={() => loadSynonyms(filters)} retryLabel="Recharger" />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Synonymes" value={stats.total} />
        <StatCard label="Domaines" value={stats.domains} />
        <StatCard label="Langues" value={stats.languages} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard title="Ajouter un synonyme">
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-slate-600">Domaine</span>
              <select
                value={form.domain}
                onChange={(event) =>
                  setForm((prev) => {
                    const nextDomain = event.target.value;
                    const nextCanonicalOptions = CANONICAL_OPTIONS_BY_DOMAIN[nextDomain] || [];
                    return {
                      ...prev,
                      domain: nextDomain,
                      canonical_value: nextCanonicalOptions[0] || "",
                    };
                  })
                }
                className="mt-1 w-full rounded-xl border px-3 py-2"
              >
                {DOMAIN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">Valeur canonique</span>
              <select
                value={form.canonical_value}
                onChange={(event) => setForm((prev) => ({ ...prev, canonical_value: event.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              >
                {canonicalOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">Synonyme</span>
              <input
                value={form.synonym}
                onChange={(event) => setForm((prev) => ({ ...prev, synonym: event.target.value }))}
                placeholder="envoyer, tuma, lumikash..."
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">Langue</span>
              <select
                value={form.language_code}
                onChange={(event) => setForm((prev) => ({ ...prev, language_code: event.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              <Plus size={16} />
              {saving ? "Ajout..." : "Ajouter"}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Synonymes existants">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Domaine</th>
                  <th className="px-3 py-2 text-left">Canonique</th>
                  <th className="px-3 py-2 text-left">Synonyme</th>
                  <th className="px-3 py-2 text-left">Langue</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Chargement...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Aucun synonyme trouve.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2 text-slate-700">{row.domain}</td>
                      <td className="px-3 py-2 text-slate-700">{row.canonical_value}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{row.synonym}</td>
                      <td className="px-3 py-2 text-slate-700">{fromApiLanguageCode(row.language_code)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => remove(row.id)}
                          disabled={deletingId === row.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-rose-700 disabled:opacity-60"
                        >
                          <Trash2 size={14} />
                          {deletingId === row.id ? "Suppression..." : "Supprimer"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
