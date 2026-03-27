import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  CheckCircle2,
  ChevronRight,
  Coins,
  Lightbulb,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";
import { getMetricValueClass, getStatusBadgeClass } from "@/components/assistants/tone";

function SummaryCard({ summary }) {
  if (!summary) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Capacite cash
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <Metric label="Wallet" value={summary.wallet_available} suffix={summary.wallet_currency} icon={Wallet} />
        <Metric label="Credit" value={summary.credit_available} suffix={summary.wallet_currency} icon={Coins} />
        <Metric label="Capacite" value={summary.total_capacity} suffix={summary.wallet_currency} icon={ShieldCheck} />
        <Metric label="Demandes en attente" value={summary.pending_cash_requests} icon={MessageSquare} />
      </div>
    </div>
  );
}

function Metric({ label, value, suffix = "", icon: Icon = Wallet }) {
  const tone =
    label === "Demandes en attente" ? "warning" : label === "Credit" || label === "Capacite" ? "success" : "info";
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
        <Icon size={13} />
        <span>{label}</span>
      </div>
      <p className={`mt-1 text-sm ${getMetricValueClass(tone)}`}>
        {value ?? "-"} {suffix}
      </p>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 ${getMetricValueClass(label === "Montant" ? "success" : "info")}`}>{value || "-"}</p>
    </div>
  );
}

function DraftCard({ draft, missingFields = [], executable = false }) {
  if (!draft) return null;
  const intentLabel =
    draft.intent === "deposit"
      ? "Depot"
      : draft.intent === "withdraw"
      ? "Retrait"
      : draft.intent === "capacity"
      ? "Capacite"
      : draft.intent === "request_status"
      ? "Statut demande"
      : "Inconnu";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-900">Brouillon cash</p>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            executable ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {executable ? "Pret a executer" : "Preparation incomplete"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Operation" value={intentLabel} />
        <Field label="Montant" value={draft.amount} />
        <Field label="Devise" value={draft.currency || draft.wallet_currency} />
        <Field label="Numero mobile" value={draft.mobile_number} />
        <Field label="Operateur" value={draft.provider_name} />
        <Field label="Note" value={draft.note} />
      </div>
      {missingFields.length ? (
        <p className="mt-3 text-xs text-amber-700">Champs manquants: {missingFields.join(", ")}</p>
      ) : null}
    </div>
  );
}

export default function CashAgentPage() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const analyzeRequestIdRef = useRef(0);
  const isAdmin = String(window.localStorage.getItem("role") || "").toLowerCase() === "admin";
  const targetUserId = String(searchParams.get("user") || "").trim();
  const buildPayload = (nextMessage) => ({
    message: nextMessage,
    ...(isAdmin && targetUserId ? { target_user_id: targetUserId } : {}),
  });

  const quickPrompts = [
    "depot 25000 bif",
    "retrait 120 usd via ecocash au +250788123456",
    "quelle est ma capacite cash",
    "quel est le statut de ma derniere demande cash",
    "retrait 30000 bif via lumicash au +25761234567",
    "depot 150 eur",
  ];

  const sendMessage = async (nextMessage = null) => {
    const finalMessage = String(nextMessage ?? message).trim();
    if (!finalMessage) return;
    const requestId = ++analyzeRequestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await api.post("/agent/cash-chat", buildPayload(finalMessage));
      if (requestId === analyzeRequestIdRef.current) {
        setResponse(data);
      }
      if (nextMessage !== null) setMessage(finalMessage);
    } catch (err) {
      if (requestId === analyzeRequestIdRef.current) {
        setError(err?.message || "Impossible de contacter l'agent cash.");
      }
    } finally {
      if (requestId === analyzeRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const trimmedMessage = String(message || "").trim();
    if (!trimmedMessage) {
      analyzeRequestIdRef.current += 1;
      setResponse(null);
      setError("");
      setLoading(false);
      setIsAutoAnalyzing(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      const requestId = ++analyzeRequestIdRef.current;
      setIsAutoAnalyzing(true);
      setLoading(true);
      setError("");
      try {
        const data = await api.post("/agent/cash-chat", buildPayload(trimmedMessage));
        if (requestId === analyzeRequestIdRef.current) {
          setResponse(data);
        }
      } catch (err) {
        if (requestId === analyzeRequestIdRef.current) {
          setError(err?.message || "Impossible de contacter l'agent cash.");
        }
      } finally {
        if (requestId === analyzeRequestIdRef.current) {
          setLoading(false);
          setIsAutoAnalyzing(false);
        }
      }
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const confirmDraft = async () => {
    if (!response?.data) return;
    setConfirming(true);
    setError("");
    try {
      const data = await api.post("/agent/cash-chat/confirm", { draft: response.data });
      setResponse(data);
      const reference = data?.request?.reference_code || data?.request?.request_id;
      if (reference) {
        window.localStorage.setItem("paylink_last_cash_request_reference", String(reference));
      }
    } catch (err) {
      setError(err?.message || "Impossible de confirmer la demande cash.");
    } finally {
      setConfirming(false);
    }
  };

  const cancelDraft = async () => {
    try {
      const data = await api.post("/agent/cash-chat/cancel", {});
      setResponse(data);
    } catch (err) {
      setError(err?.message || "Impossible d'annuler la demande cash.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_#dcfce7,_#ffffff_45%,_#eff6ff_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-700 text-white shadow-lg">
              <Bot size={26} />
            </span>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Assistant cash</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Decris un depot, un retrait ou une demande de capacite. L'assistant analyse pendant la saisie
                et active la confirmation quand la demande est complete.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck size={16} />
              Controle
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isAdmin ? "Mode admin consultation. Ajoute ?user=<uuid> pour cibler un client." : "Confirmation obligatoire avant creation de la demande cash."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquare size={16} />
            Conversation
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-3xl rounded-br-md bg-slate-900 px-4 py-3 text-sm text-white">
                {message || "Tape une demande cash pour commencer."}
              </div>
            </div>

            {response ? (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-3xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Bot size={14} />
                    Assistant cash
                  </div>
                  <p className="mt-2">{response.message}</p>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClass(response.status)}`}>
                    {response.status}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-slate-900">Nouvelle demande</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              className="mt-3 w-full rounded-3xl border border-slate-200 px-4 py-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              placeholder="Ex: retrait 120 usd via ecocash au +250788123456"
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={() => sendMessage()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
              >
                <Send size={16} />
                {loading ? (isAutoAnalyzing ? "Analyse auto..." : "Analyse...") : "Analyser"}
              </button>
              {response?.data ? (
                <>
                  {!isAdmin ? (
                    <button
                      onClick={confirmDraft}
                      disabled={confirming || !response?.executable}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle2 size={16} />
                      {confirming ? "Confirmation..." : "Confirmer la demande"}
                    </button>
                  ) : null}
                  <button
                    onClick={cancelDraft}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700"
                  >
                    <XCircle size={16} />
                    Annuler
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <ApiErrorAlert message={error} className="mt-4" />

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles size={16} />
              Exemples utiles
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 hover:border-slate-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <SummaryCard summary={response?.summary} />

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {response?.data?.intent === "deposit" ? <ArrowDown size={16} /> : response?.data?.intent === "withdraw" ? <ArrowUp size={16} /> : <Coins size={16} />}
              Analyse
            </div>

            <div className="mt-4 space-y-4">
              <DraftCard
                draft={response?.data}
                missingFields={response?.missing_fields || []}
                executable={!!response?.executable}
              />

              {response?.suggestions?.length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <Lightbulb size={16} />
                    Suggestions
                  </div>
                  <div className="mt-3 space-y-2">
                    {response.suggestions.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-amber-800">
                        <ChevronRight size={15} className="mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {response?.status === "DONE" && response.request ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="font-semibold">Demande cash creee</p>
                  <p className="mt-2">Reference : {response.request.reference_code || response.request.request_id}</p>
                  <p>Statut : {response.request.status}</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
