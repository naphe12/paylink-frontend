import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, CreditCard, RefreshCw, Search, ShieldCheck, UserCircle2 } from "lucide-react";

import api from "@/services/api";

function formatAmount(value) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function ModeButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
        active ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

export default function AdminCreditHistoryPage() {
  const [entries, setEntries] = useState([]);
  const [mode, setMode] = useState("history");
  const [userId, setUserId] = useState("");
  const [limit, setLimit] = useState(200);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openDetails, setOpenDetails] = useState({});

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data =
        mode === "events"
          ? await api.getAdminCreditLineEvents({ user_id: userId || undefined, limit, offset })
          : await api.getAdminCreditHistory({ user_id: userId || undefined, limit, offset });
      setEntries(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total || 0));
    } catch (err) {
      console.error("Erreur chargement admin credit history", err);
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [mode, offset, limit]);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Historique credit</h1>
            <p className="text-sm text-slate-500">
              Bascule entre l'historique financier et les evenements metier des lignes de credit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ModeButton active={mode === "history"} onClick={() => setMode("history")} icon={ArrowLeftRight}>
              Historique financier
            </ModeButton>
            <ModeButton active={mode === "events"} onClick={() => setMode("events")} icon={ShieldCheck}>
              Evenements metier
            </ModeButton>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setOffset(0);
            loadHistory();
          }}
          className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center"
        >
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID (optionnel)"
            className="w-full rounded-lg border px-3 py-2 text-sm lg:w-80"
          />
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setOffset(0);
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {[50, 100, 200, 500].map((value) => (
              <option key={value} value={value}>
                {value} lignes
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            <Search size={16} /> Filtrer
          </button>
          <button
            type="button"
            onClick={loadHistory}
            className="inline-flex items-center justify-center rounded-xl border p-2 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
          </button>
        </form>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow">Chargement...</div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow">Aucune donnee</div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Page {currentPage} / {totalPages} • {total} ligne(s)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0 || loading}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Precedent
              </button>
              <button
                type="button"
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total || loading}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {entries.map((entry) => {
              const amount = Number(mode === "events" ? entry.amount_delta : entry.amount);
              const entryKey = entry.entry_id || entry.event_id;
              const detailsOpen = !!openDetails[entryKey];
              return (
                <article key={entryKey} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {mode === "events" ? "Evenement" : "Historique"}
                        </span>
                        {mode === "events" && entry.status ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            {entry.status}
                          </span>
                        ) : null}
                        <span className="text-xs text-slate-500">
                          {formatDate(entry.occurred_at || entry.created_at)}
                        </span>
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {entry.full_name || entry.email || entry.user_id}
                        </p>
                        <p className="text-sm text-slate-500">{entry.email || entry.user_id}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/dashboard/admin/users/${entry.user_id}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <UserCircle2 size={14} />
                          Profil user
                        </Link>
                        <Link
                          to={`/dashboard/admin/credit-lines?user_id=${entry.user_id}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <CreditCard size={14} />
                          Ligne de credit
                        </Link>
                        <Link
                          to={`/dashboard/admin/credit-lines/repay${entry.user_id ? `?user_id=${entry.user_id}` : ""}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <ArrowLeftRight size={14} />
                          Remboursement
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenDetails((prev) => ({ ...prev, [entryKey]: !prev[entryKey] }))
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {detailsOpen ? "Masquer details" : "Voir details"}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
                      <MetricCard
                        label={mode === "events" ? "Delta" : "Montant"}
                        value={`${amount >= 0 ? "+" : "-"} ${formatAmount(Math.abs(amount))}`}
                        tone={amount >= 0 ? "emerald" : "rose"}
                      />
                      <MetricCard
                        label="Devise"
                        value={entry.currency_code || "-"}
                        tone="slate"
                      />
                      <MetricCard
                        label="Avant"
                        value={formatAmount(
                          mode === "events" ? entry.old_limit : entry.credit_available_before
                        )}
                        tone="slate"
                      />
                      <MetricCard
                        label="Apres"
                        value={formatAmount(
                          mode === "events" ? entry.new_limit : entry.credit_available_after
                        )}
                        tone="blue"
                      />
                    </div>
                  </div>

                  {detailsOpen ? (
                    <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 lg:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Description / Source</p>
                        <p className="mt-1">{entry.description || entry.source || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Reference</p>
                        <p className="mt-1 break-all">{entry.transaction_id || entry.event_id || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Ligne</p>
                        <p className="mt-1 break-all">{entry.credit_line_id || "-"}</p>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-xl border px-3 py-3 ${tones[tone] || tones.slate}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
