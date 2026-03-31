import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bot,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import AdminAssistantPromptHint from "@/components/admin/AdminAssistantPromptHint";
import AdminAssistantUserPicker from "@/components/admin/AdminAssistantUserPicker";
import AssistantContextPanel from "@/components/assistants/AssistantContextPanel";
import AssistantQuickActions from "@/components/assistants/AssistantQuickActions";
import api from "@/services/api";
import { getMetricValueClass, getStatusBadgeClass } from "@/components/assistants/tone";

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      {label === "Statut" ? (
        <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-sm font-bold ${getStatusBadgeClass(value)}`}>{value || "-"}</span>
      ) : (
        <p className={`mt-1 text-sm break-all ${getMetricValueClass(label.includes("USDC") || label.includes("BIF") ? "success" : "info")}`}>{value || "-"}</p>
      )}
    </div>
  );
}

function SummaryCard({ summary }) {
  if (!summary) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Suivi escrow</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Metric label="Commande" value={summary.order_id} />
        <Metric label="Statut" value={summary.status} />
        <Metric label="Reseau" value={summary.network} />
        <Metric label="Payout" value={summary.payout_provider || "-"} />
        <Metric label="USDC attendu" value={summary.usdc_expected ? `${summary.usdc_expected} USDC` : "-"} />
        <Metric label="Cible BIF" value={summary.bif_target ? `${summary.bif_target} BIF` : "-"} />
      </div>
      {summary.order_id ? (
        <Link
          to={`/dashboard/client/crypto-pay/${summary.order_id}`}
          className="mt-4 inline-flex items-center rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800 hover:bg-cyan-100/70"
        >
          Ouvrir le suivi escrow
        </Link>
      ) : null}
    </div>
  );
}

export default function EscrowAgentPage() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const analyzeRequestIdRef = useRef(0);
  const isAdmin = String(window.localStorage.getItem("role") || "").toLowerCase() === "admin";
  const [targetUserId, setTargetUserId] = useState(String(searchParams.get("user") || "").trim());
  const buildPayload = (nextMessage) => ({
    message: nextMessage,
    ...(isAdmin && targetUserId ? { target_user_id: targetUserId } : {}),
  });

  const quickPrompts = [
    "quel est le statut de mon dernier escrow",
    "pourquoi mon escrow est en attente",
    "quelle est la prochaine etape de mon escrow",
    "explique l'etape en cours de mon escrow",
    "que dois-je faire maintenant sur mon escrow",
  ];

  const sendMessage = async (nextMessage = null) => {
    const finalMessage = String(nextMessage ?? message).trim();
    if (!finalMessage) return;
    const requestId = ++analyzeRequestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await api.post("/agent/escrow-chat", buildPayload(finalMessage));
      if (requestId === analyzeRequestIdRef.current) {
        setResponse(data);
      }
      if (nextMessage !== null) setMessage(finalMessage);
    } catch (err) {
      if (requestId === analyzeRequestIdRef.current) {
        setError(err?.message || "Impossible de contacter l'assistant escrow.");
      }
    } finally {
      if (requestId === analyzeRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const orderId = String(searchParams.get("order") || "").trim();
    if (!orderId) return;
    const prefilled = `suis la commande ${orderId}`;
    setMessage(prefilled);
    sendMessage(prefilled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
        const data = await api.post("/agent/escrow-chat", buildPayload(trimmedMessage));
        if (requestId === analyzeRequestIdRef.current) {
          setResponse(data);
        }
      } catch (err) {
        if (requestId === analyzeRequestIdRef.current) {
          setError(err?.message || "Impossible de contacter l'assistant escrow.");
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
      <section className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_#bfdbfe,_#ffffff_45%,_#f8fafc_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-700 text-white shadow-lg">
              <Bot size={26} />
            </span>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Assistant escrow</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Suivi des commandes escrow: statut actuel, causes d'attente et prochaine etape.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck size={16} />
              Conseil
            </div>
            <p className="mt-1 text-xs text-slate-500">Utilise l'identifiant de commande pour un suivi precis.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          {isAdmin ? <AdminAssistantUserPicker targetUserId={targetUserId} setTargetUserId={setTargetUserId} /> : null}
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquare size={16} />
            Conversation
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-3xl rounded-br-md bg-slate-900 px-4 py-3 text-sm text-white">
                {message || "Demande un statut escrow pour commencer."}
              </div>
            </div>
            {response ? (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-3xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Bot size={14} />
                    Assistant escrow
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
              className="mt-3 w-full rounded-3xl border border-slate-200 px-4 py-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              placeholder="Ex: quel est le statut de mon dernier escrow"
            />
            {isAdmin ? <AdminAssistantPromptHint /> : null}
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={() => sendMessage()}
                disabled={loading || (isAdmin && !targetUserId)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
              >
                <Send size={16} />
                {loading ? (isAutoAnalyzing ? "Analyse auto..." : "Analyse...") : "Analyser"}
              </button>
            </div>
          </div>

          <ApiErrorAlert message={error} className="mt-4" />
          {isAdmin && !targetUserId ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Selectionne d'abord un client pour utiliser l'assistant escrow en mode admin.
            </div>
          ) : null}

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
          <AssistantContextPanel summary={response?.summary} />
          <AssistantQuickActions assistantKey="escrow" summary={response?.summary} onPick={sendMessage} />
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles size={16} />
              Analyse
            </div>
            <div className="mt-4 space-y-4">
              {response?.suggestions?.length ? (
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
                    <Lightbulb size={16} />
                    Suggestions
                  </div>
                  <div className="mt-3 space-y-2">
                    {response.suggestions.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-cyan-800">
                        <ChevronRight size={15} className="mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {response?.assumptions?.length ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Elements detectes</p>
                  <div className="mt-3 space-y-2">
                    {response.assumptions.map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <ChevronRight size={15} className="mt-0.5 shrink-0 text-slate-400" />
                        <span>{item}</span>
                      </div>
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
