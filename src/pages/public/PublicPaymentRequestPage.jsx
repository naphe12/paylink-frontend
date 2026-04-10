import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "@/services/api";

const STATUS_LABELS = {
  pending: "En attente",
  paid: "Payee",
  declined: "Refusee",
  cancelled: "Annulee",
  expired: "Expiree",
  draft: "Brouillon",
};

function formatMoney(amount, currencyCode) {
  const numeric = Number(amount || 0);
  return `${numeric.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currencyCode || ""}`.trim();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export default function PublicPaymentRequestPage() {
  const { shareToken = "" } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await api.getPublicPaymentRequest(shareToken);
        setRequest(data || null);
      } catch (err) {
        setError(err?.message || "Impossible de charger ce lien de paiement.");
      } finally {
        setLoading(false);
      }
    };
    if (shareToken) load();
  }, [shareToken]);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">PesaPaid</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Lien de paiement</h1>
          <p className="mt-2 text-sm text-slate-500">
            Consulte la demande, puis connecte-toi a ton espace pour la regler si elle est toujours active.
          </p>
        </section>

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Chargement du lien...
          </section>
        ) : error ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
            {error}
          </section>
        ) : !request ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Demande introuvable.
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Beneficiaire</p>
                <h2 className="text-2xl font-semibold text-slate-950">{request.counterpart_label || "PesaPaid Merchant"}</h2>
                <p className="mt-1 text-sm text-slate-500">{request.title || "Demande de paiement"}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {STATUS_LABELS[request.status] || request.status}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Montant</p>
              <p className="mt-2 text-4xl font-semibold text-slate-950">
                {formatMoney(request.amount, request.currency_code)}
              </p>
            </div>

            {request.note ? (
              <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                {request.note}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Echeance</p>
                <p className="mt-1 text-sm text-slate-800">{formatDateTime(request.due_at)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Expiration</p>
                <p className="mt-1 text-sm text-slate-800">{formatDateTime(request.expires_at)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Se connecter pour payer
              </Link>
              <Link
                to="/"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Retour a l'accueil
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
