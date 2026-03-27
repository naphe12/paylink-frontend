import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import RichAssistantText from "@/components/assistants/RichAssistantText";
import { getMetricValueClass, getStatusBadgeClass } from "@/components/assistants/tone";
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
      <p className={`mt-1 text-sm ${getMetricValueClass("success")}`}>
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
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [telegramLinkData, setTelegramLinkData] = useState(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramCopied, setTelegramCopied] = useState(false);
  const analyzeRequestIdRef = useRef(0);
  const isAdmin = String(window.localStorage.getItem("role") || "").toLowerCase() === "admin";
  const [targetUserId, setTargetUserId] = useState(String(searchParams.get("user") || "").trim());
  const buildPayload = (nextMessage) => ({
    message: nextMessage,
    ...(isAdmin && targetUserId ? { target_user_id: targetUserId } : {}),
  });

  const quickPrompts = [
    "envoie 100 EUR a Jean via Lumicash au Burundi au +25761234567",
    "transfert 250 usd a Clarisse au Rwanda via Ecocash",
    "envoie 66000 CFA a Jean au Burundi",
  ];

  useEffect(() => {
    if (!isAdmin || !targetUserId) return;
    let cancelled = false;
    api
      .get(`/admin/users/${targetUserId}`)
      .then((data) => {
        if (cancelled || !data) return;
        setSelectedUser({
          user_id: data.user_id,
          full_name: data.full_name,
          email: data.email,
          phone: data.phone_e164,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin, targetUserId]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const query = String(userSearch || "").trim();
    if (query.length < 2) {
      setUserResults([]);
      setUserLoading(false);
      return undefined;
    }
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setUserLoading(true);
      try {
        const data = await api.get(`/admin/users?q=${encodeURIComponent(query)}`);
        if (!cancelled) {
          setUserResults(Array.isArray(data) ? data.slice(0, 8) : []);
        }
      } catch {
        if (!cancelled) setUserResults([]);
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isAdmin, userSearch]);

  const sendMessage = async (nextMessage = null) => {
    const finalMessage = String(nextMessage ?? message).trim();
    if (!finalMessage) return;
    const requestId = ++analyzeRequestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await api.post("/agent/chat", buildPayload(finalMessage));
      if (requestId === analyzeRequestIdRef.current) {
        setResponse(data);
      }
      if (nextMessage !== null) setMessage(finalMessage);
    } catch (err) {
      if (requestId === analyzeRequestIdRef.current) {
        setError(err?.message || "Impossible de contacter l'assistant.");
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
        const data = await api.post("/agent/chat", buildPayload(trimmedMessage));
        if (requestId === analyzeRequestIdRef.current) {
          setResponse(data);
        }
      } catch (err) {
        if (requestId === analyzeRequestIdRef.current) {
          setError(err?.message || "Impossible de contacter l'assistant.");
        }
      } finally {
        if (requestId === analyzeRequestIdRef.current) {
          setLoading(false);
          setIsAutoAnalyzing(false);
        }
      }
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message]);

  const confirmDraft = async () => {
    if (!response?.data) return;
    setConfirming(true);
    setError("");
    try {
      const data = await api.post("/agent/chat/confirm", { draft: response.data });
      setResponse(data);
      const transferReference = data?.transfer?.reference_code || data?.transfer?.transfer_id;
      if (transferReference) {
        window.localStorage.setItem("paylink_last_transfer_reference", String(transferReference));
      }
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

  const chooseUser = (user) => {
    setSelectedUser(user);
    setTargetUserId(String(user?.user_id || ""));
    setUserSearch(user?.full_name || user?.email || "");
    setUserResults([]);
  };

  const generateTelegramLink = async () => {
    setTelegramLoading(true);
    setTelegramCopied(false);
    setError("");
    try {
      const data = await api.post("/telegram/external-transfer/link-token", {});
      setTelegramLinkData(data);
    } catch (err) {
      setError(err?.message || "Impossible de generer le lien Telegram.");
    } finally {
      setTelegramLoading(false);
    }
  };

  const copyTelegramCommand = async () => {
    if (!telegramLinkData?.command || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(telegramLinkData.command);
      setTelegramCopied(true);
      window.setTimeout(() => setTelegramCopied(false), 1500);
    } catch {}
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
              <h1 className="text-3xl font-semibold text-slate-900">Assistant transfert</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Decris une demande en langage naturel. L'assistant prepare un brouillon propre,
                reutilise l'historique beneficiaire et te propose la confirmation quand il a assez d'informations.
              </p>
            </div>
          </div>

        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck size={16} />
            Controle
          </div>
            <p className="mt-1 text-xs text-slate-500">
              {isAdmin ? "Mode admin: choisir un client puis analyser son transfert." : "Confirmation obligatoire avant execution."}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">Telegram</p>
              <p className="mt-1 text-xs text-slate-500">
                Lie ce compte au bot pour preparer et confirmer un transfert externe depuis Telegram.
              </p>
            </div>
            <button
              type="button"
              onClick={generateTelegramLink}
              disabled={telegramLoading}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
            >
              {telegramLoading ? "Generation..." : "Generer le jeton"}
            </button>
          </div>
          {telegramLinkData?.command ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Commande a envoyer au bot</p>
              <p className="mt-2 break-all font-mono">{telegramLinkData.command}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={copyTelegramCommand}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
                >
                  {telegramCopied ? "Commande copiee" : "Copier la commande"}
                </button>
                <span className="text-[11px] text-emerald-700">
                  Jeton genere. Envoie maintenant cette commande au bot.
                </span>
              </div>
              {telegramLinkData.bot_url ? (
                <a
                  href={telegramLinkData.bot_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sky-700 hover:text-sky-800"
                >
                  Ouvrir le bot Telegram
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          {isAdmin ? (
            <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">Client cible</p>
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Rechercher un client par nom, email ou telephone"
              />
              {selectedUser ? (
                <div className="mt-3 rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{selectedUser.full_name || "Client sans nom"}</p>
                  <p>{selectedUser.email || selectedUser.phone || selectedUser.user_id}</p>
                  <p className="mt-1 text-xs text-slate-500">user_id: {selectedUser.user_id}</p>
                </div>
              ) : null}
              {userLoading ? <p className="mt-3 text-xs text-blue-700">Recherche...</p> : null}
              {userResults.length ? (
                <div className="mt-3 space-y-2">
                  {userResults.map((user) => (
                    <button
                      key={user.user_id}
                      type="button"
                      onClick={() => chooseUser(user)}
                      className="w-full rounded-xl border border-blue-200 bg-white px-3 py-3 text-left text-sm text-slate-700 hover:bg-blue-100/60"
                    >
                      <p className="font-semibold text-slate-900">{user.full_name || "Client sans nom"}</p>
                      <p>{user.email || user.phone || user.user_id}</p>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquare size={16} />
            Conversation
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-3xl rounded-br-md bg-slate-900 px-4 py-3 text-sm text-white">
                {message || "Tape une demande de transfert pour commencer."}
              </div>
            </div>

            {response ? (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-3xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Bot size={14} />
                    Assistant
                  </div>
                  <RichAssistantText text={response.message} className="mt-2" />
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
              className="mt-3 w-full rounded-3xl border border-slate-200 px-4 py-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Ex: envoie 100 EUR a Jean via Lumicash au Burundi au +25761234567"
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
          {isAdmin && !targetUserId ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Selectionne d'abord un client pour utiliser l'assistant transfert en mode admin.
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
                  {(() => {
                    const transferReference = response.transfer.reference_code || response.transfer.transfer_id;
                    const notificationChannels = Array.isArray(response.notification_channels)
                      ? response.notification_channels
                      : [];
                    return (
                      <>
                  <p className="font-semibold">Demande creee</p>
                  <p className="mt-2">Reference : {transferReference}</p>
                  <p>Statut : {response.transfer.status}</p>
                  {notificationChannels.includes("telegram") ? (
                    <p className="mt-2 font-medium text-emerald-700">
                      Notification Telegram preparee pour le suivi du transfert.
                    </p>
                  ) : null}
                  <Link
                    to={`/dashboard/client/transfer-support-agent?reference=${encodeURIComponent(transferReference)}`}
                    className="mt-3 inline-flex items-center rounded-lg border border-emerald-300 bg-white px-3 py-2 font-medium text-emerald-800 hover:bg-emerald-100/60"
                  >
                    Suivre cette demande
                  </Link>
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
