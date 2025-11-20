import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeEuro,
  BellRing,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import api from "@/services/api";

const STATUS_OPTIONS = [
  { label: "Tous", value: "" },
  { label: "En attente", value: "draft" },
  { label: "Actifs", value: "active" },
  { label: "En retard", value: "in_arrears" },
  { label: "Remboursés", value: "repaid" },
];

export default function AdminLoansPage() {
  const [stats, setStats] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const loadStats = async () => {
    try {
      const data = await api.getLoanStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadLoans = async () => {
    setLoadingLoans(true);
    try {
      const data = await api.getAdminLoans({
        status: statusFilter || undefined,
        overdue_only: overdueOnly,
      });
      setLoans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLoans(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadLoans();
  }, [statusFilter, overdueOnly]);

  const handleAnalyze = async (loanId) => {
    setActionLoading(loanId);
    setActionMessage(null);
    try {
      const res = await api.analyzeLoan(loanId);
      setActionMessage(
        res.decision === "approved"
          ? "Crédit validé, vous pouvez débloquer les fonds."
          : res.reason || "Analyse terminée."
      );
      await Promise.all([loadLoans(), loadStats()]);
    } catch (err) {
      setActionMessage(err.message || "Erreur lors de l'analyse.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisburse = async (loanId) => {
    setActionLoading(loanId);
    setActionMessage(null);
    try {
      await api.disburseLoan(loanId);
      setActionMessage("Crédit débloqué vers le portefeuille client.");
      await Promise.all([loadLoans(), loadStats()]);
    } catch (err) {
      setActionMessage(err.message || "Erreur lors du déblocage.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemind = async (loanId) => {
    const message =
      window.prompt(
        "Message de rappel (laisser vide pour utiliser le message par défaut) :"
      ) || undefined;
    setActionLoading(loanId);
    setActionMessage(null);
    try {
      const res = await api.remindLoan(loanId, message);
      setActionMessage(
        `Rappel envoyé (${res.overdue_installments} échéances en retard).`
      );
    } catch (err) {
      setActionMessage(err.message || "Erreur lors du rappel.");
    } finally {
      setActionLoading(null);
    }
  };

  const statsCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: "Crédits totaux",
        value: stats.loans?.total ?? 0,
        icon: <BadgeEuro size={20} />,
      },
      {
        label: "Actifs",
        value: stats.loans?.active ?? 0,
        icon: <CheckCircle2 size={20} />,
      },
      {
        label: "En retard",
        value: stats.loans?.in_arrears ?? 0,
        icon: <AlertTriangle size={20} />,
      },
      {
        label: "Encours (EUR)",
        value: stats.outstanding_balance?.toLocaleString(),
        icon: <BadgeEuro size={20} />,
      },
    ];
  }, [stats]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">
            Supervision crédits
          </h2>
          <p className="text-slate-500">
            Validez les demandes, débloquez les fonds et relancez les clients en
            retard.
          </p>
        </div>
        <button
          onClick={() => {
            loadLoans();
            loadStats();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
        >
          <RefreshCw size={16} /> Actualiser
        </button>
      </header>

      {statsCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statsCards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl shadow px-5 py-4 flex items-center gap-4"
            >
              <span className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                {card.icon}
              </span>
              <div>
                <p className="text-xs uppercase text-slate-400 tracking-[0.2em]">
                  {card.label}
                </p>
                <p className="text-2xl font-semibold text-slate-800">
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex gap-4 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Afficher seulement les impayés
            </label>
          </div>
          <p className="text-sm text-slate-500">
            {loans.length} dossier(s) affichés
          </p>
        </div>

        {actionMessage && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-indigo-800 flex items-center gap-2 text-sm">
            <BellRing size={16} />
            {actionMessage}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="py-3">Client</th>
                <th className="py-3">Montant</th>
                <th className="py-3">Restant</th>
                <th className="py-3">Risque</th>
                <th className="py-3">Statut</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingLoans && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    <Loader2 className="animate-spin mx-auto" />
                  </td>
                </tr>
              )}
              {!loadingLoans && loans.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Aucun crédit ne correspond à ce filtre.
                  </td>
                </tr>
              )}
              {loans.map((loan) => (
                <tr key={loan.loan_id} className="border-t text-slate-700">
                  <td className="py-3">
                    <p className="font-semibold">{loan.borrower_name || "N/A"}</p>
                    <p className="text-xs text-slate-400">{loan.borrower_email}</p>
                  </td>
                  <td className="py-3">
                    {loan.principal} {loan.currency_code}
                  </td>
                  <td className="py-3">
                    {loan.outstanding_balance} {loan.currency_code}
                  </td>
                  <td className="py-3 capitalize">
                    {loan.risk_level || "N/A"}
                    {loan.overdue && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                        <AlertTriangle size={12} /> Retard
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                        loan.status === "draft"
                          ? "bg-slate-100 text-slate-700"
                          : loan.status === "in_arrears"
                          ? "bg-red-100 text-red-700"
                          : loan.status === "active"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {loan.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {loan.status === "draft" && (
                        <button
                          onClick={() => handleAnalyze(loan.loan_id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50"
                        >
                          {actionLoading === loan.loan_id ? "..." : "Analyser"}
                        </button>
                      )}
                      {loan.status === "draft" && (
                        <button
                          onClick={() => handleDisburse(loan.loan_id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                        >
                          {actionLoading === loan.loan_id ? "..." : "Débloquer"}
                        </button>
                      )}
                      {loan.status === "in_arrears" && (
                        <button
                          onClick={() => handleRemind(loan.loan_id)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                        >
                          {actionLoading === loan.loan_id ? "..." : "Relancer"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
