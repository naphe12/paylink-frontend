// src/pages/dashboard/ProfilePage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { User } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [trust, setTrust] = useState(null);
  const [referral, setReferral] = useState(null);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [referralMessage, setReferralMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [data, trustData, referralData] = await Promise.all([
          api.get("/auth/me"),
          api.getMyTrustProfile().catch(() => null),
          api.getMyReferralProfile().catch(() => null),
        ]);
        setProfile(data);
        setTrust(trustData);
        setReferral(referralData);
      } catch (err) {
        console.error("Erreur profil :", err);
      }
    })();
  }, []);

  if (!profile) return <p>Chargement...</p>;

  const creditLimit = profile.credit_limit ?? 0;
  const creditUsed = profile.credit_used ?? 0;
  const creditAvailable = Math.max(0, creditLimit - creditUsed);
  const trustProfile = trust?.profile || null;

  const reloadReferral = async () => {
    try {
      const data = await api.getMyReferralProfile();
      setReferral(data);
    } catch (err) {
      console.error("Erreur referral :", err);
    }
  };

  const handleApplyReferralCode = async () => {
    if (!referralCodeInput.trim()) return;
    try {
      setReferralMessage("");
      await api.applyReferralCode(referralCodeInput.trim());
      setReferralMessage("Code de parrainage applique.");
      setReferralCodeInput("");
      await reloadReferral();
    } catch (err) {
      setReferralMessage(err?.message || "Impossible d'appliquer le code.");
    }
  };

  const handleActivateReferral = async () => {
    try {
      setReferralMessage("");
      await api.activateReferral();
      setReferralMessage("Parrainage active sur activite reelle.");
      await reloadReferral();
    } catch (err) {
      setReferralMessage(err?.message || "Activation referral impossible.");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#0b3b64] mb-6 flex items-center gap-2">
        <User /> Mon profil
      </h2>
      <div className="bg-white p-6 rounded-2xl shadow w-full max-w-md">
        <p>
          <strong>Nom :</strong> {profile.full_name}
        </p>
        <p>
          <strong>Email :</strong> {profile.email}
        </p>
        <p>
          <strong>Téléphone :</strong> {profile.phone_e164}
        </p>
        <p>
          <strong>Pays :</strong> {profile.country_code}
        </p>
        <p>
          <strong>Status :</strong> {profile.status}
        </p>
        {profile.paytag && (
          <p>
            <strong>PayTag :</strong> {profile.paytag}
          </p>
        )}
        <div className="mt-4 space-y-1">
          <p>
            <strong>Crédit total :</strong> {creditLimit.toLocaleString()} €
          </p>
          <p>
            <strong>Crédit utilisé :</strong> {creditUsed.toLocaleString()} €
          </p>
          <p>
            <strong>Crédit disponible :</strong> {creditAvailable.toLocaleString()} €
          </p>
          {profile.daily_limit !== undefined && (
            <p>
              <strong>Plafond journalier :</strong> {profile.daily_limit} (utilisé {profile.used_daily ?? 0})
            </p>
          )}
          {profile.monthly_limit !== undefined && (
            <p>
              <strong>Plafond mensuel :</strong> {profile.monthly_limit} (utilisé {profile.used_monthly ?? 0})
            </p>
          )}
          {profile.risk_score !== undefined && (
            <p>
              <strong>Score risque :</strong> {profile.risk_score}
            </p>
          )}
        </div>
        {trustProfile && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Confiance & reputation</p>
            <p className="mt-2">
              <strong>Score confiance :</strong> {trustProfile.trust_score}/100
            </p>
            <p>
              <strong>Niveau :</strong> {trustProfile.trust_level}
            </p>
            <p>
              <strong>KYC verifie :</strong> {trustProfile.kyc_verified ? "Oui" : "Non"}
            </p>
            <p>
              <strong>KYC tier :</strong> {trustProfile.kyc_tier ?? 0}
            </p>
            <p>
              <strong>Demandes payees :</strong> {trustProfile.successful_payment_requests}
            </p>
            <p>
              <strong>Anciennete compte :</strong> {trustProfile.account_age_days} jours
            </p>
            {trustProfile.limit_multiplier ? (
              <p>
                <strong>Boost confiance :</strong> x{trustProfile.limit_multiplier}
              </p>
            ) : null}
            {(trustProfile.current_daily_limit !== undefined || trustProfile.current_monthly_limit !== undefined) && (
              <p>
                <strong>Limites actives :</strong> {trustProfile.current_daily_limit ?? profile.daily_limit ?? 0} / jour ·{" "}
                {trustProfile.current_monthly_limit ?? profile.monthly_limit ?? 0} / mois
              </p>
            )}
            {(trustProfile.recommended_daily_limit !== undefined || trustProfile.recommended_monthly_limit !== undefined) && (
              <p>
                <strong>Limites recommandees :</strong> {trustProfile.recommended_daily_limit ?? 0} / jour ·{" "}
                {trustProfile.recommended_monthly_limit ?? 0} / mois
              </p>
            )}
            {trustProfile.limit_uplift_active ? (
              <p className="mt-2 text-sm text-emerald-700">
                Le compte beneficie actuellement d'un relèvement de plafonds lie au niveau de confiance.
              </p>
            ) : null}
            {Array.isArray(trustProfile.badges) && trustProfile.badges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {trustProfile.badges.map((badge) => (
                  <span key={badge.badge_code} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                    {badge.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {referral && (
          <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Parrainage intelligent</p>
            <p className="mt-2">
              <strong>Mon code :</strong> {referral.referral_code}
            </p>
            <p>
              <strong>Invites :</strong> {referral.total_referrals} | <strong>Actives :</strong>{" "}
              {referral.activated_referrals}
            </p>
            <p>
              <strong>Recompenses gagnees :</strong> {referral.rewards_earned} {referral.currency_code}
            </p>
            <p className="break-all text-sm text-slate-600">{referral.referral_link}</p>
            <div className="mt-3 flex flex-col gap-2">
              <input
                type="text"
                placeholder="Appliquer un code de parrainage"
                value={referralCodeInput}
                onChange={(e) => setReferralCodeInput(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleApplyReferralCode}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-white"
                >
                  Appliquer le code
                </button>
                <button
                  onClick={handleActivateReferral}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700"
                >
                  Activer ma recompense
                </button>
              </div>
              {referralMessage ? <p className="text-sm text-slate-600">{referralMessage}</p> : null}
            </div>
          </div>
        )}
        <div className="mt-4">
          <Link
            to="/auth/reset-password"
            className="inline-block px-4 py-2 rounded-lg border border-[#0b3b64] text-[#0b3b64] hover:bg-[#0b3b64] hover:text-white transition"
          >
            Réinitialiser le mot de passe
          </Link>
        </div>
      </div>
    </div>
  );
}
