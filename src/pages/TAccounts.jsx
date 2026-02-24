import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

export default function TAccounts() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [token, setToken] = useState("ALL");
  const [direction, setDirection] = useState("ALL");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await api.get("/backoffice/ledger/t-accounts");
        if (mounted) {
          setRows(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        if (mounted) setError(err?.message || "Erreur chargement t-accounts");
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

  const directions = useMemo(() => {
    const uniq = new Set(rows.map((r) => String(r.direction || "").trim().toUpperCase()).filter(Boolean));
    return ["ALL", ...Array.from(uniq).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const tokenOk = token === "ALL" ? true : String(r.token || "") === token;
      const dirOk =
        direction === "ALL"
          ? true
          : String(r.direction || "").toUpperCase() === direction;
      if (!tokenOk || !dirOk) return false;
      if (!q) return true;
      const hay = `${r.account_code || ""} ${r.external_tx_id || ""} ${r.journal_id || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, token, direction]);

  const totals = useMemo(() => {
    const debit = filtered
      .filter((r) => String(r.direction || "").toUpperCase() === "DEBIT")
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const credit = filtered
      .filter((r) => String(r.direction || "").toUpperCase() === "CREDIT")
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    return {
      rows: filtered.length,
      debit,
      credit,
    };
  }, [filtered]);

  const fmtAmount = (v, max = 6) => {
    const n = Number(v);
    if (Number.isNaN(n)) return String(v ?? "-");
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: max,
    });
  };

  const fmtDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Ledger T-Accounts</h2>
        <p className="text-sm text-slate-500">Ecritures comptables detaillees et consultables.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Lignes" value={totals.rows} />
        <StatCard label="Total debit" value={fmtAmount(totals.debit)} />
        <StatCard label="Total credit" value={fmtAmount(totals.credit)} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher compte / tx externe / journal..."
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
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {directions.map((d) => (
              <option key={d} value={d}>
                {d === "ALL" ? "Toutes directions" : d}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setQuery("");
              setToken("ALL");
              setDirection("ALL");
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
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Compte</th>
                  <th className="px-3 py-2 text-left">Direction</th>
                  <th className="px-3 py-2 text-right">Montant</th>
                  <th className="px-3 py-2 text-left">Token</th>
                  <th className="px-3 py-2 text-left">Tx externe</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const active =
                    selected &&
                    selected.account_code === r.account_code &&
                    selected.occurred_at === r.occurred_at &&
                    selected.amount === r.amount &&
                    selected.direction === r.direction;
                  const dir = String(r.direction || "").toUpperCase();
                  return (
                    <tr
                      key={`${r.journal_id || "j"}-${i}`}
                      className={`cursor-pointer border-t ${active ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                      onClick={() => setSelected(r)}
                    >
                      <td className="px-3 py-2 text-slate-700">{fmtDate(r.occurred_at)}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{r.account_code}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            dir === "DEBIT"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {dir || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{fmtAmount(r.amount)}</td>
                      <td className="px-3 py-2 text-slate-700">{r.token || "-"}</td>
                      <td className="px-3 py-2 text-slate-500">{r.external_tx_id || "-"}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-slate-500" colSpan={6}>
                      Aucune ecriture.
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
                    <dd className="text-right text-slate-900 break-all">
                      {k === "amount" ? fmtAmount(v) : k === "occurred_at" ? fmtDate(v) : String(v ?? "-")}
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
