import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "@/services/api";

export default function AdminCreditLinesPage() {
  const [lines, setLines] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [increaseAmount, setIncreaseAmount] = useState("");
  const [decreaseAmount, setDecreaseAmount] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const filterUserId = searchParams.get("user_id") || "";

  const loadLines = async () => {
    setLoading(true);
    setError("");
    setActionMsg("");
    try {
      const params = {};
      if (search) params.q = search;
      if (filterUserId) params.user_id = filterUserId;
      const data = await api.listAdminCreditLines(params);
      const list = Array.isArray(data) ? data : [];
      setLines(list);
      setSelectedId((prev) => {
        if (!list.length) return "";
        if (prev && list.some((item) => item.credit_line_id === prev)) return prev;
        return list[0].credit_line_id;
      });
    } catch (err) {
      setError(err.message || "Erreur chargement lignes de credit");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError("");
    setActionMsg("");
    try {
      const data = await api.getAdminCreditLineDetail(id);
      setDetail(data);
    } catch (err) {
      setError(err.message || "Erreur chargement du detail");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLines();
  }, [filterUserId]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId]);

  const selectedLine = useMemo(
    () => lines.find((line) => line.credit_line_id === selectedId),
    [lines, selectedId]
  );

  const increaseLimit = async (e) => {
    e.preventDefault();
    if (!selectedId || !increaseAmount) return;
    setError("");
    setActionMsg("");
    setLoading(true);
    try {
      await api.increaseAdminCreditLine(selectedId, Number(increaseAmount));
      setActionMsg("Ligne de credit augmentee.");
      setIncreaseAmount("");
      await loadLines();
      await loadDetail(selectedId);
    } catch (err) {
      setError(err.message || "Echec de l'augmentation");
    } finally {
      setLoading(false);
    }
  };

  const decreaseLimit = async (e) => {
    e.preventDefault();
    if (!selectedId || !decreaseAmount) return;
    setError("");
    setActionMsg("");
    setLoading(true);
    try {
      await api.decreaseAdminCreditLine(selectedId, Number(decreaseAmount));
      setActionMsg("Ligne de credit diminuee.");
      setDecreaseAmount("");
      await loadLines();
      await loadDetail(selectedId);
    } catch (err) {
      setError(err.message || "Echec de la diminution");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lignes de credit</h1>
          <p className="text-sm text-slate-500">
            Augmentez ou diminuez la ligne de credit d&apos;un utilisateur.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer nom/email"
            className="rounded-lg border px-3 py-2 text-sm"
            disabled={Boolean(filterUserId)}
          />
          <button
            onClick={loadLines}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
            disabled={loading}
          >
            {loading ? "..." : "Chercher"}
          </button>
          <button
            onClick={() => navigate("/dashboard/admin/credit-lines/repay")}
            className="rounded-lg border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Aller aux remboursements
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white shadow-sm lg:col-span-1">
          <div className="border-b bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Utilisateurs</div>
          <div className="max-h-[520px] divide-y overflow-y-auto">
            {lines.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Aucune ligne trouvee.</p>
            ) : (
              lines.map((line) => {
                const active = line.credit_line_id === selectedId;
                return (
                  <button
                    key={line.credit_line_id}
                    onClick={() => setSelectedId(line.credit_line_id)}
                    className={`w-full p-3 text-left transition ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{line.full_name || "Sans nom"}</p>
                        <p className="text-xs text-slate-500">{line.email}</p>
                      </div>
                      <div className="font-mono text-xs text-slate-500">{line.credit_line_id.slice(0, 6)}...</div>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      Restant: {Number(line.outstanding_amount).toLocaleString()} {line.currency_code}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-semibold text-slate-800">Augmenter la ligne de credit</p>
                  <form onSubmit={increaseLimit} className="flex flex-wrap items-center gap-3">
                    <input
                      type="number"
                      step="0.01"
                      value={increaseAmount}
                      onChange={(e) => setIncreaseAmount(e.target.value)}
                      className="rounded-lg border px-3 py-2 text-sm"
                      placeholder="Montant"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {loading ? "..." : "Augmenter"}
                    </button>
                  </form>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-semibold text-slate-800">Diminuer la ligne de credit</p>
                  <form onSubmit={decreaseLimit} className="flex flex-wrap items-center gap-3">
                    <input
                      type="number"
                      step="0.01"
                      value={decreaseAmount}
                      onChange={(e) => setDecreaseAmount(e.target.value)}
                      className="rounded-lg border px-3 py-2 text-sm"
                      placeholder="Montant"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {loading ? "..." : "Diminuer"}
                    </button>
                  </form>
                </div>
              </div>

              {actionMsg && <p className="text-sm text-green-600">{actionMsg}</p>}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="Montant initial" value={detail.credit_line.initial_amount} currency={detail.credit_line.currency_code} />
                <StatCard label="Utilise" value={detail.credit_line.used_amount} currency={detail.credit_line.currency_code} />
                <StatCard label="Restant" value={detail.credit_line.outstanding_amount} currency={detail.credit_line.currency_code} />
              </div>

              <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <div className="border-b bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">Evenements</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="p-3 text-left">Date</th>
                        <th className="p-3 text-left">Delta montant</th>
                        <th className="p-3 text-left">Ancien restant</th>
                        <th className="p-3 text-left">Nouveau restant</th>
                        <th className="p-3 text-left">Statut</th>
                        <th className="p-3 text-left">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.events.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500">
                            Aucun evenement.
                          </td>
                        </tr>
                      ) : (
                        detail.events.map((ev) => {
                          const delta = Number(ev.amount_delta || 0);
                          return (
                            <tr key={ev.event_id} className="border-t">
                              <td className="p-3 text-slate-700">
                                {ev.occurred_at
                                  ? new Date(ev.occurred_at).toLocaleString()
                                  : ev.created_at
                                  ? new Date(ev.created_at).toLocaleString()
                                  : "-"}
                              </td>
                              <td className={`p-3 font-semibold ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {delta >= 0 ? "+" : "-"} {Math.abs(delta).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ev.currency_code}
                              </td>
                              <td className="p-3 text-slate-700">{ev.old_limit != null ? Number(ev.old_limit).toLocaleString() : "-"}</td>
                              <td className="p-3 text-slate-700">{ev.new_limit != null ? Number(ev.new_limit).toLocaleString() : "-"}</td>
                              <td className="p-3 text-slate-600">{ev.status || "-"}</td>
                              <td className="p-3 text-slate-600">{ev.source || "-"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border bg-white p-6 text-slate-600 shadow-sm">
              Selectionnez un utilisateur dans la liste pour voir le detail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, currency }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">
        {Number(value || 0).toLocaleString()} {currency}
      </p>
    </div>
  );
}
