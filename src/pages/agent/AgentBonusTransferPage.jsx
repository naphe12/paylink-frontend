import { useEffect, useMemo, useState } from "react";
import { Gift, RefreshCcw, Search } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";
import { buildUserOptionLabel } from "@/utils/userRecentActivity";

function formatAmount(value, currency = "") {
  const amount = Number(value || 0);
  const formatted = Number.isFinite(amount) ? amount.toLocaleString() : "0";
  return currency ? `${formatted} ${currency}` : formatted;
}

export default function AgentBonusTransferPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedSenderId, setSelectedSenderId] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [amountBif, setAmountBif] = useState("");
  const [senderSummary, setSenderSummary] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = String(query || "").trim().toLowerCase();
    if (!normalizedQuery) return users;
    return users.filter((user) => {
      const haystack = `${user.full_name || ""} ${user.email || ""} ${user.phone_e164 || ""} ${user.paytag || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, users]);

  const selectedSender = users.find((item) => item.user_id === selectedSenderId) || null;
  const selectedRecipient = users.find((item) => item.user_id === selectedRecipientId) || null;

  const loadUsers = async (searchValue = "") => {
    try {
      setLoadingUsers(true);
      const data = await api.searchAgentCashUsers(searchValue, 200);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setUsers([]);
      setErrorMessage(err?.message || "Impossible de charger les clients bonus.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers("");
  }, []);

  useEffect(() => {
    if (!selectedSenderId) {
      setSenderSummary(null);
      return;
    }

    let active = true;
    const loadSummary = async () => {
      try {
        setLoadingSummary(true);
        const data = await api.getAgentBonusUserSummary(selectedSenderId);
        if (!active) return;
        setSenderSummary(data || null);
      } catch (err) {
        if (!active) return;
        setSenderSummary(null);
        setErrorMessage(err?.message || "Impossible de charger le solde bonus du client.");
      } finally {
        if (active) setLoadingSummary(false);
      }
    };

    loadSummary();
    return () => {
      active = false;
    };
  }, [selectedSenderId]);

  const handleReload = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    await loadUsers(query);
    if (selectedSenderId) {
      try {
        setLoadingSummary(true);
        const data = await api.getAgentBonusUserSummary(selectedSenderId);
        setSenderSummary(data || null);
      } catch (err) {
        setSenderSummary(null);
        setErrorMessage(err?.message || "Impossible de recharger le solde bonus du client.");
      } finally {
        setLoadingSummary(false);
      }
    }
  };

  const handleSubmit = async () => {
    const available = Number(senderSummary?.bonus_balance || 0);
    const amount = Number(amountBif || 0);

    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedSenderId || !selectedRecipientId) {
      setErrorMessage("Selectionnez le client emetteur et le client destinataire.");
      return;
    }
    if (selectedSenderId === selectedRecipientId) {
      setErrorMessage("L'emetteur bonus et le destinataire doivent etre differents.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Entrez un montant bonus valide en BIF.");
      return;
    }
    if (amount > available) {
      setErrorMessage("Le montant depasse le bonus disponible du client.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await api.sendAgentBonusTransfer({
        sender_user_id: selectedSenderId,
        recipient_user_id: selectedRecipientId,
        amount_bif: amount,
      });
      setAmountBif("");
      setSuccessMessage(
        `Bonus envoye: ${formatAmount(result.amount_bif, result.currency_code)} de ${result.sender_label || "client"} vers ${result.recipient_label || "client"}.`
      );
      try {
        const refreshedSummary = await api.getAgentBonusUserSummary(selectedSenderId);
        setSenderSummary(refreshedSummary || null);
      } catch {
        // Keep the successful transfer message even if the sender summary refresh fails.
      }
    } catch (err) {
      setErrorMessage(err?.message || "Transfert bonus agent impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Gift size={22} />
              Transfert bonus client
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Flux agent sans frais et sans validation. Le montant est saisi en BIF, envoye en BIF, recu en BIF et debite immediatement du bonus disponible du client emetteur.
            </p>
          </div>
        </div>
      </section>

      <ApiErrorAlert message={errorMessage} />
      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.25fr,0.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Recherche client
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                aria-label="Recherche client bonus"
                type="text"
                className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400"
                placeholder="Nom, email, telephone ou paytag"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Client emetteur
              </span>
              <select
                aria-label="Client emetteur bonus"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                value={selectedSenderId}
                onChange={(event) => setSelectedSenderId(event.target.value)}
              >
                <option value="">-- selectionner un client --</option>
                {filteredUsers.map((user) => (
                  <option key={`sender-${user.user_id}`} value={user.user_id}>
                    {buildUserOptionLabel(user)} - {user.email || user.phone_e164 || "-"}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Client destinataire
              </span>
              <select
                aria-label="Client destinataire bonus"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                value={selectedRecipientId}
                onChange={(event) => setSelectedRecipientId(event.target.value)}
              >
                <option value="">-- selectionner un client --</option>
                {filteredUsers.map((user) => (
                  <option key={`recipient-${user.user_id}`} value={user.user_id}>
                    {buildUserOptionLabel(user)} - {user.email || user.phone_e164 || "-"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Montant bonus (BIF)
            </span>
            <input
              aria-label="Montant bonus agent BIF"
              type="number"
              min="0"
              step="0.01"
              value={amountBif}
              onChange={(event) => setAmountBif(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              placeholder="0"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Gift size={16} />
              {submitting ? "Envoi..." : "Envoyer le bonus"}
            </button>
            <button
              type="button"
              onClick={handleReload}
              disabled={loadingUsers || loadingSummary}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <RefreshCcw size={16} />
              {loadingUsers ? "Chargement..." : "Rafraichir"}
            </button>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Bonus emetteur</p>
            <h2 className="mt-2 text-lg font-semibold">{selectedSender?.full_name || "Aucun client"}</h2>
            <p className="mt-1 text-sm text-slate-400">{selectedSender?.email || selectedSender?.phone_e164 || "-"}</p>
          </div>

          <div className="mt-6 rounded-2xl bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Bonus disponible</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {loadingSummary ? "..." : formatAmount(senderSummary?.bonus_balance, senderSummary?.currency_code || "BIF")}
            </p>
          </div>

          <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-slate-300">
            <p>Destinataire: {selectedRecipient?.full_name || "-"}</p>
            <p className="mt-2">Aucun frais applique sur ce flux bonus.</p>
            <p className="mt-2">Aucune validation requise. L'operation est executee immediatement.</p>
            <p className="mt-2">Le client peut envoyer uniquement ce qu'il dispose en bonus.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
