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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border rounded-2xl bg-white shadow-sm">
          <div className="px-4 py-3 border-b bg-slate-50 text-sm font-semibold text-slate-700">
            Debiteurs
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y">
            {debtors.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Aucun client avec dette.</p>
            ) : (
              debtors.map((debtor) => {
                const active = debtor.user_id === selectedUserId;
                return (
                  <button
                    key={debtor.user_id}
                    onClick={() => setSelectedUserId(debtor.user_id)}
                    className={`w-full text-left p-3 transition ${
                      active ? "bg-slate-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {debtor.full_name || "Sans nom"}
                        </p>
                        <p className="text-xs text-slate-500">{debtor.email || "-"}</p>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {debtor.wallet_currency}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">
                      Wallet: {Number(debtor.wallet_available || 0).toLocaleString()} {debtor.wallet_currency}
                    </p>
                    <p className="text-sm text-slate-700">
                      Credit du: {Number(debtor.credit_due || 0).toLocaleString()} {debtor.credit_line_currency || debtor.wallet_currency}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
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
