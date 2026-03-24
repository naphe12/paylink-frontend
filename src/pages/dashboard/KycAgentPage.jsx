import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bot,
  ChevronRight,
  FileCheck,
  Lightbulb,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

function SummaryCard({ summary }) {
  if (!summary) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Situation KYC
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Metric label="Statut" value={summary.kyc_status} />
        <Metric label="Niveau" value={summary.kyc_tier} />
        <Metric label="Limite jour" value={summary.daily_limit} />
        <Metric label="Limite mois" value={summary.monthly_limit} />
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value || "-"}</p>
    </div>
  );
}

function DraftCard({ draft }) {
  if (!draft) return null;
  const intentLabel =
    draft.intent === "status"
      ? "Statut KYC"
      : draft.intent === "missing_docs"
      ? "Documents manquants"
      : draft.intent === "limits"
      ? "Limites"
      : draft.intent === "upgrade_benefits"
      ? "Niveau suivant"
      : "Inconnu";
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">Analyse KYC</p>
      <div className="mt-4 grid gap-3">
        <Field label="Intention" value={intentLabel} />
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value || "-"}</p>
    </div>
  );
}

export default function KycAgentPage() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const analyzeRequestIdRef = useRef(0);
  const isAdmin = String(window.localStorage.getItem("role") || "").toLowerCase() === "admin";
  const targetUserId = String(searchParams.get("user") || "").trim();
  const buildPayload = (nextMessage) => ({
    message: nextMessage,
    ...(isAdmin && targetUserId ? { target_user_id: targetUserId } : {}),
  });

  const quickPrompts = [
    "quel est mon niveau kyc",
    "quels documents il me manque",
    "si je fais mon kyc qu'est ce qui change",
  ];

  const sendMessage = async (nextMessage = null) => {
    const finalMessage = String(nextMessage ?? message).trim();
    if (!finalMessage) return;
    const requestId = ++analyzeRequestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await api.post("/agent/kyc-chat", buildPayload(finalMessage));
      if (requestId === analyzeRequestIdRef.current) {
        setResponse(data);
      }
      if (nextMessage !== null) setMessage(finalMessage);
    } catch (err) {
      if (requestId === analyzeRequestIdRef.current) {
        setError(err?.message || "Impossible de contacter l'assistant KYC.");
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
        const data = await api.post("/agent/kyc-chat", buildPayload(trimmedMessage));
        if (requestId === analyzeRequestIdRef.current) {
          setResponse(data);
        }
      } catch (err) {
        if (requestId === analyzeRequestIdRef.current) {
          setError(err?.message || "Impossible de contacter l'assistant KYC.");
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

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_#dcfce7,_#ffffff_45%,_#eff6ff_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-600 text-white shadow-lg">
              <Bot size={26} />
            </span>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Assistant KYC</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Verifie ton statut KYC, les documents attendus, tes plafonds actuels et ce que debloque le niveau suivant.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck size={16} />
              Conseil
            </div>
            <p className="mt-1 text-xs text-slate-500">Assistant d'explication et de guidage. Il n'envoie pas les documents lui-meme.</p>
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
                {message || "Pose une question KYC pour commencer."}
              </div>
            </div>
            {response ? (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-3xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Bot size={14} />
                    Assistant KYC
                  </div>
                  <p className="mt-2">{response.message}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{response.status}</p>
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
              placeholder="Ex: quels documents il me manque"
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
              <Link
                to="/dashboard/client/account/kyc"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                <FileCheck size={16} />
                Ouvrir la page KYC
              </Link>
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
              <FileCheck size={16} />
              Analyse
            </div>
            <div className="mt-4 space-y-4">
              <DraftCard draft={response?.data} />
              {response?.suggestions?.length ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    <Lightbulb size={16} />
                    Suggestions
                  </div>
                  <div className="mt-3 space-y-2">
                    {response.suggestions.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-emerald-800">
                        <ChevronRight size={15} className="mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {response?.summary?.missing_docs?.length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <FileCheck size={16} />
                    Documents detectes comme manquants
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {response.summary.missing_docs.map((item) => (
                      <span key={item} className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs text-amber-800">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
