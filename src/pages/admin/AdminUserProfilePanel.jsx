import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeftRight,
  CreditCard,
  Mail,
  Phone,
  ShieldCheck,
  UserCircle2,
  Wallet,
} from "lucide-react";

import api from "@/services/api";

export default function AdminUserProfilePanel() {
  const { user_id } = useParams();
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [creditLines, setCreditLines] = useState([]);
  const [creditHistory, setCreditHistory] = useState([]);
  const [trustDetail, setTrustDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amlResolveNote, setAmlResolveNote] = useState("");
  const [raiseKycTier, setRaiseKycTier] = useState(true);
  const [resolvingAml, setResolvingAml] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const loadUser = async () => {
    setLoading(true);
    const [userData, summaryData, creditLineData, creditHistoryData, trustData] = await Promise.all([
      api.getUser(user_id),
      api.getAdminFinancialSummary(user_id).catch(() => null),
      api.listAdminCreditLines({ user_id }).catch(() => []),
      api.getAdminCreditHistory({ user_id, limit: 5, offset: 0 }).catch(() => ({ items: [] })),
      api.getUserTrustProfile(user_id).catch(() => null),
    ]);
    setUser(userData);
    setSummary(summaryData);
    setCreditLines(Array.isArray(creditLineData) ? creditLineData : []);
    setCreditHistory(Array.isArray(creditHistoryData?.items) ? creditHistoryData.items : []);
    setTrustDetail(trustData);
    setLoading(false);
  };

  useEffect(() => {
    loadUser();
  }, [user_id]);

  if (loading || !user) return <p className="p-6">Chargement...</p>;

  const toggleFreeze = async () => {
    await api.post(
      `/admin/users/${user.user_id}/${user.status === "frozen" ? "unfreeze" : "freeze"}`
    );
    loadUser();
  };

  const toggleExternal = async () => {
    await api.post(
      `/admin/users/${user.user_id}/${
        user.external_transfers_blocked ? "unblock-external" : "block-external"
      }`
    );
    loadUser();
  };

  const requestKycUpgrade = async () => {
    await api.post(`/admin/users/${user.user_id}/request-kyc-upgrade`);
    alert("Demande de mise a niveau KYC envoyee.");
  };

  const resolveAmlLock = async () => {
    setResolvingAml(true);
    setActionMessage("");
    try {
      const res = await api.post(`/admin/users/${user.user_id}/resolve-aml-lock`, {
        note: amlResolveNote || "Resolution admin du blocage AML",
        raise_kyc_tier_to_one: raiseKycTier,
        reset_risk_score: true,
      });
      setActionMessage(
        `${res?.message || "Blocage AML leve"}${res?.kyc_tier ? `, KYC tier ${res.kyc_tier}` : ""}.`
      );
      await loadUser();
    } catch (error) {
      setActionMessage(error?.message || "Impossible de lever le blocage AML.");
    } finally {
      setResolvingAml(false);
    }
  };

  const walletAvailable = Number(summary?.wallet_available || 0);
  const creditUsed = Number(summary?.credit_used || user.credit_used || 0);
  const creditAvailable = Number(summary?.credit_available || 0);
  const hasDebt = walletAvailable < 0 || creditUsed > 0;
  const latestCreditLine = creditLines[0] || null;
  const trustProfile = trustDetail?.profile || null;
  const formatRate = (value) => {
    if (value === undefined || value === null || value === "") return "-";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "-";
    return `${(numeric * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <UserCircle2 size={28} />
              </span>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{user.full_name}</h1>
                <p className="text-sm text-slate-500">
                  {user.role || "client"} • {user.status} • KYC {user.kyc_status}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <InfoCard icon={Mail} label="Email" value={user.email || "-"} />
              <InfoCard icon={Phone} label="Telephone" value={user.phone_e164 || "-"} />
              <InfoCard label="User ID" value={user.user_id} mono />
              <InfoCard label="Pays" value={user.country_code || "-"} />
              <InfoCard label="Derniere activite" value={formatDate(user.last_seen)} />
              <InfoCard label="Creation" value={formatDate(user.created_at)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <MetricCard
              label="Wallet"
              value={`${walletAvailable.toLocaleString()} ${summary?.wallet_currency || ""}`.trim()}
              tone={walletAvailable < 0 ? "rose" : "slate"}
            />
            <MetricCard
              label="Credit utilise"
              value={`${creditUsed.toLocaleString()} EUR`}
              tone={creditUsed > 0 ? "amber" : "slate"}
            />
            <MetricCard
              label="Credit dispo"
              value={`${creditAvailable.toLocaleString()} EUR`}
              tone="blue"
            />
            <MetricCard
              label="Risque"
              value={String(user.risk_score ?? 0)}
              tone={Number(user.risk_score || 0) >= 80 ? "rose" : "emerald"}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Navigation rapide client</h2>
          <p className="mt-1 text-sm text-slate-500">
            Acces direct aux dettes, transferts, credit, balance et situation financiere.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <QuickLink
              to={`/dashboard/admin/financial-summary?user_id=${user.user_id}`}
              icon={Wallet}
              title="Situation financiere"
              subtitle="Wallet, credit, bonus, tontines"
            />
            <QuickLink
              to={`/dashboard/admin/credit-lines?user_id=${user.user_id}`}
              icon={CreditCard}
              title="Ligne de credit"
              subtitle="Detail et capacite de credit"
            />
            <QuickLink
              to={`/dashboard/admin/credit-history?user_id=${user.user_id}`}
              icon={ArrowLeftRight}
              title="Dettes et historique"
              subtitle="History + evenements credit"
            />
            <QuickLink
              to={`/dashboard/admin/credit-lines/repay?user_id=${user.user_id}`}
              icon={CreditCard}
              title="Remboursement"
              subtitle="Traiter une dette client"
            />
            <QuickLink
              to={`/dashboard/admin/transfers?user_id=${user.user_id}`}
              icon={ArrowLeftRight}
              title="Transferts"
              subtitle="Flux et transferts externes"
            />
            <QuickLink
              to={`/dashboard/admin/users/${user.user_id}/balance-events`}
              icon={Wallet}
              title="Balance events"
              subtitle="Historique des mouvements de solde"
            />
            <QuickLink
              to={`/dashboard/admin/cash-requests?user_id=${user.user_id}`}
              icon={Wallet}
              title="Cash in/out"
              subtitle="Depots et retraits lies au client"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Actions admin</h2>
          <div className="mt-4 space-y-3">
            <button
              onClick={toggleFreeze}
              className={`w-full rounded-xl py-2 text-white ${
                user.status === "frozen" ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {user.status === "frozen" ? "Debloquer le compte" : "Geler le compte"}
            </button>

            <button
              onClick={toggleExternal}
              className={`w-full rounded-xl py-2 text-white ${
                user.external_transfers_blocked ? "bg-green-600" : "bg-orange-600"
              }`}
            >
              {user.external_transfers_blocked
                ? "Autoriser transferts externes"
                : "Bloquer transferts externes"}
            </button>

            <button
              onClick={requestKycUpgrade}
              className="w-full rounded-xl bg-blue-600 py-2 text-white"
            >
              Demander mise a niveau KYC
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Lever un blocage AML</p>
            <p className="mt-1 text-xs text-amber-800">
              Remet le compte en actif, remet le risque a zero, reautorise les transferts externes
              et peut remonter le KYC tier a 1 pour eviter un reblocage immediat.
            </p>
            <textarea
              value={amlResolveNote}
              onChange={(event) => setAmlResolveNote(event.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
              placeholder="Note admin pour la levee du blocage AML"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={raiseKycTier}
                onChange={(event) => setRaiseKycTier(event.target.checked)}
              />
              Remonter automatiquement le KYC tier a 1 si le client est a 0
            </label>
            <button
              onClick={resolveAmlLock}
              disabled={resolvingAml}
              className="mt-3 w-full rounded-xl bg-amber-600 py-2 text-white disabled:opacity-60"
            >
              {resolvingAml ? "Resolution en cours..." : "Lever le blocage AML"}
            </button>
            {actionMessage ? (
              <p className="mt-2 text-xs text-emerald-700">{actionMessage}</p>
            ) : null}
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
            <p className="font-medium text-slate-700">Etat du client</p>
            <StatusLine ok={!hasDebt} label={hasDebt ? "Dette detectee" : "Pas de dette active"} />
            <StatusLine
              ok={!user.external_transfers_blocked}
              label={
                user.external_transfers_blocked
                  ? "Transferts externes bloques"
                  : "Transferts externes autorises"
              }
            />
            <StatusLine
              ok={!!user.email_verified}
              label={user.email_verified ? "Email verifie" : "Email non verifie"}
            />
            <StatusLine
              ok={Number(user.risk_score || 0) < 80}
              label={Number(user.risk_score || 0) >= 80 ? "Risque eleve" : "Risque acceptable"}
            />
          </div>

          {trustProfile && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">Confiance produit</p>
              <p className="mt-2 text-sm text-slate-700">
                Score: <strong>{trustProfile.trust_score}/100</strong>
              </p>
              <p className="text-sm text-slate-700">
                Niveau: <strong>{trustProfile.trust_level}</strong>
              </p>
              <p className="text-sm text-slate-700">
                KYC tier: <strong>{trustProfile.kyc_tier ?? 0}</strong>
              </p>
              <p className="text-sm text-slate-700">
                KYC verifie: <strong>{trustProfile.kyc_verified ? "Oui" : "Non"}</strong>
              </p>
              <p className="text-sm text-slate-700">
                Demandes payees: <strong>{trustProfile.successful_payment_requests}</strong>
              </p>
              <p className="text-sm text-slate-700">
                Taux paiement reussi: <strong>{formatRate(trustProfile.payment_request_success_rate)}</strong>
              </p>
              <p className="text-sm text-slate-700">
                P2P reussi: <strong>{trustProfile.successful_p2p_trades ?? 0}</strong> / <strong>{trustProfile.total_p2p_trades ?? 0}</strong>
              </p>
              <p className="text-sm text-slate-700">
                Taux litige P2P: <strong>{formatRate(trustProfile.p2p_dispute_rate)}</strong>
              </p>
              <p className="text-sm text-slate-700">
                Litiges: <strong>{trustProfile.dispute_count}</strong>
              </p>
              <p className="text-sm text-slate-700">
                Reputation: <strong>{trustProfile.reputation_tier || "watch"}</strong>
              </p>
              {trustProfile.reputation_note ? (
                <p className="text-xs text-slate-600">{trustProfile.reputation_note}</p>
              ) : null}
              {trustProfile.limit_multiplier ? (
                <p className="text-sm text-slate-700">
                  Multiplicateur confiance: <strong>x{trustProfile.limit_multiplier}</strong>
                </p>
              ) : null}
              {(trustProfile.current_daily_limit !== undefined || trustProfile.current_monthly_limit !== undefined) && (
                <p className="text-sm text-slate-700">
                  Limites actives: <strong>{trustProfile.current_daily_limit ?? 0}</strong> / jour ·{" "}
                  <strong>{trustProfile.current_monthly_limit ?? 0}</strong> / mois
                </p>
              )}
              {(trustProfile.recommended_daily_limit !== undefined || trustProfile.recommended_monthly_limit !== undefined) && (
                <p className="text-sm text-slate-700">
                  Recommandation confiance: <strong>{trustProfile.recommended_daily_limit ?? 0}</strong> / jour ·{" "}
                  <strong>{trustProfile.recommended_monthly_limit ?? 0}</strong> / mois
                </p>
              )}
              {trustProfile.limit_uplift_active ? (
                <p className="text-sm text-emerald-700">
                  Relèvement de plafonds actif via le score de confiance.
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {(trustProfile.badges || []).map((badge) => (
                  <span key={badge.badge_code} className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800">
                    {badge.name}
                  </span>
                ))}
              </div>
              <button
                onClick={async () => {
                  await api.recomputeUserTrustProfile(user.user_id);
                  await loadUser();
                }}
                className="mt-3 w-full rounded-xl bg-emerald-700 py-2 text-white"
              >
                Recalculer le score de confiance
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Dette et credit</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricCard label="Limite journaliere" value={formatNumber(user.daily_limit)} tone="slate" />
            <MetricCard label="Utilise aujourd'hui" value={formatNumber(user.used_daily)} tone="blue" />
            <MetricCard label="Limite mensuelle" value={formatNumber(user.monthly_limit)} tone="slate" />
            <MetricCard label="Utilise ce mois" value={formatNumber(user.used_monthly)} tone="blue" />
          </div>
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
            {latestCreditLine ? (
              <>
                <p className="font-semibold text-slate-900">Derniere ligne de credit</p>
                <p className="mt-1">
                  ID: <span className="font-mono text-xs">{latestCreditLine.credit_line_id}</span>
                </p>
                <p>Devise: {latestCreditLine.currency_code}</p>
                <p>Plafond: {formatNumber(latestCreditLine.initial_amount)}</p>
                <p>Utilise: {formatNumber(latestCreditLine.used_amount)}</p>
                <p>Disponible: {formatNumber(latestCreditLine.outstanding_amount)}</p>
              </>
            ) : (
              <p>Aucune ligne de credit rattachee.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Activite credit recente</h2>
          {creditHistory.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Aucun historique credit recent.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {creditHistory.map((row) => (
                <div key={row.entry_id} className="rounded-xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{row.description || "Mouvement credit"}</p>
                    <p
                      className={`text-sm font-semibold ${
                        Number(row.amount || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {Number(row.amount || 0) >= 0 ? "+" : "-"}{" "}
                      {Math.abs(Number(row.amount || 0)).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(row.created_at)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Avant {formatNumber(row.credit_available_before)} • Apres{" "}
                    {formatNumber(row.credit_available_after)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function InfoCard({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
        {Icon ? <Icon size={14} /> : null}
        <span>{label}</span>
      </div>
      <p className={`mt-1 text-sm text-slate-900 ${mono ? "break-all font-mono" : ""}`}>{value || "-"}</p>
    </div>
  );
}

function MetricCard({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone] || tones.slate}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, subtitle }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:bg-white hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
          <Icon size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
    </Link>
  );
}

function StatusLine({ ok, label }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <ShieldCheck size={16} className="text-emerald-600" />
      ) : (
        <AlertTriangle size={16} className="text-amber-600" />
      )}
      <span className={ok ? "text-slate-700" : "text-amber-700"}>{label}</span>
    </div>
  );
}
