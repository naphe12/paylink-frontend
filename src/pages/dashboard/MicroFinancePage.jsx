import { useEffect, useState } from "react";
import api from "@/services/api";
import { BadgeEuro, ShieldCheck, TrendingDown, AlertTriangle, RefreshCcw } from "lucide-react";

const initialForm = {
  principal: "",
  term_months: 3,
  currency_code: "EUR",
  apr_percent: 12,
};

export default function MicroFinancePage() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [applyForm, setApplyForm] = useState(initialForm);
  const [applyLoading, setApplyLoading] = useState(false);
  const [repayValues, setRepayValues] = useState({});

  const load = async () => {
    setLoading(true);
    setFeedback("");
    try {
      const data = await api.getLoanPortfolio();
      setPortfolio(data);
    } catch (err) {
      setFeedback(err.message || "Impossible de charger vos micro-credits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!applyForm.principal) return;
    setApplyLoading(true);
    setFeedback("");
    try {
      await api.applyLoan({
        principal: Number(applyForm.principal),
        term_months: Number(applyForm.term_months),
        currency_code: applyForm.currency_code,
        apr_percent: Number(applyForm.apr_percent),
      });
      setFeedback("Demande envoyee, un admin doit la valider.");
      setApplyForm(initialForm);
      load();
    } catch (err) {
      setFeedback(err.message || "Erreur lors de la demande.");
    } finally {
      setApplyLoading(false);
    }
  };

  const handleRepay = async (loanId) => {
    const amount = repayValues[loanId];
    if (!amount || Number(amount) <= 0) return;
    setFeedback("");
    try {
      await api.repayLoan(loanId, Number(amount));
      setRepayValues((prev) => ({ ...prev, [loanId]: "" }));
      setFeedback("Paiement enregistre.");
      load();
    } catch (err) {
      setFeedback(err.message || "Erreur lors du paiement.");
    }
  };

  if (loading) return <p>Chargement...</p>;

  const currency = portfolio?.loans?.[0]?.currency_code || "EUR";
  const cards = [
    { label: "Plafond", value: portfolio?.credit_limit ?? 0, icon: <BadgeEuro size={20} /> },
    { label: "Utilise", value: portfolio?.credit_used ?? 0, icon: <TrendingDown size={20} /> },
    { label: "Disponible", value: portfolio?.available_credit ?? 0, icon: <ShieldCheck size={20} /> },
    { label: "Score risque", value: portfolio?.risk_score ?? 0, icon: <AlertTriangle size={20} /> },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Micro-finance</p>
          <h1 className="text-2xl font-bold text-slate-900">Credits et remboursements</h1>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
        >
          <RefreshCcw size={16} /> Actualiser
        </button>
      </header>

      {feedback && <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-3 rounded-xl">{feedback}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl shadow px-5 py-4 flex items-center gap-4">
            <span className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-700">
              {c.icon}
            </span>
            <div>
              <p className="text-xs uppercase text-slate-400 tracking-[0.2em]">{c.label}</p>
              <p className="text-xl font-semibold text-slate-800">
                {c.value} {currency}
              </p>
            </div>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-2xl shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Demander un credit</h3>
        <form className="grid md:grid-cols-2 gap-4" onSubmit={handleApply}>
          <div>
            <label className="text-sm text-slate-500">Montant</label>
            <input
              type="number"
              min="1"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={applyForm.principal}
              onChange={(e) => setApplyForm((prev) => ({ ...prev, principal: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm text-slate-500">Duree (mois)</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={applyForm.term_months}
              onChange={(e) => setApplyForm((prev) => ({ ...prev, term_months: Number(e.target.value) }))}
            >
              {[1, 2, 3, 4, 5, 6].map((m) => (
                <option key={m} value={m}>
                  {m} mois
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-500">Devise</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 uppercase"
              value={applyForm.currency_code}
              onChange={(e) => setApplyForm((prev) => ({ ...prev, currency_code: e.target.value.toUpperCase() }))}
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
              onChange={(e) => setApplyForm((prev) => ({ ...prev, apr_percent: Number(e.target.value) }))}
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
          <h3 className="text-lg font-semibold text-slate-800">Mes credits</h3>
          <span className="text-sm text-slate-500">{portfolio?.loans?.length || 0} dossier(s)</span>
        </div>

        {portfolio?.loans?.length === 0 && <p className="text-slate-500">Aucun credit pour le moment.</p>}

        <div className="space-y-5">
          {portfolio?.loans?.map((loan) => (
            <div key={loan.loan_id} className="border border-slate-100 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <p className="text-sm text-slate-500">Credit #{loan.loan_id}</p>
                  <p className="text-xl font-semibold text-slate-800">
                    {loan.principal} {loan.currency_code} - {loan.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-slate-400 tracking-[0.3em]">Reste</p>
                  <p className="text-xl font-semibold text-slate-800">
                    {loan.outstanding_balance} {loan.currency_code}
                  </p>
                </div>
              </div>

              {["active", "in_arrears"].includes(loan.status) && (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-500">Montant a payer</label>
                    <input
                      type="number"
                      min="0"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={repayValues[loan.loan_id] || ""}
                      onChange={(e) => setRepayValues((prev) => ({ ...prev, [loan.loan_id]: e.target.value }))}
                    />
                  </div>
                  <button
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium"
                    onClick={() => handleRepay(loan.loan_id)}
                  >
                    Payer
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
