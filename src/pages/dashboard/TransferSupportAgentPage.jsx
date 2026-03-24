import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bot,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import AdminAssistantUserPicker from "@/components/admin/AdminAssistantUserPicker";
import api from "@/services/api";
import { getMetricValueClass, getStatusBadgeClass } from "@/components/assistants/tone";

function SummaryCard({ summary }) {
  if (!summary) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Demande suivie
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Metric label="Client" value={summary.user_name} />
        <Metric label="Contact client" value={summary.user_email || summary.user_phone} />
        <Metric label="Reference" value={summary.reference_code} />
        <Metric label="ID demande" value={summary.transfer_id} />
        <Metric label="ID transaction" value={summary.transaction_id} />
        <Metric label="Statut demande" value={summary.transfer_status} />
        <Metric label="Statut transaction" value={summary.transaction_status} />
        <Metric label="Montant" value={`${summary.amount || "-"} ${summary.currency || ""}`.trim()} />
        <Metric label="Beneficiaire" value={summary.recipient_name} />
        <Metric label="Telephone beneficiaire" value={summary.recipient_phone} />
        <Metric label="Partenaire" value={summary.partner_name} />
        <Metric label="Pays" value={summary.country_destination} />
        <Metric label="Prochaine etape" value={summary.next_step} />
        <Metric label="Cree le" value={summary.created_at ? new Date(summary.created_at).toLocaleString() : "-"} />
        <Metric label="Traite le" value={summary.processed_at ? new Date(summary.processed_at).toLocaleString() : "-"} />
      </div>
      {summary.review_reasons?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.review_reasons.map((reason) => (
            <span key={reason} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              {reason}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      {label.toLowerCase().includes("statut") ? (
        <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-sm font-bold ${getStatusBadgeClass(value)}`}>{value || "-"}</span>
      ) : (
        <p className={`mt-1 text-sm ${getMetricValueClass(label === "Montant" ? "success" : label === "Prochaine etape" ? "warning" : "info")}`}>{value || "-"}</p>
      )}
    </div>
  );
}

function DraftCard({ draft }) {
  if (!draft) return null;
  const intentLabel =
    draft.intent === "track_transfer"
      ? "Suivi de demande"
      : draft.intent === "pending_reason"
      ? "Raison du pending"
      : draft.intent === "status_help"
      ? "Aide sur les statuts"
      : "Inconnu";
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">Analyse support</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Intention" value={intentLabel} />
        <Field label="Reference" value={draft.reference_code} />
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 ${getMetricValueClass(label === "Reference" ? "info" : "warning")}`}>{value || "-"}</p>
    </div>
  );
}

export default function TransferSupportAgentPage() {
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
    "quel est le statut de ma derniere demande",
    "pourquoi mon transfert est pending",
    "suis la reference EXT-1234ABCD",
  ];
  const prefillRef = searchParams.get("reference");

  const sendMessage = async (nextMessage = null) => {
    const finalMessage = String(nextMessage ?? message).trim();
    if (!finalMessage) return;
    const requestId = ++analyzeRequestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await api.post("/agent/transfer-support-chat", buildPayload(finalMessage));
      if (requestId === analyzeRequestIdRef.current) {
        setResponse(data);
        if (data?.summary?.reference_code) {
          window.localStorage.setItem("paylink_last_transfer_reference", String(data.summary.reference_code));
        }
      }
      if (nextMessage !== null) setMessage(finalMessage);
    } catch (err) {
      if (requestId === analyzeRequestIdRef.current) {
        setError(err?.message || "Impossible de contacter l'assistant support transfert.");
      }
    } finally {
      if (requestId === analyzeRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const storedRef = window.localStorage.getItem("paylink_last_transfer_reference");
    const resolvedReference = String(prefillRef || storedRef || "").trim().toUpperCase();
    if (!resolvedReference) return;
    const prompt = `suis la reference ${resolvedReference}`;
    setMessage((current) => current || prompt);
  }, [prefillRef]);

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
        const data = await api.post("/agent/transfer-support-chat", buildPayload(trimmedMessage));
        if (requestId === analyzeRequestIdRef.current) {
          setResponse(data);
          if (data?.summary?.reference_code) {
            window.localStorage.setItem("paylink_last_transfer_reference", String(data.summary.reference_code));
          }
        }
      } catch (err) {
        if (requestId === analyzeRequestIdRef.current) {
          setError(err?.message || "Impossible de contacter l'assistant support transfert.");
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
      <section className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_#fee2e2,_#ffffff_45%,_#eff6ff_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-700 text-white shadow-lg">
              <Bot size={26} />
            </span>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Assistant support transfert</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Suis une demande existante et comprends precisement pourquoi elle est pending, approved, terminee ou bloquee.
              </p>
              {isAdmin && targetUserId ? (
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-rose-700">
                  Mode admin cible sur un client specifique
                </p>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck size={16} />
              Conseil
            </div>
            <p className="mt-1 text-xs text-slate-500">Assistant de lecture du dossier. Il n'approuve pas et n'execute rien.</p>
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
                {message || "Pose une question de suivi pour commencer."}
              </div>
            </div>
            {response ? (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-3xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Bot size={14} />
                    Assistant support
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
              className="mt-3 w-full rounded-3xl border border-slate-200 px-4 py-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
              placeholder="Ex: pourquoi mon transfert est pending"
            />
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
              Selectionne d'abord un client pour utiliser le support transfert en mode admin.
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

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <HelpCircle size={16} />
              Analyse
            </div>
            <div className="mt-4 space-y-4">
              <DraftCard draft={response?.data} />
              {response?.suggestions?.length ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-rose-900">
                    <Lightbulb size={16} />
                    Suggestions
                  </div>
                  <div className="mt-3 space-y-2">
                    {response.suggestions.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-rose-800">
                        <ChevronRight size={15} className="mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {response?.assumptions?.length ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Details utiles</p>
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
