import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Database, RefreshCw, Search, Wallet } from "lucide-react";
import api from "@/services/api";
import ApiErrorAlert from "@/components/ApiErrorAlert";

function StatCard({ title, value, subvalue, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    rose: "border-rose-200 bg-rose-50 text-rose-950",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {subvalue ? <p className="mt-1 text-sm opacity-80">{subvalue}</p> : null}
    </div>
  );
}

function prettyDate(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

export default function AdminWalletAnalysisPage() {
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [cutoffDate, setCutoffDate] = useState("2025-12-20");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const data = await api.getUsers(userSearch.trim());
        if (active) {
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) {
          console.error("Erreur chargement utilisateurs:", err);
          setUsers([]);
        }
      } finally {
        if (active) setLoadingUsers(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [userSearch]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => String(user.full_name || "").toLowerCase().includes(query));
  }, [users, userSearch]);

  const load = async () => {
    if (!selectedUserId) {
      setError("Selectionnez un utilisateur.");
      setAnalysis(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminWalletAnalysis({
        user_id: selectedUserId,
        cutoff_date: cutoffDate,
        limit: 100,
      });
      setAnalysis(data || null);
    } catch (err) {
      setError(err?.message || "Impossible de charger l'analyse wallet.");
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const wallets = analysis?.wallets || [];
  const legacyClients = analysis?.legacy_clients || [];
  const timeline = analysis?.timeline || [];
  const gapSummary = analysis?.gap_summary || null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Migration</p>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <Database className="text-blue-600" /> Analyse wallet legacy
          </h1>
          <p className="text-sm text-slate-500">
            Consolidation `wallets`, `client_balance_events`, `legacy.client_credit_du`,
            `legacy.credit_line_payments` et `legacy.sending_logs`.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} />
          {loading ? "Chargement..." : "Analyser"}
        </button>
      </header>

      <ApiErrorAlert message={error} onRetry={load} retryLabel="Relancer l'analyse" />

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 xl:col-span-2">
            <span className="text-sm font-medium text-slate-700">Utilisateur</span>
            <div className="space-y-2">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Rechercher par full name"
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">
                  {loadingUsers ? "Chargement..." : "Selectionner un utilisateur"}
                </option>
                {filteredUsers.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.full_name || "Sans nom"}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Date de coupure</span>
            <input
              type="date"
              value={cutoffDate}
              onChange={(event) => setCutoffDate(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={load}
              disabled={loading || !selectedUserId}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Charger l'analyse
            </button>
          </div>
        </div>
      </section>

      {analysis?.user ? (
        <>
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{analysis.user.full_name}</h2>
                <p className="text-sm text-slate-500">
                  {analysis.user.email || "-"}
                  {" · "}
                  {analysis.user.phone_e164 || "-"}
                </p>
              </div>
              <div className="text-sm text-slate-500">
                Credit utilise: <span className="font-semibold text-slate-800">{Number(analysis.user.credit_used || 0).toLocaleString()} EUR</span>
                {" · "}
                Limite: <span className="font-semibold text-slate-800">{Number(analysis.user.credit_limit || 0).toLocaleString()} EUR</span>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Balance events"
              value={analysis.client_balance_events.total_events}
              subvalue={`Apres cutoff: ${analysis.client_balance_events.events_after_cutoff} · Delta: ${Number(analysis.client_balance_events.total_delta || 0).toLocaleString()}`}
              tone="blue"
            />
            <StatCard
              title="Credit du legacy"
              value={Number(analysis.legacy_credit_du.net_credit_delta || 0).toLocaleString()}
              subvalue={`Utilise: ${Number(analysis.legacy_credit_du.total_credit_used || 0).toLocaleString()} · Rembourse: ${Number(analysis.legacy_credit_du.total_credit_repaid || 0).toLocaleString()}`}
              tone="amber"
            />
            <StatCard
              title="Payments legacy"
              value={analysis.legacy_credit_payments.total_rows}
              subvalue={`Montant: ${Number(analysis.legacy_credit_payments.total_amount || 0).toLocaleString()} ${analysis.legacy_credit_payments.total_amount ? "" : ""}`}
              tone="emerald"
            />
            <StatCard
              title="Sending logs legacy"
              value={analysis.legacy_sending_logs.total_rows}
              subvalue={`Montant: ${Number(analysis.legacy_sending_logs.total_amount || 0).toLocaleString()} · Charge: ${Number(analysis.legacy_sending_logs.total_charge || 0).toLocaleString()}`}
              tone="slate"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Wallet size={18} className="text-slate-700" />
                  <h3 className="text-lg font-semibold text-slate-900">Wallets actuels</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {wallets.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun wallet trouve.</p>
                  ) : (
                    wallets.map((wallet) => (
                      <div key={wallet.wallet_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">
                            {(wallet.type || "wallet").toUpperCase()} · {wallet.currency_code}
                          </p>
                          <span className="text-xs font-mono text-slate-400">{wallet.wallet_id}</span>
                        </div>
                        <p className="mt-3 text-xl font-bold text-slate-900">
                          {Number(wallet.available || 0).toLocaleString()} {wallet.currency_code}
                        </p>
                        <p className="text-sm text-slate-500">
                          Pending: {Number(wallet.pending || 0).toLocaleString()} · Bonus: {Number(wallet.bonus_balance || 0).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Correspondance legacy.clients</h3>
                <div className="mt-4 space-y-3">
                  {legacyClients.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun client legacy correspondant.</p>
                  ) : (
                    legacyClients.map((client) => (
                      <div key={`${client.id}-${client.match_type}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">{client.name || client.username || `Client ${client.id}`}</p>
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                            {client.match_type}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          id={client.id} · {client.email || "-"} · {client.phone || "-"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Balance legacy: {Number(client.balance || 0).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className={`rounded-2xl border p-5 shadow-sm ${
                gapSummary && gapSummary.legacy_activity_after_cutoff > gapSummary.client_balance_events_after_cutoff
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className={gapSummary && gapSummary.legacy_activity_after_cutoff > gapSummary.client_balance_events_after_cutoff ? "text-amber-700" : "text-emerald-700"} />
                  <h3 className="text-lg font-semibold text-slate-900">Analyse des trous apres coupure</h3>
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  Date de coupure: <span className="font-semibold">{gapSummary?.cutoff_date || cutoffDate}</span>
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Activite legacy apres coupure: <span className="font-semibold">{gapSummary?.legacy_activity_after_cutoff || 0}</span>
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Balance events apres coupure: <span className="font-semibold">{gapSummary?.client_balance_events_after_cutoff || 0}</span>
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  Un ecart important suggere que des mouvements legacy n'ont pas ete replayes dans `client_balance_events`.
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Timeline consolidee</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Derniers mouvements combines entre nouvelle et ancienne application.
                </p>
                <div className="mt-4 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3 text-left">Date</th>
                        <th className="p-3 text-left">Source</th>
                        <th className="p-3 text-left">Sous-type</th>
                        <th className="p-3 text-left">Montant</th>
                        <th className="p-3 text-left">Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeline.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-500">
                            Aucun mouvement trouve.
                          </td>
                        </tr>
                      ) : (
                        timeline.map((row, index) => (
                          <tr key={`${row.source}-${row.reference}-${index}`} className="border-t border-slate-100">
                            <td className="p-3 text-slate-600">{prettyDate(row.event_at)}</td>
                            <td className="p-3 font-medium text-slate-900">{row.source}</td>
                            <td className="p-3 text-slate-600">{row.subtype || "-"}</td>
                            <td className="p-3 font-semibold text-slate-900">
                              {Number(row.amount || 0).toLocaleString()} {row.currency || ""}
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-500">{row.reference || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Repères temporels</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <StatCard
                    title="Balance events"
                    value={prettyDate(analysis.client_balance_events.last_event_at)}
                    subvalue={`Premier: ${prettyDate(analysis.client_balance_events.first_event_at)}`}
                    tone="blue"
                  />
                  <StatCard
                    title="Sending logs"
                    value={prettyDate(analysis.legacy_sending_logs.last_sending_at)}
                    subvalue={`Premier: ${prettyDate(analysis.legacy_sending_logs.first_sending_at)}`}
                    tone="slate"
                  />
                  <StatCard
                    title="Credit payments"
                    value={prettyDate(analysis.legacy_credit_payments.last_payment_at)}
                    subvalue={`Premier: ${prettyDate(analysis.legacy_credit_payments.first_payment_at)}`}
                    tone="emerald"
                  />
                  <StatCard
                    title="Client balance delta"
                    value={Number(analysis.client_balance_events.delta_after_cutoff || 0).toLocaleString()}
                    subvalue={`Evenements apres cutoff: ${analysis.client_balance_events.events_after_cutoff}`}
                    tone="amber"
                  />
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
