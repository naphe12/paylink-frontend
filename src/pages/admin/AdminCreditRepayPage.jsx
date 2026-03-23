import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

export default function AdminCreditRepayPage() {
  const [debtors, setDebtors] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const loadDebtors = async () => {
    setLoading(true);
    setError("");
    setActionMsg("");
    try {
      const data = await api.listAdminCreditDebtors(search ? { q: search } : {});
      const list = Array.isArray(data) ? data : [];
      setDebtors(list);
      setSelectedUserId((prev) => {
        if (!list.length) return "";
        if (prev && list.some((item) => item.user_id === prev)) return prev;
        return list[0].user_id;
      });
    } catch (err) {
      setError(err.message || "Erreur chargement dettes clients");
    } finally {
      setLoading(false);
    }
  };

  const selectedDebtor = useMemo(
    () => debtors.find((item) => item.user_id === selectedUserId) || null,
    [debtors, selectedUserId]
  );

  const loadDetail = async (creditLineId) => {
    if (!creditLineId) {
      setDetail(null);
      return;
    }
    try {
      const data = await api.getAdminCreditLineDetail(creditLineId);
      setDetail(data);
    } catch {
      setDetail(null);
    }
  };

  useEffect(() => {
    loadDebtors();
  }, []);

  useEffect(() => {
    loadDetail(selectedDebtor?.credit_line_id);
  }, [selectedDebtor?.credit_line_id]);

  const repay = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !repayAmount) return;
    setLoading(true);
    setError("");
    setActionMsg("");
    try {
      await api.repayAdminClientDebt(selectedUserId, Number(repayAmount));
      setActionMsg("Remboursement enregistre.");
      setRepayAmount("");
      await loadDebtors();
    } catch (err) {
      setError(err.message || "Echec du remboursement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-fuchsia-300 bg-fuchsia-50 px-4 py-3 text-sm font-semibold text-fuchsia-900">
        UI marker: credit-repay-select-v2
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Remboursement clients endettes</h1>
          <p className="text-sm text-slate-500">
            Liste les clients au wallet negatif ou avec credit utilise, puis enregistre un paiement admin.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer nom/email"
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <button
            onClick={loadDebtors}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm"
            disabled={loading}
          >
            {loading ? "..." : "Chercher"}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-4">
        <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Selection du client</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">-- selectionner un user --</option>
              {debtors.map((debtor) => (
                <option key={debtor.user_id} value={debtor.user_id}>
                  {debtor.full_name || debtor.email || debtor.user_id} | {debtor.debt_origin_label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Le select affiche uniquement les utilisateurs avec wallet negatif ou credit utilise.
            </p>
          </div>
          {selectedDebtor ? (
            <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
              <p><span className="font-semibold text-slate-900">Utilisateur:</span> {selectedDebtor.full_name || "Sans nom"}</p>
              <p><span className="font-semibold text-slate-900">Email:</span> {selectedDebtor.email || "-"}</p>
              <p><span className="font-semibold text-slate-900">Origine de la dette:</span> {selectedDebtor.debt_origin_label}</p>
              <p><span className="font-semibold text-slate-900">Wallet:</span> {Number(selectedDebtor.wallet_available || 0).toLocaleString()} {selectedDebtor.wallet_currency}</p>
              <p><span className="font-semibold text-slate-900">Credit du:</span> {Number(selectedDebtor.credit_due || 0).toLocaleString()} {selectedDebtor.credit_line_currency || selectedDebtor.wallet_currency}</p>
              <p><span className="font-semibold text-slate-900">Disponible ligne:</span> {Number(selectedDebtor.credit_available || 0).toLocaleString()} {selectedDebtor.credit_line_currency || selectedDebtor.wallet_currency}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucun utilisateur selectionne.</p>
          )}
        </div>

        <div className="space-y-4">
          {selectedDebtor ? (
            <>
              <div className="bg-white border rounded-2xl shadow-sm p-4">
                <p className="text-sm font-semibold text-slate-800 mb-2">
                  Enregistrer un remboursement
                </p>
                <form onSubmit={repay} className="flex items-center gap-3 flex-wrap">
                  <input
                    type="number"
                    step="0.01"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    className="rounded-lg border px-3 py-2 text-sm"
                    placeholder="Montant"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {loading ? "..." : "Enregistrer"}
                  </button>
                  {actionMsg ? <span className="text-sm text-green-600">{actionMsg}</span> : null}
                </form>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard label="Wallet" value={selectedDebtor.wallet_available} currency={selectedDebtor.wallet_currency} />
                <StatCard label="Credit du" value={selectedDebtor.credit_due} currency={selectedDebtor.credit_line_currency || selectedDebtor.wallet_currency} />
                <StatCard label="Disponible ligne" value={selectedDebtor.credit_available} currency={selectedDebtor.credit_line_currency || selectedDebtor.wallet_currency} />
              </div>

              {detail ? <EventsTable events={detail.events} /> : (
                <div className="bg-white border rounded-2xl shadow-sm p-6 text-slate-600">
                  Ce client n&apos;a pas de detail de ligne de credit. Le remboursement agit seulement sur le wallet.
                </div>
              )}
            </>
          ) : (
            <div className="bg-white border rounded-2xl shadow-sm p-6 text-slate-600">
              Selectionnez un client dans la liste.
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

function EventsTable({ events }) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50">
        <p className="text-sm font-semibold text-slate-800">Evenements ligne de credit</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Delta</th>
              <th className="p-3 text-left">Ancien disponible</th>
              <th className="p-3 text-left">Nouveau disponible</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-left">Source</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  Aucun evenement.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.event_id} className="border-t">
                  <td className="p-3 text-slate-700">
                    {ev.occurred_at ? new Date(ev.occurred_at).toLocaleString() : "-"}
                  </td>
                  <td className="p-3 text-slate-700">
                    {Number(ev.amount_delta || 0).toLocaleString()} {ev.currency_code}
                  </td>
                  <td className="p-3 text-slate-700">
                    {ev.old_limit != null ? Number(ev.old_limit).toLocaleString() : "-"}
                  </td>
                  <td className="p-3 text-slate-700">
                    {ev.new_limit != null ? Number(ev.new_limit).toLocaleString() : "-"}
                  </td>
                  <td className="p-3 text-slate-700">{ev.status || "-"}</td>
                  <td className="p-3 text-slate-700">{ev.source || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
