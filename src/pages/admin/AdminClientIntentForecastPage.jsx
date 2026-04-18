import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarClock,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "@/services/api";
import { buildUserOptionLabel } from "@/utils/userRecentActivity";

const LOOKBACK_OPTIONS = [30, 60, 90, 120];

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function parseDate(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function daysBetween(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, (end.getTime() - start.getTime()) / 86400000);
}

function sourceCategory(source, amountDelta) {
  const s = String(source || "").toLowerCase();
  if (s.includes("transfer")) return "transfer";
  if (
    s.includes("deposit") ||
    s.includes("cash") ||
    s.includes("topup") ||
    s.includes("mobile") ||
    s.includes("payment_intent") ||
    s.includes("cashin")
  ) {
    return "deposit";
  }
  if (amountDelta > 0 && (s.includes("wallet") || s.includes("credit") || s.includes("bonus"))) {
    return "deposit";
  }
  return null;
}

function getTone(score) {
  const s = toNumber(score);
  if (s >= 75) return "text-rose-700 bg-rose-50 border-rose-200";
  if (s >= 55) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

function weeklyKey(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function stddev(values, meanValue = average(values)) {
  if (!values.length) return 0;
  const variance = values.reduce((sum, item) => sum + (item - meanValue) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function computePropensity(events, category, lookbackDays) {
  const now = new Date();
  const minDate = new Date(now.getTime() - lookbackDays * 86400000);

  const scoped = events
    .filter((event) => event.category === category && event.occurredAt && event.occurredAt >= minDate)
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  if (!scoped.length) {
    return {
      score: 0,
      probability7d: 0,
      probability30d: 0,
      count: 0,
      avgGapDays: null,
      daysSinceLast: null,
      expectedNextDate: null,
      confidence: 0,
      avgAmount: 0,
      regularity: 0,
      momentum: 0,
    };
  }

  const count = scoped.length;
  const lastAt = scoped[scoped.length - 1].occurredAt;
  const daysSinceLast = daysBetween(lastAt, now);

  const gaps = [];
  for (let idx = 1; idx < scoped.length; idx += 1) {
    gaps.push(daysBetween(scoped[idx - 1].occurredAt, scoped[idx].occurredAt));
  }

  const avgGapDays = gaps.length ? average(gaps) : Math.max(2, lookbackDays / Math.max(1, count));
  const gapStdDev = gaps.length ? stddev(gaps, avgGapDays) : avgGapDays;
  const regularity = gaps.length ? clamp(1 / (1 + gapStdDev / Math.max(avgGapDays, 1))) : 0.35;

  const countLast30 = scoped.filter((event) => daysBetween(event.occurredAt, now) <= 30).length;
  const countPrev30 = scoped.filter((event) => {
    const d = daysBetween(event.occurredAt, now);
    return d > 30 && d <= 60;
  }).length;
  const momentumRaw = countLast30 - countPrev30;
  const momentum = clamp(0.5 + momentumRaw / Math.max(2, countPrev30 + 2) * 0.5);

  const recencyScore = clamp(Math.exp(-daysSinceLast / Math.max(avgGapDays, 2)));
  const frequencyPer30 = (count / lookbackDays) * 30;
  const frequencyScore = clamp(frequencyPer30 / 6);

  const absAmounts = scoped.map((event) => Math.abs(event.amountDelta || 0));
  const avgAmount = average(absAmounts);
  const amountStability = avgAmount > 0
    ? clamp(1 / (1 + stddev(absAmounts, avgAmount) / Math.max(avgAmount, 1)))
    : 0.35;

  const score = clamp(
    0.34 * recencyScore +
      0.28 * frequencyScore +
      0.18 * regularity +
      0.12 * momentum +
      0.08 * amountStability,
    0,
    1
  ) * 100;

  const expectedGap = Math.max(1, avgGapDays);
  const overdueFactor = daysSinceLast > expectedGap ? Math.min(1.25, daysSinceLast / expectedGap) : 1;
  const probability7d = clamp((1 - Math.exp(-7 / expectedGap)) * overdueFactor * (0.6 + 0.4 * recencyScore));
  const probability30d = clamp((1 - Math.exp(-30 / expectedGap)) * (0.7 + 0.3 * recencyScore));

  const expectedNextDate = new Date(lastAt.getTime() + expectedGap * 86400000);
  const confidence = clamp(0.6 * Math.min(1, count / 12) + 0.4 * regularity);

  return {
    score,
    probability7d,
    probability30d,
    count,
    avgGapDays,
    daysSinceLast,
    expectedNextDate,
    confidence,
    avgAmount,
    regularity,
    momentum,
  };
}

function StatCard({ icon: Icon, label, value, sub, tone }) {
  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          {sub ? <p className="mt-1 text-xs opacity-80">{sub}</p> : null}
        </div>
        {Icon ? (
          <span className="rounded-xl bg-white/70 p-2">
            <Icon size={18} />
          </span>
        ) : null}
      </div>
    </article>
  );
}

export default function AdminClientIntentForecastPage() {
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [events, setEvents] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [lookbackDays, setLookbackDays] = useState(90);
  const [minAmount, setMinAmount] = useState(0);
  const [ranking, setRanking] = useState([]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const data = await api.getUsers({ q: userSearch.trim(), role: "client", status: "active" });
        if (!active) return;
        setUsers(Array.isArray(data) ? data : []);
      } catch {
        if (!active) return;
        setUsers([]);
      } finally {
        if (active) setLoadingUsers(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [userSearch]);

  const selectedUser = useMemo(
    () => users.find((item) => String(item.user_id) === String(selectedUserId)) || null,
    [users, selectedUserId]
  );

  const normalizedEvents = useMemo(() => {
    return (Array.isArray(events) ? events : [])
      .map((event) => {
        const amountDelta = toNumber(event?.amount_delta);
        const occurredAt = parseDate(event?.occurred_at || event?.created_at);
        const category = sourceCategory(event?.source, amountDelta);
        return {
          eventId: event?.event_id,
          source: String(event?.source || ""),
          amountDelta,
          currency: String(event?.currency || ""),
          occurredAt,
          category,
        };
      })
      .filter((event) => event.occurredAt && event.category && Math.abs(event.amountDelta) >= minAmount)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }, [events, minAmount]);

  const transferStats = useMemo(
    () => computePropensity(normalizedEvents, "transfer", lookbackDays),
    [normalizedEvents, lookbackDays]
  );

  const depositStats = useMemo(
    () => computePropensity(normalizedEvents, "deposit", lookbackDays),
    [normalizedEvents, lookbackDays]
  );

  const weeklySeries = useMemo(() => {
    const now = new Date();
    const minDate = new Date(now.getTime() - lookbackDays * 86400000);
    const weeks = new Map();

    for (let i = 0; i <= Math.ceil(lookbackDays / 7); i += 1) {
      const d = new Date(now.getTime() - i * 7 * 86400000);
      const key = weeklyKey(d);
      weeks.set(key, {
        week: key,
        transferCount: 0,
        depositCount: 0,
        transferAmount: 0,
        depositAmount: 0,
      });
    }

    normalizedEvents.forEach((event) => {
      if (!event.occurredAt || event.occurredAt < minDate) return;
      const key = weeklyKey(event.occurredAt);
      const row = weeks.get(key);
      if (!row) return;
      if (event.category === "transfer") {
        row.transferCount += 1;
        row.transferAmount += Math.abs(event.amountDelta);
      }
      if (event.category === "deposit") {
        row.depositCount += 1;
        row.depositAmount += Math.abs(event.amountDelta);
      }
    });

    return Array.from(weeks.values()).sort((a, b) => a.week.localeCompare(b.week));
  }, [normalizedEvents, lookbackDays]);

  const loadUserEvents = async (userId) => {
    if (!userId) {
      setError("Selectionnez un client.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = await api.getAdminUserBalanceEvents(userId, { limit: 200, offset: 0 });
      setEvents(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setEvents([]);
      setError(err?.message || "Impossible de charger les evenements client.");
    } finally {
      setLoading(false);
    }
  };

  const runBatchScan = async () => {
    const candidates = users.slice(0, 25);
    if (!candidates.length) {
      setError("Aucun client a scanner. Lancez une recherche d'abord.");
      return;
    }
    setScanning(true);
    setError("");
    try {
      const rows = await Promise.all(
        candidates.map(async (user) => {
          try {
            const payload = await api.getAdminUserBalanceEvents(user.user_id, { limit: 120, offset: 0 });
            const evts = (Array.isArray(payload) ? payload : [])
              .map((event) => {
                const amountDelta = toNumber(event?.amount_delta);
                const occurredAt = parseDate(event?.occurred_at || event?.created_at);
                return {
                  amountDelta,
                  occurredAt,
                  source: String(event?.source || ""),
                  category: sourceCategory(event?.source, amountDelta),
                };
              })
              .filter((event) => event.occurredAt && event.category && Math.abs(event.amountDelta) >= minAmount);

            const transfer = computePropensity(evts, "transfer", lookbackDays);
            const deposit = computePropensity(evts, "deposit", lookbackDays);
            const global = Math.max(transfer.probability7d, deposit.probability7d);

            return {
              user_id: user.user_id,
              full_name: user.full_name || user.email || user.user_id,
              transfer_prob_7d: transfer.probability7d,
              deposit_prob_7d: deposit.probability7d,
              transfer_score: transfer.score,
              deposit_score: deposit.score,
              confidence: Math.max(transfer.confidence, deposit.confidence),
              global,
            };
          } catch {
            return null;
          }
        })
      );

      setRanking(
        rows
          .filter(Boolean)
          .sort((a, b) => b.global - a.global)
          .slice(0, 20)
      );
    } catch (err) {
      setRanking([]);
      setError(err?.message || "Scan impossible.");
    } finally {
      setScanning(false);
    }
  };

  const transferTone = getTone(transferStats.score);
  const depositTone = getTone(depositStats.score);

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Data mining</p>
          <h1 className="text-2xl font-bold text-slate-900">Propension client: transfert et depot</h1>
          <p className="text-sm text-slate-500">
            Estimation heuristique basee sur recence, frequence, regularite et tendances des evenements wallet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadUserEvents(selectedUserId)}
          disabled={loading || !selectedUserId}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Recalculer
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1 xl:col-span-2">
            <span className="text-sm text-slate-700">Recherche client</span>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Nom, email, telephone"
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
              />
            </div>
          </label>

          <label className="space-y-1 xl:col-span-2">
            <span className="text-sm text-slate-700">Client</span>
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{loadingUsers ? "Chargement..." : "Selectionner un client"}</option>
              {users.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {buildUserOptionLabel(user)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm text-slate-700">Fenetre</span>
            <select
              value={lookbackDays}
              onChange={(event) => setLookbackDays(toNumber(event.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {LOOKBACK_OPTIONS.map((days) => (
                <option key={days} value={days}>{days} jours</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm text-slate-700">Montant min</span>
            <input
              type="number"
              min="0"
              step="1"
              value={minAmount}
              onChange={(event) => setMinAmount(toNumber(event.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadUserEvents(selectedUserId)}
            disabled={loading || !selectedUserId}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Estimer ce client
          </button>
          <button
            type="button"
            onClick={runBatchScan}
            disabled={scanning || loadingUsers || users.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {scanning ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
            Scanner top clients
          </button>
        </div>
      </section>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div> : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatCard
          icon={Activity}
          label="Probabilite transfert (7j)"
          value={`${Math.round(transferStats.probability7d * 100)} %`}
          sub={`Score ${Math.round(transferStats.score)}/100 | ${transferStats.count} evenements`}
          tone={transferTone}
        />
        <StatCard
          icon={Wallet}
          label="Probabilite depot (7j)"
          value={`${Math.round(depositStats.probability7d * 100)} %`}
          sub={`Score ${Math.round(depositStats.score)}/100 | ${depositStats.count} evenements`}
          tone={depositTone}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Tendance hebdomadaire</h2>
          <p className="text-sm text-slate-500">Volumes d'activite detectes sur la fenetre analysee.</p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fill: "#475569", fontSize: 12 }} />
                <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="transferCount" name="Transferts" stroke="#0f172a" fill="#cbd5e1" />
                <Line type="monotone" dataKey="depositCount" name="Depots" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Projection temporelle</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-slate-500">Client</p>
              <p className="font-semibold text-slate-900">{selectedUser?.full_name || selectedUser?.email || "-"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-slate-500">Transfert probable vers</p>
              <p className="font-semibold text-slate-900">
                {transferStats.expectedNextDate ? transferStats.expectedNextDate.toLocaleDateString("fr-FR") : "Donnees insuffisantes"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-slate-500">Depot probable vers</p>
              <p className="font-semibold text-slate-900">
                {depositStats.expectedNextDate ? depositStats.expectedNextDate.toLocaleDateString("fr-FR") : "Donnees insuffisantes"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-slate-500">Confiance modele</p>
              <p className="font-semibold text-slate-900">
                {Math.round(Math.max(transferStats.confidence, depositStats.confidence) * 100)} %
              </p>
              <p className="mt-1 text-xs text-slate-500">Heuristique locale, sans entrainement ML supervise.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-slate-500">Recence activite</p>
              <p className="font-semibold text-slate-900">
                T: {transferStats.daysSinceLast != null ? `${Math.round(transferStats.daysSinceLast)} j` : "-"}
                {" | "}
                D: {depositStats.daysSinceLast != null ? `${Math.round(depositStats.daysSinceLast)} j` : "-"}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Top clients a contacter (scan)</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Classement selon la probabilite max de transfert/depot dans 7 jours.
        </p>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Client</th>
                <th className="px-3 py-2 text-right">Transfert 7j</th>
                <th className="px-3 py-2 text-right">Depot 7j</th>
                <th className="px-3 py-2 text-right">Score T</th>
                <th className="px-3 py-2 text-right">Score D</th>
                <th className="px-3 py-2 text-right">Confiance</th>
              </tr>
            </thead>
            <tbody>
              {ranking.length ? (
                ranking.map((row) => (
                  <tr key={row.user_id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{row.full_name}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{Math.round(row.transfer_prob_7d * 100)} %</td>
                    <td className="px-3 py-2 text-right text-slate-700">{Math.round(row.deposit_prob_7d * 100)} %</td>
                    <td className="px-3 py-2 text-right text-slate-700">{Math.round(row.transfer_score)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{Math.round(row.deposit_score)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{Math.round(row.confidence * 100)} %</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    Lancez "Scanner top clients" pour generer un classement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
