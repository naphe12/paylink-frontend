import { useEffect, useState } from "react";
import api from "@/services/api";

export default function UnbalancedJournalsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getUnbalancedJournals(200);
      setRows(Array.isArray(data?.items) ? data.items : []);
      if (!Array.isArray(data?.items) || data.items.length === 0) {
        setSelectedId("");
        setDetails(null);
      }
    } catch (err) {
      setError(err?.message || "Impossible de charger les journaux non equilibres.");
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (journalId) => {
    setDetailsLoading(true);
    setDetailsError("");
    try {
      const data = await api.getUnbalancedJournalEntries(journalId);
      setDetails(data);
    } catch (err) {
      setDetails(null);
      setDetailsError(err?.message || "Impossible de charger le detail du journal.");
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadDetails(selectedId);
  }, [selectedId]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Journaux non equilibres</h1>
          <p className="text-sm text-slate-500">Diagnostic comptable des ecritures ledger.</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          disabled={loading}
        >
          {loading ? "Chargement..." : "Rafraichir"}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          Aucun journal non equilibre detecte.
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-700">
              Liste ({rows.length})
            </div>
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">Journal</th>
                    <th className="text-right px-3 py-2">Debit</th>
                    <th className="text-right px-3 py-2">Credit</th>
                    <th className="text-right px-3 py-2">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const active = selectedId === row.journal_id;
                    return (
                      <tr
                        key={row.journal_id}
                        className={`cursor-pointer border-t border-slate-100 ${active ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                        onClick={() => setSelectedId(row.journal_id)}
                      >
                        <td className="px-3 py-2 align-top">
                          <div className="font-mono text-xs text-slate-700">{row.journal_id}</div>
                          <div className="text-[11px] text-slate-500">{row.description || "-"}</div>
                        </td>
                        <td className="px-3 py-2 text-right">{Number(row.total_debit || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{Number(row.total_credit || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600">
                          {Number(row.gap || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-700">Detail</div>
            <div className="p-4">
              {!selectedId && <p className="text-sm text-slate-500">Selectionne un journal.</p>}
              {detailsLoading && <p className="text-sm text-slate-500">Chargement du detail...</p>}
              {detailsError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{detailsError}</div>
              )}
              {details && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>
                      <span className="font-semibold">Journal:</span> <span className="font-mono">{details.journal_id}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Tx:</span> <span className="font-mono">{details.tx_id || "-"}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Gap:</span>{" "}
                      <span className="font-semibold text-red-600">{Number(details.gap || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="max-h-[420px] overflow-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="text-left px-3 py-2">Compte</th>
                          <th className="text-left px-3 py-2">Direction</th>
                          <th className="text-right px-3 py-2">Montant</th>
                          <th className="text-left px-3 py-2">Devise</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(details.entries || []).map((entry) => (
                          <tr key={entry.entry_id} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              <div className="font-mono">{entry.account_code || "-"}</div>
                              <div className="text-slate-500">{entry.account_name || ""}</div>
                            </td>
                            <td className="px-3 py-2">{entry.direction}</td>
                            <td className="px-3 py-2 text-right">{Number(entry.amount || 0).toLocaleString()}</td>
                            <td className="px-3 py-2">{entry.currency_code}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
