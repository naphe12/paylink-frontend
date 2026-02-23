import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
const API_URL = import.meta.env.VITE_API_URL || "";

export default function EscrowQueue() {
  const [status, setStatus] = useState("FUNDED");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/backoffice/escrow/orders?status=${encodeURIComponent(status)}`);
      const list = Array.isArray(data) ? data : [];
      setOrders(list);
      if (selected) {
        const refreshed = list.find((o) => o.id === selected.id);
        setSelected(refreshed || selected);
      }
    } catch (err) {
      setError(err.message || "Erreur chargement escrow");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const hay = [
        o.id,
        o.status,
        o.user_name,
        o.user_id,
        o.trader_name,
        o.trader_id,
        o.deposit_tx_hash,
        o.payout_reference,
      ]
        .map((v) => String(v || ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query]);

  const fmtDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  };

  const fmtAmount = (v, code, maxFraction = 2) => {
    if (v === null || v === undefined) return "-";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return `${n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFraction,
    })}${code ? ` ${code}` : ""}`;
  };

  const statusClass = (s) => {
    const v = String(s || "").toUpperCase();
    if (v === "PAID_OUT") return "bg-emerald-100 text-emerald-700";
    if (v === "PAYOUT_PENDING") return "bg-amber-100 text-amber-700";
    if (v === "FAILED" || v === "CANCELLED") return "bg-rose-100 text-rose-700";
    if (v === "FUNDED" || v === "SWAPPED") return "bg-sky-100 text-sky-700";
    return "bg-slate-100 text-slate-700";
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
            <h1 className="text-2xl font-semibold text-slate-900">Escrow Queue</h1>
            <p className="text-sm text-slate-500 mt-1">
              Suivi backoffice des ordres escrow, statuts et montants.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchOrders}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
          >
            {loading ? "Chargement..." : "Rafraichir"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="CREATED">CREATED</option>
            <option value="FUNDED">FUNDED</option>
            <option value="SWAPPED">SWAPPED</option>
            <option value="PAYOUT_PENDING">PAYOUT_PENDING</option>
            <option value="PAID_OUT">PAID_OUT</option>
            <option value="FAILED">FAILED</option>
          </select>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Rechercher id, user, tx hash..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {filtered.length} ordre(s)
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
                  <th className="text-left px-3 py-2 font-medium">Order ID</th>
                  <th className="text-left px-3 py-2 font-medium">Client</th>
                  <th className="text-left px-3 py-2 font-medium">Trader</th>
                  <th className="text-left px-3 py-2 font-medium">USDC</th>
                  <th className="text-left px-3 py-2 font-medium">BIF</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelected(o)}
                    className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{o.id}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{o.user_name || "-"}</div>
                      <div className="font-mono text-[11px] text-slate-500">{o.user_id || "-"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{o.trader_name || "-"}</div>
                      <div className="font-mono text-[11px] text-slate-500">{o.trader_id || "-"}</div>
                    </td>
                    <td className="px-3 py-2">{fmtAmount(o.usdc_expected, "USDC", 6)}</td>
                    <td className="px-3 py-2">{fmtAmount(o.bif_target, "BIF", 2)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusClass(o.status)}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${riskClass(o.risk_score)}`}>
                        {o.risk_score ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      Aucun ordre trouve.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Detail ordre</h2>
        {!selected ? (
          <p className="text-sm text-slate-500 mt-2">Clique une ligne pour voir les details.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 p-3">
                <p><b>ID:</b> {selected.id}</p>
                <p><b>Status:</b> {selected.status}</p>
                <p><b>Created:</b> {fmtDate(selected.created_at)}</p>
                <p><b>Updated:</b> {fmtDate(selected.updated_at)}</p>
                <p><b>Funded at:</b> {fmtDate(selected.funded_at)}</p>
                <p><b>Swapped at:</b> {fmtDate(selected.swapped_at)}</p>
                <p><b>Payout initiated:</b> {fmtDate(selected.payout_initiated_at)}</p>
                <p><b>Paid out at:</b> {fmtDate(selected.paid_out_at)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p><b>Client:</b> {selected.user_name || selected.user_id || "-"}</p>
                <p><b>Trader:</b> {selected.trader_name || selected.trader_id || "-"}</p>
                <p><b>USDC expected:</b> {fmtAmount(selected.usdc_expected, "USDC", 6)}</p>
                <p><b>USDC received:</b> {fmtAmount(selected.usdc_received, "USDC", 6)}</p>
                <p><b>USDT target:</b> {fmtAmount(selected.usdt_target, "USDT", 6)}</p>
                <p><b>USDT received:</b> {fmtAmount(selected.usdt_received, "USDT", 6)}</p>
                <p><b>BIF target:</b> {fmtAmount(selected.bif_target, "BIF", 2)}</p>
                <p><b>BIF paid:</b> {fmtAmount(selected.bif_paid, "BIF", 2)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 md:col-span-2">
                <p><b>Deposit network:</b> {selected.deposit_network || "-"}</p>
                <p><b>Deposit address:</b> {selected.deposit_address || "-"}</p>
                <p><b>Deposit tx hash:</b> {selected.deposit_tx_hash || "-"}</p>
                <p><b>Payout method:</b> {selected.payout_method || "-"}</p>
                <p><b>Payout provider:</b> {selected.payout_provider || "-"}</p>
                <p><b>Payout account:</b> {selected.payout_account_name || "-"} / {selected.payout_account_number || "-"}</p>
                <p><b>Payout reference:</b> {selected.payout_reference || "-"}</p>
                <p><b>Flags:</b> {Array.isArray(selected.flags) && selected.flags.length ? selected.flags.join(", ") : "-"}</p>
              </div>
            </div>
            <a
              href={`${API_URL}/backoffice/escrow/orders/${selected.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Ouvrir endpoint detail ordre
            </a>
            <pre className="rounded-lg bg-slate-950 text-slate-100 p-4 overflow-auto text-xs">
              {JSON.stringify(selected, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
