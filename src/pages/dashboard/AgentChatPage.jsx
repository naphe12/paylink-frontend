import { useState } from "react";
import { Bot, CheckCircle2, MessageSquare, Send, XCircle } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

function DraftCard({ draft, missingFields = [], executable = false }) {
  if (!draft) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">Brouillon interprete</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <p>Montant: <span className="font-semibold">{draft.amount || "-"}</span></p>
        <p>Devise: <span className="font-semibold">{draft.currency || "-"}</span></p>
        <p>Beneficiaire: <span className="font-semibold">{draft.recipient || "-"}</span></p>
        <p>Telephone: <span className="font-semibold">{draft.recipient_phone || "-"}</span></p>
        <p>Partenaire: <span className="font-semibold">{draft.partner_name || "-"}</span></p>
        <p>Pays: <span className="font-semibold">{draft.country_destination || "-"}</span></p>
      </div>
      {missingFields.length ? (
        <p className="mt-3 text-xs text-amber-700">
          Champs manquants: {missingFields.join(", ")}
        </p>
      ) : null}
      <p className={`mt-2 text-xs ${executable ? "text-emerald-700" : "text-slate-500"}`}>
        {executable
          ? "Le transfert est executable directement."
          : "Le chat peut preparer la demande, mais il manque encore des informations pour l'execution automatique."}
      </p>
    </div>
  );
}

export default function AgentChatPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.post("/agent/chat", { message });
      setResponse(data);
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
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <Bot size={24} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Agent PayLink</h1>
            <p className="mt-2 text-sm text-slate-500">
              Ecris naturellement ta demande. Exemple : <span className="font-medium">envoie 100 EUR a Jean via Lumicash au Burundi au +25761234567</span>
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-900">Message</label>
        <div className="mt-3 flex flex-col gap-3">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Ex: envoie 100 EUR a Jean via Lumicash au Burundi au +25761234567"
          />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={sendMessage}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
            >
              <Send size={16} />
              {loading ? "Analyse..." : "Envoyer"}
            </button>
          </div>
        </div>

        <ApiErrorAlert message={error} className="mt-4" />

        {response ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MessageSquare size={16} />
                Reponse agent
              </div>
              <p className="mt-2 text-sm text-slate-700">{response.message}</p>
              <p className="mt-2 text-xs text-slate-500">Statut: {response.status}</p>
            </div>

            <DraftCard
              draft={response.data}
              missingFields={response.missing_fields || []}
              executable={!!response.executable}
            />

            {response.status === "CONFIRM" ? (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={confirmDraft}
                  disabled={confirming}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-60"
                >
                  <CheckCircle2 size={16} />
                  {confirming ? "Confirmation..." : "Confirmer"}
                </button>
                <button
                  onClick={cancelDraft}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700"
                >
                  <XCircle size={16} />
                  Annuler
                </button>
              </div>
            ) : null}

            {response.status === "DONE" && response.transfer ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="font-semibold">Transfert cree</p>
                <p className="mt-1">Reference: {response.transfer.reference_code || response.transfer.transfer_id}</p>
                <p>Statut: {response.transfer.status}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
