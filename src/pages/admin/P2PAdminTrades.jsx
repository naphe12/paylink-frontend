import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

export default function P2PAdminTrades() {
  const [trades, setTrades] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.get("/api/admin/p2p/trades");
      setTrades(Array.isArray(data) ? data : []);
    } catch (e) {
      setTrades([]);
      setError(e?.message || "Impossible de charger les trades");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
              <p><b>Escrow tx hash:</b> {selected.escrow_tx_hash || "-"}</p>
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
