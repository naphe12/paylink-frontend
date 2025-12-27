import { useEffect, useState } from "react";
import api from "@/services/api";
import { BadgeEuro, AlertTriangle, BellRing, RefreshCcw, HandCoins } from "lucide-react";

export default function AdminMicroFinancePage() {
  const [stats, setStats] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const [statsRes, overdueRes, debtRes] = await Promise.all([
        api.getLoanStats(),
        api.getAdminLoans({ overdue_only: true }),
        api.getAdminDebtors(200),
      ]);
      setStats(statsRes);
      setOverdue(overdueRes.items || overdueRes || []);
      setDebtors(debtRes);
    } catch (err) {
      setMessage(err.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remind = async (loanId) => {
    setActionLoading(loanId);
    setMessage("");
    try {
      const res = await api.remindLoan(loanId);
      setMessage(`Rappel envoye (${res.overdue_installments} echeances en retard).`);
    } catch (err) {
      setMessage(err.message || "Erreur lors du rappel.");
    } finally {
      setActionLoading(null);
    }
  };

  const sendRequest = async (identifier, amount) => {
    if (!identifier || !amount) return;
    setActionLoading(identifier);
    setMessage("");
    try {
      await api.createAdminPaymentRequest({
        user_identifier: identifier,
        amount: Number(amount),
        reason: "credit",
      });
      setMessage("Demande de paiement envoyee.");
    } catch (err) {
      setMessage(err.message || "Erreur lors de l'envoi de la demande.");
    } finally {
      setActionLoading(null);
    }
  };

  const cards = stats
    ? [
        { label: "Credits totaux", value: stats.loans?.total ?? 0, icon: <BadgeEuro size={18} /> },
        { label: "Actifs", value: stats.loans?.active ?? 0, icon: <BadgeEuro size={18} /> },
        { label: "En retard", value: stats.loans?.in_arrears ?? 0, icon: <AlertTriangle size={18} /> },
        { label: "Encours (EUR)", value: stats.outstanding_balance?.toLocaleString() ?? 0, icon: <BadgeEuro size={18} /> },
      ]
    : [];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Micro-finance</p>
          <h1 className="text-2xl font-bold text-slate-900">Encours, retards, relances</h1>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
        >
          <RefreshCcw size={16} /> Actualiser
        </button>
      </header>

      {message && <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-3 rounded-xl">{message}</div>}

      {cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-2xl shadow px-5 py-4 flex items-center gap-4">
              <span className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">{c.icon}</span>
              <div>
                <p className="text-xs uppercase text-slate-400 tracking-[0.2em]">{c.label}</p>
                <p className="text-2xl font-semibold text-slate-800">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="bg-white rounded-2xl shadow p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Credits en retard</h3>
          <span className="text-sm text-slate-500">{overdue.length} dossier(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 text-left">Client</th>
                <th className="py-2 text-left">Restant</th>
                <th className="py-2 text-left">Statut</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">
                    Chargement...
                  </td>
                </tr>
              ) : overdue.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">
                    Aucun retard detecte.
                  </td>
                </tr>
              ) : (
                overdue.map((loan) => (
                  <tr key={loan.loan_id} className="border-t text-slate-700">
                    <td className="py-2">
                      <div className="font-semibold">{loan.borrower_name || "N/A"}</div>
                      <div className="text-xs text-slate-500">{loan.borrower_email}</div>
                    </td>
                    <td className="py-2">
                      {loan.outstanding_balance} {loan.currency_code}
                    </td>
                    <td className="py-2 capitalize">{loan.status}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => remind(loan.loan_id)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                        >
                          {actionLoading === loan.loan_id ? "..." : "Relancer"}
                        </button>
                        <button
                          onClick={() => sendRequest(loan.borrower_email, loan.outstanding_balance)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                        >
                          {actionLoading === loan.borrower_email ? "..." : "Demander paiement"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Clients en dette (ligne ou solde -)</h3>
          <span className="text-sm text-slate-500">{debtors.length} client(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 text-left">Client</th>
                <th className="py-2 text-left">Credit utilise</th>
                <th className="py-2 text-left">Solde wallet</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {debtors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">
                    Aucun client en dette.
                  </td>
                </tr>
              ) : (
                debtors.map((d) => (
                  <tr key={d.user_id} className="border-t text-slate-700">
                    <td className="py-2">
                      <div className="font-semibold">{d.full_name || d.email || d.paytag || d.username}</div>
                      <div className="text-xs text-slate-500">{d.email || d.paytag || d.username}</div>
                    </td>
                    <td className="py-2">
                      {Number(d.credit_used).toLocaleString()} / {Number(d.credit_limit).toLocaleString()}
                    </td>
                    <td className="py-2">
                      {Number(d.wallet_available).toLocaleString()} {d.wallet_currency || ""}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => sendRequest(d.email || d.paytag || d.username, Math.max(d.credit_used, -d.wallet_available || 0))}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
                      >
                        <HandCoins size={14} /> Demander
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
