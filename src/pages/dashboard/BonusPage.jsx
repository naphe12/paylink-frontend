import { useEffect, useState } from "react";
import api from "@/services/api";

function formatAmount(value, currency = "") {
  const amount = Number(value || 0);
  const formatted = Number.isFinite(amount) ? amount.toLocaleString() : "0";
  return currency ? `${formatted} ${currency}` : formatted;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function historyTone(source) {
  const normalized = String(source || "").toLowerCase();
  if (normalized === "sent" || normalized === "used") return "bg-rose-100 text-rose-700";
  if (normalized === "received" || normalized === "earned") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export default function BonusPage() {
  const [profile, setProfile] = useState(null);
  const [bonusBalance, setBonusBalance] = useState({ bonus_balance: 0, currency_code: "BIF" });
  const [bonusHistory, setBonusHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [applyCode, setApplyCode] = useState("");
  const [recipientIdentifier, setRecipientIdentifier] = useState("");
  const [amountBif, setAmountBif] = useState("");
  const [sendingBonus, setSendingBonus] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [referralRes, bonusBalanceRes, bonusHistoryRes] = await Promise.allSettled([
        api.getMyReferralProfile(),
        api.getBonusBalance(),
        api.listBonusHistory(),
      ]);

      const warnings = [];

      if (referralRes.status === "fulfilled") {
        setProfile(referralRes.value || null);
      } else {
        setProfile(null);
        warnings.push("Programme de parrainage indisponible.");
      }

      if (bonusBalanceRes.status === "fulfilled") {
        setBonusBalance(
          bonusBalanceRes.value || { bonus_balance: 0, currency_code: "BIF" }
        );
      } else {
        setBonusBalance({ bonus_balance: 0, currency_code: "BIF" });
        warnings.push("Solde bonus indisponible.");
      }

      if (bonusHistoryRes.status === "fulfilled") {
        setBonusHistory(Array.isArray(bonusHistoryRes.value) ? bonusHistoryRes.value : []);
      } else {
        setBonusHistory([]);
        warnings.push("Historique bonus indisponible.");
      }

      if (warnings.length > 0) {
        setError(warnings.join(" "));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshBonusData = async () => {
    const [balance, history] = await Promise.all([
      api.getBonusBalance(),
      api.listBonusHistory(),
    ]);
    setBonusBalance(balance || { bonus_balance: 0, currency_code: "BIF" });
    setBonusHistory(Array.isArray(history) ? history : []);
  };

  const handleApplyCode = async () => {
    if (!applyCode.trim()) {
      setError("Renseigne un code de parrainage.");
      return;
    }
    try {
      setError("");
      setSuccess("");
      await api.applyReferralCode(applyCode.trim());
      setSuccess("Code de parrainage applique.");
      setApplyCode("");
      await loadData();
    } catch (err) {
      setError(err?.message || "Application du code impossible.");
    }
  };

  const handleActivate = async () => {
    try {
      setError("");
      setSuccess("");
      const result = await api.activateReferral();
      if (result?.status === "activated") {
        setSuccess(
          `Parrainage active: ${formatAmount(result.amount, result.currency_code)} credites.`
        );
      } else if (result?.status === "pending") {
        setSuccess(
          `Activation en cours: ${Number(result.progress_percent || 0)}%${result.next_step ? ` - ${result.next_step}` : ""}`
        );
      } else {
        setSuccess("Aucune activation supplementaire detectee.");
      }
      await loadData();
    } catch (err) {
      setError(err?.message || "Activation du parrainage impossible.");
    }
  };

  const handleSendBonus = async () => {
    const trimmedIdentifier = recipientIdentifier.trim();
    const amount = Number(amountBif || 0);
    const available = Number(bonusBalance?.bonus_balance || 0);

    if (!trimmedIdentifier) {
      setError("Renseigne l'identifiant du destinataire bonus.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Entre un montant bonus valide en BIF.");
      return;
    }
    if (amount > available) {
      setError("Le montant bonus depasse le solde disponible.");
      return;
    }

    try {
      setSendingBonus(true);
      setError("");
      setSuccess("");
      const result = await api.sendBonusTransfer({
        recipient_identifier: trimmedIdentifier,
        amount_bif: amount,
      });
      setRecipientIdentifier("");
      setAmountBif("");
      setSuccess(
        `Bonus envoye: ${formatAmount(result.amount_bif, result.currency_code)} vers ${result.recipient_label || trimmedIdentifier}.`
      );
      try {
        await refreshBonusData();
      } catch {
        // Keep the successful transfer message even if the UI refresh fails.
      }
    } catch (err) {
      setError(err?.message || "Transfert bonus impossible.");
    } finally {
      setSendingBonus(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bonus et parrainage</h1>
          <p className="text-sm text-slate-500">
            Envoie ton bonus disponible sans frais, en BIF vers BIF, avec execution immediate sans validation, puis pilote aussi ton parrainage intelligent.
          </p>
        </div>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Chargement du bonus et du parrainage...
        </section>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.05fr,1.35fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Transfert de bonus</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Aucun frais. Aucun circuit de validation. Le bonus envoye est debite du solde bonus disponible du client et credite immediatement.
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Bonus disponible</p>
                  <p className="text-2xl font-semibold text-emerald-800">
                    {formatAmount(bonusBalance?.bonus_balance, bonusBalance?.currency_code)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1.2fr,0.8fr]">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Destinataire bonus</span>
                  <input
                    aria-label="Destinataire bonus"
                    type="text"
                    placeholder="Email, paytag ou telephone"
                    value={recipientIdentifier}
                    onChange={(event) => setRecipientIdentifier(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Montant bonus (BIF)</span>
                  <input
                    aria-label="Montant bonus BIF"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={amountBif}
                    onChange={(event) => setAmountBif(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleSendBonus}
                  disabled={sendingBonus}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingBonus ? "Envoi..." : "Envoyer le bonus"}
                </button>
                <p className="text-xs text-slate-500">
                  Devise d'envoi: BIF. Devise de reception: BIF. Maximum envoyable:{" "}
                  {formatAmount(bonusBalance?.bonus_balance, bonusBalance?.currency_code)}.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Historique des bonus</h2>
                <p className="text-sm text-slate-500">
                  Les envois et receptions de bonus remontent ici avec le contrepartie quand elle est connue.
                </p>
              </div>
              {bonusHistory.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun mouvement bonus pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  {bonusHistory.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatAmount(item.amount_bif, item.currency_code)}
                          </p>
                          <p className="text-xs text-slate-500">{item.label}</p>
                          {item.counterparty_label ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Contrepartie: {item.counterparty_label}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-slate-400">{formatDate(item.created_at)}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs ${historyTone(item.source)}`}>
                          {item.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {!profile ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
              Programme de parrainage indisponible.
            </section>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Ton code et ton lien</h2>
                    <p className="mt-2 text-sm text-slate-500">Code personnel</p>
                    <p className="text-lg font-semibold text-slate-900">{profile.referral_code}</p>
                    <p className="mt-2 text-sm text-slate-500">Lien partageable</p>
                    <p className="break-all rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{profile.referral_link}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                    <StatCard label="Filleuls" value={profile.total_referrals} />
                    <StatCard label="Actives" value={profile.activated_referrals} />
                    <StatCard label="En attente" value={profile.pending_rewards} />
                    <StatCard label="Gains" value={formatAmount(profile.rewards_earned, profile.currency_code)} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <StatCard label="Taux activation" value={`${Number(profile.activation_rate_percent || 0)}%`} />
                  <StatCard label="Mon activation" value={`${Number(profile.my_activation_progress_percent || 0)}%`} />
                  <StatCard label="Politique" value={profile.targeted_bonus_policy || "real-activity-only"} />
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-[1.05fr,1.35fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">J'ai recu un code</h2>
                    <p className="text-sm text-slate-500">Associe un parrain a ton compte si ce n'est pas deja fait.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr,auto]">
                    <input
                      aria-label="Code parrainage a appliquer"
                      type="text"
                      placeholder="Code de parrainage"
                      value={applyCode}
                      onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={handleApplyCode}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Appliquer
                    </button>
                  </div>
                  <button
                    onClick={handleActivate}
                    className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    Verifier mon activation reelle
                  </button>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                    <p>
                      Progression d&apos;activation:{" "}
                      <span className="font-semibold text-slate-900">
                        {Number(profile.my_activation_progress_percent || 0)}%
                      </span>
                    </p>
                    {profile.my_activation_next_step ? (
                      <p className="mt-1">Prochaine etape: {profile.my_activation_next_step}</p>
                    ) : (
                      <p className="mt-1">Aucune action requise pour le moment.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Historique des recompenses</h2>
                    <p className="text-sm text-slate-500">
                      Les gains restent `pending` tant qu'aucune activation reelle n'est detectee sur le compte filleul.
                    </p>
                  </div>
                  {(profile.rewards || []).length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune recompense de parrainage pour le moment.</p>
                  ) : (
                    <div className="space-y-3">
                      {(profile.rewards || []).map((reward) => (
                        <div key={reward.reward_id} className="rounded-xl border border-slate-200 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{formatAmount(reward.amount, reward.currency_code)}</p>
                              <p className="text-xs text-slate-500">Filleul: {reward.referred_user_id}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Activation: {reward.activation_reason || "en attente d'activite reelle qualifiee"}
                              </p>
                              {Number(reward.activation_progress_percent || 0) > 0 && reward.status !== "activated" ? (
                                <p className="mt-1 text-xs text-slate-500">
                                  Progression: {Number(reward.activation_progress_percent || 0)}%
                                </p>
                              ) : null}
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs ${
                                reward.status === "activated"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {reward.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
