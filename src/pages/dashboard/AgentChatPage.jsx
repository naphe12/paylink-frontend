import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

function SummaryCard({ summary }) {
  if (!summary) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Capacite client
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric label="Wallet" value={summary.wallet_available} suffix={summary.wallet_currency} />
        <Metric label="Credit dispo" value={summary.credit_available} suffix={summary.wallet_currency} />
        <Metric label="Capacite totale" value={summary.total_capacity} suffix={summary.wallet_currency} />
      </div>
    </div>
  );
}

function Metric({ label, value, suffix = "" }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {value ?? "-"} {suffix}
      </p>
    </div>
  );
}

function DraftCard({ draft, missingFields = [], executable = false, assumptions = [] }) {
  if (!draft) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-900">Proposition de transfert</p>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            executable ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {executable ? "Pret a executer" : "Preparation incomplete"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Montant" value={draft.amount} />
        <Field label="Devise source" value={draft.currency || draft.wallet_currency} />
        <Field label="Beneficiaire" value={draft.recipient} />
        <Field label="Telephone" value={draft.recipient_phone} />
        <Field label="Partenaire" value={draft.partner_name} />
        <Field label="Destination" value={draft.country_destination} />
      </div>
      {draft.recognized_beneficiary ? (
        <p className="mt-3 text-xs text-emerald-700">Beneficiaire reconnu depuis l'historique client.</p>
      ) : null}
      {missingFields.length ? (
        <p className="mt-3 text-xs text-amber-700">Champs manquants: {missingFields.join(", ")}</p>
      ) : null}
      {assumptions.length ? (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
          <p className="font-semibold">Hypotheses appliquees</p>
          <ul className="mt-2 space-y-1">
            {assumptions.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}
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

export default function AgentChatPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const quickPrompts = [
    "envoie 100 EUR a Jean via Lumicash au Burundi au +25761234567",
    "transfert 250 usd a Clarisse au Rwanda via Ecocash",
    "envoie 66000 CFA a Jean au Burundi",
  ];

  const sendMessage = async (nextMessage = null) => {
    const finalMessage = String(nextMessage ?? message).trim();
    if (!finalMessage) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.post("/agent/chat", { message: finalMessage });
      setResponse(data);
      if (nextMessage !== null) setMessage(finalMessage);
    } catch (err) {
      setError(err?.message || "Impossible de contacter l'agent.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDraft = async () => {
    if (!response?.data) return;
    setConfirming(true);
    setError("");
    try {
      const data = await api.post("/agent/chat/confirm", { draft: response.data });
      setResponse(data);
    } catch (err) {
      setError(err?.message || "Impossible de confirmer la demande.");
    } finally {
      setConfirming(false);
    }
  };

  const cancelDraft = async () => {
    try {
      const data = await api.post("/agent/chat/cancel", {});
      setResponse(data);
    } catch (err) {
      setError(err?.message || "Impossible d'annuler la demande.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_#dbeafe,_#ffffff_45%,_#eef2ff_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-lg">
              <Bot size={26} />
            </span>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Assistant transfert externe</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Décris l'opération en langage naturel. L'assistant prépare un brouillon propre,
                réutilise l'historique bénéficiaire et te propose l'exécution lorsqu'il a assez d'informations.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck size={16} />
              Controle
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Confirmation obligatoire avant exécution.
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
                {message || "Tape une demande de transfert externe pour commencer."}
              </div>
            </div>

            {response ? (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-3xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Bot size={14} />
                    Assistant
                  </div>
                  <p className="mt-2">{response.message}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
                    {response.status}
                  </p>
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
              className="mt-3 w-full rounded-3xl border border-slate-200 px-4 py-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Ex: envoie 100 EUR a Jean via Lumicash au Burundi au +25761234567"
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={() => sendMessage()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
              >
                <Send size={16} />
                {loading ? "Analyse..." : "Analyser"}
              </button>
              {response?.status === "CONFIRM" ? (
                <>
                  <button
                    onClick={confirmDraft}
                    disabled={confirming}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-60"
                  >
                    <CheckCircle2 size={16} />
                    {confirming ? "Confirmation..." : "Confirmer le transfert"}
                  </button>
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
              <User size={16} />
              Analyse
            </div>

            <div className="mt-4 space-y-4">
              <DraftCard
                draft={response?.data}
                missingFields={response?.missing_fields || []}
                executable={!!response?.executable}
                assumptions={response?.assumptions || []}
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

              {response?.status === "DONE" && response.transfer ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="font-semibold">Transfert créé</p>
                  <p className="mt-2">Référence : {response.transfer.reference_code || response.transfer.transfer_id}</p>
                  <p>Statut : {response.transfer.status}</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
