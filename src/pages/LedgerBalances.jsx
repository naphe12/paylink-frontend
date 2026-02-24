import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

export default function LedgerBalances() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [token, setToken] = useState("ALL");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await api.get("/backoffice/ledger/balances");
        if (mounted) {
          setRows(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        if (mounted) setError(err?.message || "Erreur chargement balances");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const tokens = useMemo(() => {
    const uniq = new Set(rows.map((r) => String(r.token || "").trim()).filter(Boolean));
    return ["ALL", ...Array.from(uniq).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const tokenOk = token === "ALL" ? true : String(r.token || "") === token;
      if (!tokenOk) return false;
      if (!q) return true;
      const hay = `${r.account_code || ""} ${r.token || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, token]);

  const totals = useMemo(() => {
    const balance = filtered.reduce((acc, r) => acc + (Number(r.balance) || 0), 0);
    return {
      rows: filtered.length,
      accounts: new Set(filtered.map((r) => r.account_code)).size,
      totalBalance: balance,
    };
  }, [filtered]);

  const fmt = (value, max = 6) => {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value ?? "-");
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: max,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Ledger Balances</h2>
          <p className="text-sm text-slate-500">Balances par compte/token avec details.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Lignes" value={totals.rows} />
        <StatCard label="Comptes uniques" value={totals.accounts} />
        <StatCard label="Total balance (filtre)" value={fmt(totals.totalBalance)} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher compte/token..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <select
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {tokens.map((t) => (
              <option key={t} value={t}>
                {t === "ALL" ? "Tous les tokens" : t}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setQuery("");
              setToken("ALL");
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reinitialiser
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Compte</th>
                  <th className="px-3 py-2 text-left">Token</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const active = selected && selected.account_code === r.account_code && selected.token === r.token;
                  return (
                    <tr
                      key={`${r.account_code}-${r.token}-${i}`}
                      className={`cursor-pointer border-t ${active ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                      onClick={() => setSelected(r)}
                    >
                      <td className="px-3 py-2 font-medium text-slate-800">{r.account_code}</td>
                      <td className="px-3 py-2 text-slate-700">{r.token}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{fmt(r.balance)}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-slate-500" colSpan={3}>
                      Aucune ligne.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Details</h3>
            {!selected ? (
              <p className="mt-3 text-sm text-slate-500">Selectionnez une ligne pour afficher les details.</p>
            ) : (
              <dl className="mt-3 space-y-2 text-sm">
                {Object.entries(selected).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-2">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-slate-900 break-all text-right">
                      {k === "balance" ? fmt(v) : String(v ?? "-")}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
