import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import api from "@/services/api";

const initialForm = {
  principal: "",
  term_months: 3,
  currency_code: "EUR",
  apr_percent: 12,
};

export default function LoansPage() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applyForm, setApplyForm] = useState(initialForm);
  const [applyLoading, setApplyLoading] = useState(false);
  const [repayValues, setRepayValues] = useState({});
  const [feedback, setFeedback] = useState(null);

  const loadPortfolio = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLoanPortfolio();
      setPortfolio(data);
    } catch (err) {
      console.error(err);
      setError("Impossible de récupérer vos crédits pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!applyForm.principal) return;
    setApplyLoading(true);
    setFeedback(null);
    try {
      const payload = {
        principal: Number(applyForm.principal),
        term_months: Number(applyForm.term_months),
        currency_code: applyForm.currency_code,
        apr_percent: Number(applyForm.apr_percent),
      };
      const res = await api.applyLoan(payload);
      setFeedback(
        res.decision === "pending"
          ? "Demande envoyée, un administrateur doit la valider."
          : res.reason || "Demande traitée."
      );
      setApplyForm(initialForm);
      await loadPortfolio();
    } catch (err) {
      setFeedback(err.message || "Erreur lors de la demande.");
    } finally {
      setApplyLoading(false);
    }
  };

  const handleRepay = async (loanId) => {
    const amount = repayValues[loanId];
    if (!amount || Number(amount) <= 0) return;
    setFeedback(null);
    try {
      await api.repayLoan(loanId, Number(amount));
      setRepayValues((prev) => ({ ...prev, [loanId]: "" }));
      setFeedback("Paiement enregistré.");
      await loadPortfolio();
    } catch (err) {
      setFeedback(err.message || "Erreur lors du paiement.");
    }
  };

  const summary = useMemo(() => {
    if (!portfolio) return null;
    return [
      {
        label: "Plafond de crédit",
        value: `${portfolio.credit_limit} ${portfolio?.loans?.[0]?.currency_code || "EUR"}`,
        icon: <CreditCard size={20} />,
      },
      {
        label: "Crédit utilisé",
        value: `${portfolio.credit_used} ${portfolio?.loans?.[0]?.currency_code || "EUR"}`,
        icon: <TrendingDown size={20} />,
      },
      {
        label: "Disponible",
        value: `${portfolio.available_credit} ${portfolio?.loans?.[0]?.currency_code || "EUR"}`,
        icon: <ShieldCheck size={20} />,
      },
      {
        label: "Score risque",
        value: portfolio.risk_score,
        icon: <AlertTriangle size={20} />,
      },
    ];
  }, [portfolio]);

  if (loading) {
    return <p>Chargement...</p>;
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow text-red-600">{error}</div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 mb-1">
          Crédit court terme
        </h2>
        <p className="text-slate-500">
          Suivez vos demandes de crédit, l&apos;échéancier et remboursez directement
          depuis votre solde PayLink.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {summary.map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-2xl shadow px-5 py-4 flex items-center gap-4"
            >
              <span className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                {item.icon}
              </span>
              <div>
                <p className="text-xs uppercase text-slate-400 tracking-[0.2em]">
                  {item.label}
                </p>
                <p className="text-xl font-semibold text-slate-800">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {feedback && (
        <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-3 rounded-xl">
          {feedback}
        </div>
      )}

      <section className="bg-white rounded-2xl shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">
          Demander un crédit
        </h3>
        <form className="grid md:grid-cols-2 gap-4" onSubmit={handleApply}>
          <div>
            <label className="text-sm text-slate-500">Montant souhaité</label>
            <input
              type="number"
              min="1"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={applyForm.principal}
              onChange={(e) =>
                setApplyForm((prev) => ({ ...prev, principal: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="text-sm text-slate-500">Durée (mois)</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={applyForm.term_months}
              onChange={(e) =>
                setApplyForm((prev) => ({
                  ...prev,
                  term_months: Number(e.target.value),
                }))
              }
            >
              {[1, 2, 3, 4, 5, 6].map((months) => (
                <option key={months} value={months}>
                  {months} mois
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-500">Devise</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 uppercase"
              value={applyForm.currency_code}
              onChange={(e) =>
                setApplyForm((prev) => ({
                  ...prev,
                  currency_code: e.target.value.toUpperCase(),
                }))
              }
              maxLength={3}
            />
          </div>
          <div>
            <label className="text-sm text-slate-500">APR (%)</label>
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={applyForm.apr_percent}
              onChange={(e) =>
                setApplyForm((prev) => ({
                  ...prev,
                  apr_percent: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={applyLoading}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {applyLoading ? "Envoi..." : "Soumettre la demande"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Mes crédits
          </h3>
          <span className="text-sm text-slate-500">
            {portfolio?.loans?.length || 0} dossier(s)
          </span>
        </div>

        {portfolio?.loans?.length === 0 && (
          <p className="text-slate-500">Aucun crédit pour le moment.</p>
        )}

        <div className="space-y-5">
          {portfolio?.loans?.map((loan) => (
            <div
              key={loan.loan_id}
              className="border border-slate-100 rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <p className="text-sm text-slate-500">Crédit #{loan.loan_id}</p>
                  <p className="text-xl font-semibold text-slate-800">
                    {loan.principal} {loan.currency_code} • {loan.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400 uppercase tracking-[0.3em]">
                    Reste
                  </p>
                  <p className="text-xl font-semibold text-slate-800">
                    {loan.outstanding_balance} {loan.currency_code}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-500">
                <div>
                  <p className="text-xs uppercase text-slate-400">APR</p>
                  <p className="font-medium text-slate-800">
                    {loan.apr_percent}% / an
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Durée</p>
                  <p className="font-medium text-slate-800">{loan.term_months} mois</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Risque</p>
                  <p className="font-medium text-slate-800">
                    {loan.risk_level || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Statut</p>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                      loan.status === "in_arrears"
                        ? "bg-red-50 text-red-700"
                        : loan.status === "active"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {loan.status}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">
                  Échéancier
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400">
                        <th className="py-2">Date</th>
                        <th className="py-2">Montant dû</th>
                        <th className="py-2">Payé</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loan.installments.map((inst) => {
                        const settled =
                          Number(inst.paid_amount || 0) >= Number(inst.due_amount || 0);
                        return (
                          <tr key={inst.repayment_id} className="border-t text-slate-700">
                            <td className="py-2">{inst.due_date}</td>
                            <td className="py-2">{inst.due_amount}</td>
                            <td className="py-2">{inst.paid_amount || "-"}</td>
                            <td className="py-2">
                              {settled ? (
                                <span className="text-emerald-600">Payé</span>
                              ) : (
                                <span className="text-slate-500">À payer</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {["active", "in_arrears"].includes(loan.status) && (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1">
                    <label className="text-sm text-slate-500">Montant à payer</label>
                    <input
                      type="number"
                      min="0"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={repayValues[loan.loan_id] || ""}
                      onChange={(e) =>
                        setRepayValues((prev) => ({
                          ...prev,
                          [loan.loan_id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <button
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium"
                    onClick={() => handleRepay(loan.loan_id)}
                  >
                    Régler cette échéance
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
