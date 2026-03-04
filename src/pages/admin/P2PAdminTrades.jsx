import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

const API_URL = import.meta.env.VITE_API_URL || "";

function getAuthToken() {
  const raw = localStorage.getItem("token") || localStorage.getItem("access_token");
  return raw && raw !== "null" && raw !== "undefined" ? raw : null;
}

const SCORE_PRESETS = [
  { label: "Tous", value: "" },
  { label: "70+", value: "70" },
  { label: "90+", value: "90" },
  { label: "100", value: "100" },
];

export default function P2PAdminTrades() {
  const [trades, setTrades] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [depositStats, setDepositStats] = useState({
    total: 0,
    matched: 0,
    unmatched: 0,
    ambiguous: 0,
    auto: 0,
    manual: 0,
    by_provider: [],
    by_token: {
      USDC: { total: 0, matched: 0, ambiguous: 0, unmatched: 0 },
      USDT: { total: 0, matched: 0, ambiguous: 0, unmatched: 0 },
    },
  });
  const [autoAssignMinScore, setAutoAssignMinScore] = useState(90);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [depositTimeline, setDepositTimeline] = useState([]);
  const [depositTimelineLoading, setDepositTimelineLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [depositFilter, setDepositFilter] = useState("AMBIGUOUS");
  const [depositQuery, setDepositQuery] = useState("");
  const [depositTokenFilter, setDepositTokenFilter] = useState("all");
  const [depositSourceFilter, setDepositSourceFilter] = useState("all");
  const [depositProviderFilter, setDepositProviderFilter] = useState("all");
  const [depositProviders, setDepositProviders] = useState([]);
  const [depositAssignmentMode, setDepositAssignmentMode] = useState("all");
  const [depositSort, setDepositSort] = useState("recent");
  const [depositScoreMin, setDepositScoreMin] = useState("");
  const [assignTradeIds, setAssignTradeIds] = useState({});
  const [depositActionId, setDepositActionId] = useState("");
  const [retryingWebhookId, setRetryingWebhookId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const depositSearch = new URLSearchParams({ status: depositFilter });
      if (depositQuery.trim()) depositSearch.append("query", depositQuery.trim());
      if (depositTokenFilter !== "all") depositSearch.append("token", depositTokenFilter);
      if (depositSourceFilter !== "all") depositSearch.append("source", depositSourceFilter);
      if (depositProviderFilter !== "all") depositSearch.append("provider", depositProviderFilter);
      if (depositAssignmentMode !== "all") depositSearch.append("assignment_mode", depositAssignmentMode);
      if (depositSort !== "recent") depositSearch.append("sort_by", depositSort);
      if (String(depositScoreMin).trim()) depositSearch.append("score_min", String(depositScoreMin).trim());
      const [tradeData, depositData, depositConfig, depositStatsData, depositProvidersData] = await Promise.all([
        api.get("/api/admin/p2p/trades"),
        api.get(`/api/admin/p2p/deposits?${depositSearch.toString()}`),
        api.get("/api/admin/p2p/deposits/settings"),
        api.get("/api/admin/p2p/deposits/stats"),
        api.get("/api/admin/p2p/deposits/providers"),
      ]);
      const data = tradeData;
      setTrades(Array.isArray(data) ? data : []);
      setDeposits(Array.isArray(depositData) ? depositData : []);
      setAutoAssignMinScore(Number(depositConfig?.auto_assign_min_score || 90));
      setDepositStats({
        total: Number(depositStatsData?.total || 0),
        matched: Number(depositStatsData?.matched || 0),
        unmatched: Number(depositStatsData?.unmatched || 0),
        ambiguous: Number(depositStatsData?.ambiguous || 0),
        auto: Number(depositStatsData?.auto || 0),
        manual: Number(depositStatsData?.manual || 0),
        by_provider: Array.isArray(depositStatsData?.by_provider) ? depositStatsData.by_provider : [],
        by_token: {
          USDC: {
            total: Number(depositStatsData?.by_token?.USDC?.total || 0),
            matched: Number(depositStatsData?.by_token?.USDC?.matched || 0),
            ambiguous: Number(depositStatsData?.by_token?.USDC?.ambiguous || 0),
            unmatched: Number(depositStatsData?.by_token?.USDC?.unmatched || 0),
          },
          USDT: {
            total: Number(depositStatsData?.by_token?.USDT?.total || 0),
            matched: Number(depositStatsData?.by_token?.USDT?.matched || 0),
            ambiguous: Number(depositStatsData?.by_token?.USDT?.ambiguous || 0),
            unmatched: Number(depositStatsData?.by_token?.USDT?.unmatched || 0),
          },
        },
      });
      setDepositProviders(Array.isArray(depositProvidersData) ? depositProvidersData : []);
    } catch (e) {
      setTrades([]);
      setDeposits([]);
      setDepositStats({
        total: 0,
        matched: 0,
        unmatched: 0,
        ambiguous: 0,
        auto: 0,
        manual: 0,
        by_provider: [],
        by_token: {
          USDC: { total: 0, matched: 0, ambiguous: 0, unmatched: 0 },
          USDT: { total: 0, matched: 0, ambiguous: 0, unmatched: 0 },
        },
      });
      setDepositProviders([]);
      setError(e?.message || "Impossible de charger les trades");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [depositFilter]);

  const statuses = useMemo(() => {
    const s = new Set(trades.map((t) => String(t.status || "-")));
    return Array.from(s).sort();
  }, [trades]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trades.filter((t) => {
      if (statusFilter !== "all" && String(t.status || "-") !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        t.trade_id,
        t.buyer_name,
        t.seller_name,
        t.buyer_user_id,
        t.seller_user_id,
        t.offer_id,
        t.token,
        t.status,
      ]
        .map((v) => String(v || ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [trades, statusFilter, query]);

  const openDetail = async (tradeId) => {
    setDetailLoading(true);
    try {
      const data = await api.get(`/api/admin/p2p/trades/${tradeId}`);
      setSelected(data || null);
    } catch {
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const assignDeposit = async (depositId, tradeIdOverride = null) => {
    const tradeId = String(tradeIdOverride || assignTradeIds[depositId] || "").trim();
    if (!tradeId) return;
    setDepositActionId(depositId);
    try {
      await api.post(`/api/admin/p2p/deposits/${depositId}/assign?trade_id=${encodeURIComponent(tradeId)}`, {});
      setAssignTradeIds((prev) => ({ ...prev, [depositId]: "" }));
      await load();
      if (tradeId) {
        await openDetail(tradeId);
      }
    } catch (e) {
      setError(e?.message || "Impossible d'assigner le depot");
    } finally {
      setDepositActionId("");
    }
  };

  const autoAssignBestSuggestion = async (deposit) => {
    const best = deposit?.best_suggested_trade;
    const score = Number(best?.score || 0);
    if (!best?.trade_id || score < autoAssignMinScore) {
      setError(`Aucune suggestion assez fiable pour auto-association (score min ${autoAssignMinScore}).`);
      return;
    }
    setDepositActionId(deposit.deposit_id);
    try {
      const result = await api.post(`/api/admin/p2p/deposits/${deposit.deposit_id}/auto-assign`, {});
      const assignedTradeId = result?.trade_id || best.trade_id;
      setAssignTradeIds((prev) => ({ ...prev, [deposit.deposit_id]: assignedTradeId || "" }));
      await load();
      if (assignedTradeId) {
        await openDetail(assignedTradeId);
      }
    } catch (e) {
      setError(e?.message || "Impossible d'auto-associer le depot");
    } finally {
      setDepositActionId("");
    }
  };

  const openDepositTimeline = async (deposit) => {
    setSelectedDeposit(deposit || null);
    setDepositTimeline([]);
    setDepositTimelineLoading(true);
    try {
      const data = await api.get(`/api/admin/p2p/deposits/${deposit.deposit_id}/timeline`);
      setDepositTimeline(Array.isArray(data?.timeline) ? data.timeline : []);
      setSelectedDeposit(data?.deposit || deposit || null);
    } catch (e) {
      setError(e?.message || "Impossible de charger la timeline du depot");
    } finally {
      setDepositTimelineLoading(false);
    }
  };

  const retryWebhook = async (logId) => {
    if (!logId) return;
    setRetryingWebhookId(logId);
    try {
      await api.post(`/backoffice/webhooks/${logId}/retry`, {});
      if (selectedDeposit?.deposit_id) {
        await openDepositTimeline(selectedDeposit);
      } else {
        await load();
      }
    } catch (e) {
      setError(e?.message || "Impossible de relancer le webhook");
    } finally {
      setRetryingWebhookId(null);
    }
  };

  const exportDeposits = async (format) => {
    try {
      const token = getAuthToken();
      const exportSearch = new URLSearchParams({
        status: depositFilter,
        format,
      });
      if (depositQuery.trim()) exportSearch.append("query", depositQuery.trim());
      if (depositTokenFilter !== "all") exportSearch.append("token", depositTokenFilter);
      if (depositSourceFilter !== "all") exportSearch.append("source", depositSourceFilter);
      if (depositProviderFilter !== "all") exportSearch.append("provider", depositProviderFilter);
      if (depositAssignmentMode !== "all") exportSearch.append("assignment_mode", depositAssignmentMode);
      if (depositSort !== "recent") exportSearch.append("sort_by", depositSort);
      if (String(depositScoreMin).trim()) exportSearch.append("score_min", String(depositScoreMin).trim());
      const res = await fetch(`${API_URL}/api/admin/p2p/deposits/export?${exportSearch.toString()}`, {
        headers: {
          Accept: format === "csv" ? "text/csv" : "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        throw new Error(`Export ${format.toUpperCase()} impossible`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `p2p_chain_deposits_${String(depositFilter || "all").toLowerCase()}${depositQuery.trim() ? "_filtered" : ""}${depositTokenFilter !== "all" ? `_${depositTokenFilter.toLowerCase()}` : ""}${depositSourceFilter !== "all" ? `_${depositSourceFilter.toLowerCase()}` : ""}${depositProviderFilter !== "all" ? `_${depositProviderFilter.toLowerCase()}` : ""}${depositAssignmentMode !== "all" ? `_${depositAssignmentMode}` : ""}${depositSort !== "recent" ? `_${depositSort}` : ""}${String(depositScoreMin).trim() ? `_score${String(depositScoreMin).trim()}` : ""}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || "Impossible d'exporter les depots");
    }
  };

  const fmtDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  };

  const fmtAmount = (value, code, maxFraction = 2) => {
    if (value === null || value === undefined) return "-";
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return `${n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFraction,
    })}${code ? ` ${code}` : ""}`;
  };

  const riskClass = (score) => {
    const s = Number(score || 0);
    if (s >= 80) return "bg-rose-100 text-rose-700";
    if (s >= 50) return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  const confidenceBadgeClass = (score) => {
    const s = Number(score || 0);
    if (s >= autoAssignMinScore) return "bg-emerald-100 text-emerald-700";
    if (s >= 70) return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
  };

  const confidenceLabel = (score) => {
    const s = Number(score || 0);
    if (s >= autoAssignMinScore) return "Fort";
    if (s >= 70) return "Moyen";
    return "Faible";
  };

  const depositRowClass = (deposit) => {
    const score = Number(deposit?.best_suggested_trade?.score || 0);
    if (deposit?.status === "MATCHED") return "border-t border-slate-200 bg-emerald-50/50";
    if (score >= autoAssignMinScore) return "border-t border-emerald-200 bg-emerald-50/70";
    if (score >= 70) return "border-t border-amber-200 bg-amber-50/60";
    return "border-t border-rose-200 bg-rose-50/40";
  };

  const setDepositTradeId = (depositId, tradeId) => {
    setAssignTradeIds((prev) => ({ ...prev, [depositId]: tradeId }));
  };

  const useBestSuggestion = (deposit) => {
    const best = Array.isArray(deposit?.suggested_trades)
      ? [...deposit.suggested_trades].sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0))[0]
      : null;
    if (!best?.trade_id) return;
    setDepositTradeId(deposit.deposit_id, best.trade_id);
    openDetail(best.trade_id);
  };

  const assignmentModeLabel = (resolution) => {
    const normalized = String(resolution || "").toLowerCase();
    if (normalized === "auto_assignment") return "AUTO";
    if (normalized === "manual_assignment") return "MANUAL";
    return null;
  };

  const filteredDepositCount = deposits.length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">P2P Trades</h2>
            <p className="text-sm text-slate-500 mt-1">
              Vue admin des transactions P2P avec risque, montants et contreparties.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
          >
            {loading ? "Chargement..." : "Rafraichir"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Rechercher ID, buyer, seller..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {filtered.length} trade(s)
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="max-h-[560px] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-left px-3 py-2 font-medium">Trade ID</th>
                  <th className="text-left px-3 py-2 font-medium">Buyer</th>
                  <th className="text-left px-3 py-2 font-medium">Seller</th>
                  <th className="text-left px-3 py-2 font-medium">Montant</th>
                  <th className="text-left px-3 py-2 font-medium">BIF</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Risque</th>
                  <th className="text-left px-3 py-2 font-medium">Disputes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.trade_id}
                    onClick={() => openDetail(t.trade_id)}
                    className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{t.trade_id}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{t.buyer_name || "-"}</div>
                      <div className="font-mono text-[11px] text-slate-500">{t.buyer_user_id || "-"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{t.seller_name || "-"}</div>
                      <div className="font-mono text-[11px] text-slate-500">{t.seller_user_id || "-"}</div>
                    </td>
                    <td className="px-3 py-2">{fmtAmount(t.token_amount, t.token, 8)}</td>
                    <td className="px-3 py-2">{fmtAmount(t.bif_amount, "BIF", 2)}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs bg-slate-100 text-slate-700">
                        {t.status || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${riskClass(t.risk_score)}`}>
                        {t.risk_score ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-2">{t.disputes_count ?? 0}</td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      Aucun trade trouve.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Chain Deposits P2P</h3>
            <p className="text-sm text-slate-500 mt-1">
              File de depots detectes pour rapprochement automatique ou manuel.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Seuil auto-association backend: {autoAssignMinScore} | Resultats filtres: {filteredDepositCount}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[280px]"
              placeholder="Rechercher tx, ref, adresse, trade..."
              value={depositQuery}
              onChange={(e) => setDepositQuery(e.target.value)}
            />
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={depositTokenFilter}
              onChange={(e) => setDepositTokenFilter(e.target.value)}
            >
              <option value="all">Tous les tokens</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
            </select>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={depositSourceFilter}
              onChange={(e) => setDepositSourceFilter(e.target.value)}
            >
              <option value="all">Toutes les sources</option>
              <option value="watcher">watcher</option>
              <option value="manual_script">manual_script</option>
            </select>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={depositProviderFilter}
              onChange={(e) => setDepositProviderFilter(e.target.value)}
            >
              <option value="all">Tous les providers</option>
              {depositProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={depositAssignmentMode}
              onChange={(e) => setDepositAssignmentMode(e.target.value)}
            >
              <option value="all">Tous les modes</option>
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
            </select>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={depositFilter}
              onChange={(e) => setDepositFilter(e.target.value)}
            >
              <option value="AMBIGUOUS">AMBIGUOUS</option>
              <option value="UNMATCHED">UNMATCHED</option>
              <option value="MATCHED">MATCHED</option>
            </select>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={depositSort}
              onChange={(e) => setDepositSort(e.target.value)}
            >
              <option value="recent">Plus recents</option>
              <option value="oldest">Plus anciens</option>
              <option value="best_match">Meilleur match</option>
              <option value="most_ambiguous">Plus ambigus</option>
              <option value="amount_desc">Montant decroissant</option>
            </select>
            <input
              type="number"
              min="0"
              max="100"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-28"
              placeholder="Score min"
              value={depositScoreMin}
              onChange={(e) => setDepositScoreMin(e.target.value)}
            />
            <div className="flex rounded-lg border border-slate-300 overflow-hidden">
              {SCORE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setDepositScoreMin(preset.value)}
                  className={`px-3 py-2 text-xs ${
                    String(depositScoreMin) === String(preset.value)
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={load}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            >
              Appliquer
            </button>
            <button
              type="button"
              onClick={() => exportDeposits("json")}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => exportDeposits("csv")}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-8 gap-3 border-b border-slate-200 bg-slate-50 p-3">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="text-[11px] text-slate-500">Total global</div>
              <div className="text-lg font-semibold text-slate-900">{depositStats.total}</div>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
              <div className="text-[11px] text-sky-700">USDC</div>
              <div className="text-lg font-semibold text-sky-900">{depositStats.by_token?.USDC?.total ?? 0}</div>
              <div className="text-[10px] text-sky-800">
                M {depositStats.by_token?.USDC?.matched ?? 0} | A {depositStats.by_token?.USDC?.ambiguous ?? 0} | U {depositStats.by_token?.USDC?.unmatched ?? 0}
              </div>
            </div>
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2">
              <div className="text-[11px] text-cyan-700">USDT</div>
              <div className="text-lg font-semibold text-cyan-900">{depositStats.by_token?.USDT?.total ?? 0}</div>
              <div className="text-[10px] text-cyan-800">
                M {depositStats.by_token?.USDT?.matched ?? 0} | A {depositStats.by_token?.USDT?.ambiguous ?? 0} | U {depositStats.by_token?.USDT?.unmatched ?? 0}
              </div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="text-[11px] text-emerald-700">Matched</div>
              <div className="text-lg font-semibold text-emerald-900">{depositStats.matched}</div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="text-[11px] text-amber-700">Ambiguous</div>
              <div className="text-lg font-semibold text-amber-900">{depositStats.ambiguous}</div>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <div className="text-[11px] text-rose-700">Unmatched</div>
              <div className="text-lg font-semibold text-rose-900">{depositStats.unmatched}</div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="text-[11px] text-emerald-700">Auto</div>
              <div className="text-lg font-semibold text-emerald-900">{depositStats.auto}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="text-[11px] text-slate-500">Manual</div>
              <div className="text-lg font-semibold text-slate-900">{depositStats.manual}</div>
            </div>
          </div>
          {Array.isArray(depositStats.by_provider) && depositStats.by_provider.length > 0 ? (
            <div className="border-b border-slate-200 bg-white px-3 py-3">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Repartition par provider
              </div>
              <div className="flex flex-wrap gap-2">
                {depositStats.by_provider.map((item) => (
                  <button
                    key={item.provider}
                    type="button"
                    onClick={() => setDepositProviderFilter(item.provider)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs ${
                      depositProviderFilter === item.provider
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-mono font-medium">{item.provider}</div>
                    <div>T {item.total} | M {item.matched} | A {item.ambiguous} | U {item.unmatched}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="max-h-[320px] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-left px-3 py-2 font-medium">Tx</th>
                  <th className="text-left px-3 py-2 font-medium">Token</th>
                  <th className="text-left px-3 py-2 font-medium">Amount</th>
                  <th className="text-left px-3 py-2 font-medium">Investigation</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Resolution</th>
                  <th className="text-left px-3 py-2 font-medium">Suggestions</th>
                  <th className="text-left px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d.deposit_id} className={depositRowClass(d)}>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(d.created_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{d.tx_hash}</td>
                    <td className="px-3 py-2">{d.token}</td>
                    <td className="px-3 py-2">{fmtAmount(d.amount, d.token, 8)}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-600">
                      <div><span className="font-medium text-slate-800">To:</span> <span className="font-mono">{d.to_address}</span></div>
                      <div><span className="font-medium text-slate-800">From:</span> <span className="font-mono">{d.from_address || "-"}</span></div>
                      <div><span className="font-medium text-slate-800">Ref:</span> <span className="font-mono">{d.escrow_deposit_ref || "-"}</span></div>
                      <div><span className="font-medium text-slate-800">Block:</span> {d.block_number ?? "-"} / log {d.log_index ?? "-"}</div>
                      <div><span className="font-medium text-slate-800">Chain:</span> {d.chain_id ?? "-"}</div>
                      <div><span className="font-medium text-slate-800">Conf:</span> {d.confirmations ?? "-"}</div>
                      <div><span className="font-medium text-slate-800">Source:</span> {d.source || "watcher"}{d.source_ref ? ` / ${d.source_ref}` : ""}</div>
                      <div><span className="font-medium text-slate-800">Provider:</span> {d.provider || "-"}</div>
                      <div><span className="font-medium text-slate-800">Event ID:</span> <span className="font-mono">{d.provider_event_id || "-"}</span></div>
                    </td>
                    <td className="px-3 py-2">{d.status}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-600">
                      <div className="flex items-center gap-2">
                        <span>{d.resolution || "-"}</span>
                        {assignmentModeLabel(d.resolution) ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${assignmentModeLabel(d.resolution) === "AUTO" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                            {assignmentModeLabel(d.resolution)}
                          </span>
                        ) : null}
                      </div>
                      <div>Matchs: {d.suggestion_count ?? 0}</div>
                      <div>Trade: {d.trade_id || "-"}</div>
                      <div>Matched: {fmtDate(d.matched_at)}</div>
                      <div>
                        Meilleur:{" "}
                        {d.best_suggested_trade?.trade_id ? (
                          <>
                            <span className="font-mono">{d.best_suggested_trade.trade_id}</span>
                            {` (${d.best_suggested_trade.score})`}
                          </>
                        ) : "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {Array.isArray(d.suggested_trades) && d.suggested_trades.length > 0 ? (
                        <div className="space-y-1">
                          {d.suggested_trades.slice(0, 3).map((candidate, index) => (
                            <button
                              key={candidate.trade_id}
                              type="button"
                              onClick={() => {
                                setDepositTradeId(d.deposit_id, candidate.trade_id);
                                openDetail(candidate.trade_id);
                              }}
                              className="block text-left w-full rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-200 px-1 text-[10px] font-semibold text-slate-700">
                                    {index + 1}
                                  </span>
                                  <div className="font-mono text-[11px] text-slate-800">{candidate.trade_id}</div>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${confidenceBadgeClass(candidate.score)}`}>
                                  {confidenceLabel(candidate.score)} {candidate.score}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">{candidate.match_reason}</div>
                              <div className="text-[11px] text-slate-500">
                                {candidate.token_amount} {candidate.token}
                                {candidate.exact_amount_match ? " - montant exact" : ""}
                                {candidate.amount_delta !== null && candidate.amount_delta !== undefined ? ` - ecart ${candidate.amount_delta}` : ""}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {candidate.escrow_deposit_ref ? `${candidate.escrow_deposit_ref} - ` : ""}
                                expire {fmtDate(candidate.expires_at)}
                              </div>
                            </button>
                          ))}
                          {d.suggested_trades.length > 3 ? (
                            <div className="px-2 text-[11px] text-slate-500">
                              +{d.suggested_trades.length - 3} autre(s) candidat(s)
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Aucune suggestion</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {d.status === "MATCHED" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs">{d.trade_id || "-"}</span>
                          <button
                            type="button"
                            onClick={() => openDepositTimeline(d)}
                            className="px-2 py-1 rounded border border-slate-300 text-xs hover:bg-slate-50"
                          >
                            Timeline
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            className="rounded border border-slate-300 px-2 py-1 text-xs min-w-[180px]"
                            placeholder="Trade ID"
                            value={assignTradeIds[d.deposit_id] || ""}
                            onChange={(e) => setDepositTradeId(d.deposit_id, e.target.value)}
                          />
                          <button
                            type="button"
                            disabled={Number(d.best_suggested_trade?.score || 0) < autoAssignMinScore || depositActionId === d.deposit_id}
                            onClick={() => autoAssignBestSuggestion(d)}
                            className="px-2 py-1 rounded border border-slate-300 text-xs hover:bg-slate-50 disabled:opacity-50"
                            title={
                              Number(d.best_suggested_trade?.score || 0) >= autoAssignMinScore
                                ? `Auto-associer si score >= ${autoAssignMinScore}`
                                : `Score insuffisant pour auto-association (min ${autoAssignMinScore})`
                            }
                          >
                            Auto-associer
                          </button>
                          <button
                            type="button"
                            onClick={() => useBestSuggestion(d)}
                            className="px-2 py-1 rounded border border-slate-300 text-xs hover:bg-slate-50"
                          >
                            Meilleure suggestion
                          </button>
                          <button
                            type="button"
                            disabled={depositActionId === d.deposit_id}
                            onClick={() => assignDeposit(d.deposit_id)}
                            className="px-2 py-1 rounded border border-slate-300 text-xs hover:bg-slate-50 disabled:opacity-60"
                          >
                            Associer
                          </button>
                          <button
                            type="button"
                            onClick={() => openDepositTimeline(d)}
                            className="px-2 py-1 rounded border border-slate-300 text-xs hover:bg-slate-50"
                          >
                            Timeline
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && deposits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      Aucun depot pour ce filtre.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <h3 className="text-lg font-semibold text-slate-900">Timeline depot</h3>
        {depositTimelineLoading ? <p className="text-sm text-slate-500 mt-2">Chargement...</p> : null}
        {!depositTimelineLoading && !selectedDeposit ? (
          <p className="text-sm text-slate-500 mt-2">Clique sur `Timeline` pour voir l'historique complet d'un depot.</p>
        ) : null}
        {!depositTimelineLoading && selectedDeposit ? (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-slate-200 p-3 md:col-span-2">
              <p><b>Deposit ID:</b> {selectedDeposit.deposit_id}</p>
              <p><b>Tx:</b> {selectedDeposit.tx_hash || "-"}</p>
              <p><b>Status:</b> {selectedDeposit.status || "-"}</p>
              <p><b>Resolution:</b> {selectedDeposit.resolution || "-"}</p>
              <p><b>Trade:</b> {selectedDeposit.trade_id || "-"}</p>
              <p><b>Ref:</b> {selectedDeposit.escrow_deposit_ref || selectedDeposit.metadata?.escrow_deposit_ref || "-"}</p>
              <p><b>Provider:</b> {selectedDeposit.provider || selectedDeposit.metadata?.provider || "-"}</p>
              <p><b>Provider event:</b> {selectedDeposit.provider_event_id || selectedDeposit.metadata?.provider_event_id || "-"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 md:col-span-2">
              <div className="space-y-3">
                {depositTimeline.map((event, idx) => (
                  <div key={`${event.kind}-${event.at || idx}-${idx}`} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-900">{event.title || event.kind}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-slate-500">{fmtDate(event.at)}</div>
                        {event.kind === "audit" && event.details?.assignment_mode ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${event.details.assignment_mode === "auto" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                            {event.details.assignment_mode === "auto" ? "AUTO" : "MANUAL"}
                          </span>
                        ) : null}
                        {event.kind === "webhook" && event.details?.log_id ? (
                          <button
                            type="button"
                            disabled={retryingWebhookId === event.details.log_id}
                            onClick={() => retryWebhook(event.details.log_id)}
                            className="px-2 py-1 rounded border border-slate-300 text-xs hover:bg-slate-50 disabled:opacity-60"
                          >
                            {retryingWebhookId === event.details.log_id ? "Retry..." : "Retry"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2">
                      <pre className="rounded bg-slate-950 text-slate-100 p-3 overflow-auto text-xs">
                        {JSON.stringify(event.details || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
                {depositTimeline.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun evenement de timeline.</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <h3 className="text-lg font-semibold text-slate-900">Detail trade</h3>
        {detailLoading ? <p className="text-sm text-slate-500 mt-2">Chargement...</p> : null}
        {!detailLoading && !selected ? (
          <p className="text-sm text-slate-500 mt-2">Clique un trade pour voir les details complets.</p>
        ) : null}
        {!detailLoading && selected ? (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-slate-200 p-3">
              <p><b>Trade ID:</b> {selected.trade_id}</p>
              <p><b>Offer ID:</b> {selected.offer_id || "-"}</p>
              <p><b>Status:</b> {selected.status || "-"}</p>
              <p><b>Offer side:</b> {selected.offer_side || "-"}</p>
              <p><b>Payment method:</b> {selected.payment_method || "-"}</p>
              <p><b>Created:</b> {fmtDate(selected.created_at)}</p>
              <p><b>Updated:</b> {fmtDate(selected.updated_at)}</p>
              <p><b>Expires:</b> {fmtDate(selected.expires_at)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p><b>Buyer:</b> {selected.buyer_name || selected.buyer_user_id || "-"}</p>
              <p><b>Seller:</b> {selected.seller_name || selected.seller_user_id || "-"}</p>
              <p><b>Offer owner:</b> {selected.offer_owner_name || selected.offer_owner_user_id || "-"}</p>
              <p><b>Token amount:</b> {fmtAmount(selected.token_amount, selected.token, 8)}</p>
              <p><b>Price:</b> {fmtAmount(selected.price_bif_per_usd, "BIF/USD", 6)}</p>
              <p><b>BIF amount:</b> {fmtAmount(selected.bif_amount, "BIF", 2)}</p>
              <p><b>Risk score:</b> {selected.risk_score ?? 0}</p>
              <p><b>Disputes:</b> {selected.disputes_count ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 md:col-span-2">
              <p><b>Escrow network:</b> {selected.escrow_network || "-"}</p>
              <p><b>Escrow deposit address:</b> {selected.escrow_deposit_addr || "-"}</p>
              <p><b>Escrow deposit ref:</b> {selected.escrow_deposit_ref || "-"}</p>
              <p><b>Escrow provider:</b> {selected.escrow_provider || "-"}</p>
              <p><b>Escrow tx hash:</b> {selected.escrow_tx_hash || "-"}</p>
              <p><b>Escrow lock log index:</b> {selected.escrow_lock_log_index ?? "-"}</p>
              <p><b>Escrow locked at:</b> {fmtDate(selected.escrow_locked_at)}</p>
              <p><b>Fiat sent at:</b> {fmtDate(selected.fiat_sent_at)}</p>
              <p><b>Fiat confirmed at:</b> {fmtDate(selected.fiat_confirmed_at)}</p>
              <p><b>Flags:</b> {Array.isArray(selected.flags) && selected.flags.length ? selected.flags.join(", ") : "-"}</p>
            </div>
            <div className="md:col-span-2">
              <pre className="rounded-lg bg-slate-950 text-slate-100 p-4 overflow-auto text-xs">
                {JSON.stringify(selected, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
