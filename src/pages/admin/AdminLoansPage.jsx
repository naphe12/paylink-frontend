import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeEuro,
  BellRing,
  CheckCircle2,
  Loader2,
  RefreshCw,
  FileCheck,
  Anchor,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
} from "lucide-react";
import api from "@/services/api";
import CollateralForm from "./CollateralForm";

const STATUS_OPTIONS = [
  { label: "Tous", value: "" },
  { label: "En attente", value: "draft" },
  { label: "Actifs", value: "active" },
  { label: "En retard", value: "in_arrears" },
  { label: "Rembourses", value: "repaid" },
];

export default function AdminLoansPage() {
  const [stats, setStats] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [docsByLoan, setDocsByLoan] = useState({});
  const [colsByLoan, setColsByLoan] = useState({});
  const [expandedLoan, setExpandedLoan] = useState(null);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

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
        limit,
        offset,
      });
      const items = data?.items || [];
      setLoans(items);
      setTotal(typeof data?.total === "number" ? data.total : items.length);
    } catch (err) {
      console.error(err);
      setActionMessage(err.message || "Erreur chargement credits");
      setLoans([]);
    } finally {
      setLoadingLoans(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadLoans();
  }, [statusFilter, overdueOnly, limit, offset]);

  const handleAnalyze = async (loanId) => {
    setActionLoading(loanId);
    setActionMessage(null);
    try {
      const res = await api.analyzeLoan(loanId);
      setActionMessage(
        res.decision === "approved"
          ? "Credit valide, vous pouvez debloquer les fonds."
          : res.reason || "Analyse terminee."
      );
      await Promise.all([loadLoans(), loadStats()]);
    } catch (err) {
      setActionMessage(err.message || "Erreur lors de l'analyse.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (loanId) => {
    setActionLoading(loanId);
    setActionMessage(null);
    try {
      await api.approveAdminLoan(loanId);
      setActionMessage("Credit valide (status: active).");
      await Promise.all([loadLoans(), loadStats()]);
    } catch (err) {
      setActionMessage(err.message || "Erreur lors de la validation.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisburse = async (loanId) => {
    setActionLoading(loanId);
    setActionMessage(null);
    try {
      await api.disburseLoan(loanId);
      setActionMessage("Credit debloque vers le portefeuille client.");
      await Promise.all([loadLoans(), loadStats()]);
    } catch (err) {
      setActionMessage(err.message || "Erreur lors du deblocage.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemind = async (loanId) => {
    const message =
      window.prompt("Message de rappel (laisser vide pour utiliser le message par defaut) :") || undefined;
    setActionLoading(loanId);
    setActionMessage(null);
    try {
      const res = await api.remindLoan(loanId, message);
      setActionMessage(`Rappel envoye (${res.overdue_installments} echeances en retard).`);
    } catch (err) {
      setActionMessage(err.message || "Erreur lors du rappel.");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePenalty = async (loanId) => {
    setActionLoading(loanId);
    setActionMessage(null);
    try {
      const res = await api.recomputeLoanPenalty(loanId);
      setActionMessage(
        res.penalty_applied ? `Penalite ajoutee: ${res.penalty_amount || ""}` : res.message || "Pas de penalite."
      );
      await loadLoans();
    } catch (err) {
      setActionMessage(err.message || "Erreur penalite.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDocs = async (loanId, status) => {
    setActionLoading(loanId);
    setActionMessage(null);
    try {
      await api.validateLoanDocuments(loanId, { status });
      setActionMessage(`Documents ${status}.`);
      await loadLoans();
      const docs = await api.getLoanDocuments(loanId);
      setDocsByLoan((prev) => ({ ...prev, [loanId]: docs || {} }));
    } catch (err) {
      setActionMessage(err.message || "Erreur documents.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCollateral = async (loanId, payload) => {
    setActionLoading(loanId);
    setActionMessage(null);
    try {
      await api.addLoanCollateral(loanId, payload);
      setActionMessage("Collaterale ajoutee.");
      const cols = await api.getLoanCollaterals(loanId);
      setColsByLoan((prev) => ({ ...prev, [loanId]: cols || [] }));
    } catch (err) {
      setActionMessage(err.message || "Erreur collaterale.");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleLoan = async (loanId) => {
    if (expandedLoan === loanId) {
      setExpandedLoan(null);
      return;
    }
    setExpandedLoan(loanId);
    if (!docsByLoan[loanId]) {
      try {
        const docs = await api.getLoanDocuments(loanId);
        setDocsByLoan((prev) => ({ ...prev, [loanId]: docs || {} }));
      } catch (err) {
        setActionMessage(err.message || "Erreur chargement documents");
      }
    }
    if (!colsByLoan[loanId]) {
      try {
        const cols = await api.getLoanCollaterals(loanId);
        setColsByLoan((prev) => ({ ...prev, [loanId]: cols || [] }));
      } catch (err) {
        setActionMessage(err.message || "Erreur chargement collateraux");
      }
    }
  };

  const handleDeleteCollateral = async (loanId, collateralId, collateral) => {
    const confirmMsg = `Supprimer ce collaterale ?\nType: ${collateral?.type || "?"}\nValeur: ${collateral?.value_estimated || "N/A"}`;
    if (!window.confirm(confirmMsg)) return;
    setActionLoading(collateralId);
    setActionMessage(null);
    try {
      await api.deleteLoanCollateral(loanId, collateralId);
      const cols = await api.getLoanCollaterals(loanId);
      setColsByLoan((prev) => ({ ...prev, [loanId]: cols || [] }));
    } catch (err) {
      setActionMessage(err.message || "Erreur suppression collaterale.");
    } finally {
      setActionLoading(null);
    }
  };

  const statsCards = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Credits totaux", value: stats.loans?.total ?? 0, icon: <BadgeEuro size={20} /> },
      { label: "Actifs", value: stats.loans?.active ?? 0, icon: <CheckCircle2 size={20} /> },
      { label: "En retard", value: stats.loans?.in_arrears ?? 0, icon: <AlertTriangle size={20} /> },
      { label: "Encours (EUR)", value: stats.outstanding_balance?.toLocaleString(), icon: <BadgeEuro size={20} /> },
    ];
  }, [stats]);

  const docsSummary = (loan) => {
    const meta = loan.metadata_ || {};
    const status = meta.documents_status || "pending";
    const count = (meta.documents || []).length || 0;
    return `${status} (${count})`;
  };

  const docIcon = (mime) => {
    if (!mime) return <FileText size={16} />;
    const lower = mime.toLowerCase();
    if (lower.startsWith("image/")) return <ImageIcon size={16} />;
    if (lower.includes("pdf")) return <FileText size={16} />;
    if (lower.includes("sheet") || lower.includes("excel") || lower.includes("csv")) return <FileSpreadsheet size={16} />;
    return <FileText size={16} />;
  };

  const currentPage = Math.floor(offset / Math.max(limit, 1)) + 1;
  const maxPage = total ? Math.max(1, Math.ceil(total / Math.max(limit, 1))) : null;
  const canPrev = offset > 0;
  const canNext = total ? offset + loans.length < total : loans.length === limit;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Supervision credits</h2>
          <p className="text-slate-500">Validez les demandes, debloquez les fonds et relancez les clients en retard.</p>
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
            <div key={card.label} className="bg-white rounded-2xl shadow px-5 py-4 flex items-center gap-4">
              <span className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                {card.icon}
              </span>
              <div>
                <p className="text-xs uppercase text-slate-400 tracking-[0.2em]">{card.label}</p>
                <p className="text-2xl font-semibold text-slate-800">{card.value}</p>
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
              Afficher seulement les impayes
            </label>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-slate-500">
              {loans.length} dossier(s) affiches{total ? ` / ${total}` : ""}
            </p>
            <div className="flex items-center gap-1 text-sm">
              <label>Limit</label>
              <input
                type="number"
                className="w-16 border rounded px-2 py-1 text-sm"
                value={limit}
                min={1}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value) || 1);
                  setLimit(val);
                  setOffset(0);
                }}
              />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <label>Page</label>
              <input
                type="number"
                className="w-16 border rounded px-2 py-1 text-sm"
                value={currentPage}
                min={1}
                onChange={(e) => {
                  const page = Math.max(1, Number(e.target.value) || 1);
                  setOffset((page - 1) * limit);
                }}
              />
              {maxPage && <span className="text-xs text-slate-500">/ {maxPage}</span>}
            </div>
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="px-2 py-1 rounded border text-sm disabled:opacity-50"
              disabled={!canPrev}
            >
              Prev
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              className="px-2 py-1 rounded border text-sm disabled:opacity-50"
              disabled={!canNext}
            >
              Next
            </button>
          </div>
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
                <th className="py-3">Docs</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingLoans && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    <Loader2 className="animate-spin mx-auto" />
                  </td>
                </tr>
              )}
              {!loadingLoans && loans.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    Aucun credit ne correspond a ce filtre.
                  </td>
                </tr>
              )}
              {loans.map((loan) => {
                const expanded = expandedLoan === loan.loan_id;
                const docs = docsByLoan[loan.loan_id] || loan.metadata_ || {};
                const docList = docs.documents || [];
                const collaterals = colsByLoan[loan.loan_id] || [];
                return (
                  <Fragment key={loan.loan_id}>
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
                      <td className="py-3 text-sm text-slate-600">{docsSummary(loan)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => toggleLoan(loan.loan_id)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50"
                          >
                            {expanded ? "Masquer" : "Voir details"}
                          </button>
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
                              onClick={() => handleApprove(loan.loan_id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                            >
                              {actionLoading === loan.loan_id ? "..." : "Valider"}
                            </button>
                          )}
                          {loan.status === "draft" && (
                            <button
                              onClick={() => handleDisburse(loan.loan_id)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                            >
                              {actionLoading === loan.loan_id ? "..." : "Debloquer"}
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
                          {loan.status === "in_arrears" && (
                            <button
                              onClick={() => handlePenalty(loan.loan_id)}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
                            >
                              {actionLoading === loan.loan_id ? "..." : "Penalite"}
                            </button>
                          )}
                          <button
                            onClick={() => handleDocs(loan.loan_id, "approved")}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50"
                          >
                            Docs OK
                          </button>
                          <button
                            onClick={() => handleDocs(loan.loan_id, "rejected")}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50"
                          >
                            Docs KO
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="p-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="border rounded-xl bg-white p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <FileCheck size={16} className="text-slate-600" />
                                <span className="font-semibold text-slate-700">Documents</span>
                                {docs.documents_status && (
                                  <span className="text-xs text-slate-500">({docs.documents_status})</span>
                                )}
                              </div>
                              {docList.length === 0 ? (
                                <p className="text-sm text-slate-500">Aucun document.</p>
                              ) : (
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-slate-400">
                                      <th className="py-2">Type</th>
                                      <th className="py-2">Nom</th>
                                      <th className="py-2">Apercu</th>
                                      <th className="py-2">Statut</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {docList.map((d, idx) => (
                                      <tr key={idx} className="border-t">
                                        <td className="py-2 flex items-center gap-2">
                                          {docIcon(d.mimetype)}
                                          <span>{d.type || "Doc"}</span>
                                        </td>
                                        <td className="py-2 text-slate-700">{d.name || d.type || "N/A"}</td>
                                        <td className="py-2">
                                          {d.thumbnail ? (
                                            <img src={d.thumbnail} alt={d.name || d.type || "doc"} className="h-12 rounded border" />
                                          ) : d.url ? (
                                            <a
                                              href={d.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-indigo-600 hover:underline break-all"
                                            >
                                              Ouvrir
                                            </a>
                                          ) : (
                                            <span className="text-xs text-slate-500">{d.mimetype || "Apercu indisponible"}</span>
                                          )}
                                        </td>
                                        <td className="py-2 text-xs text-slate-500">{d.status || docs.documents_status || "pending"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>

                            <div className="border rounded-xl bg-white p-4 shadow-sm space-y-3">
                              <div className="flex items-center gap-2">
                                <Anchor size={16} className="text-slate-600" />
                                <span className="font-semibold text-slate-700">Collateraux</span>
                              </div>
                              {collaterals.length === 0 ? (
                                <p className="text-sm text-slate-500">Aucun collaterale.</p>
                              ) : (
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-slate-400">
                                      <th className="py-2">Type</th>
                                      <th className="py-2">Valeur estimee</th>
                                      <th className="py-2">Description</th>
                                      <th className="py-2 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {collaterals.map((c) => (
                                      <tr key={c.collateral_id} className="border-t">
                                        <td className="py-2">{c.type}</td>
                                        <td className="py-2">{c.value_estimated || "N/A"}</td>
                                        <td className="py-2 text-slate-600">{c.description || "-"}</td>
                                        <td className="py-2 text-right">
                                          <button
                                            onClick={() => handleDeleteCollateral(loan.loan_id, c.collateral_id, c)}
                                            className="text-xs text-red-600 hover:underline"
                                          >
                                            Supprimer
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                              <div className="border-t border-slate-200 pt-3">
                                <CollateralForm
                                  onSubmit={(payload) => handleCollateral(loan.loan_id, payload)}
                                  loading={actionLoading === loan.loan_id}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
