import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, RefreshCcw, Search, UserRound, Wallet } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

const CASH_ACTIONS = {
  deposit: {
    title: "Depot client",
    subtitle: "Creditez le portefeuille du client depuis l'espace agent avec le meme parcours direct que l'admin.",
    actionLabel: "Deposer",
    amountPlaceholder: "Montant du depot",
    buttonClassName: "bg-emerald-600 hover:bg-emerald-500",
    badgeClassName: "bg-emerald-100 text-emerald-700",
    summaryLabel: "Depot pret",
    icon: ArrowDownCircle,
    scope: "agent-cash-deposit",
  },
  withdraw: {
    title: "Retrait client",
    subtitle: "Debitez le portefeuille du client et confirmez immediatement le retrait terrain.",
    actionLabel: "Retirer",
    amountPlaceholder: "Montant du retrait",
    buttonClassName: "bg-rose-600 hover:bg-rose-500",
    badgeClassName: "bg-rose-100 text-rose-700",
    summaryLabel: "Retrait pret",
    icon: ArrowUpCircle,
    scope: "agent-cash-out",
  },
};

export default function AgentCashActionPage({ initialType = "deposit" }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUidFromUrl = searchParams.get("uid") || "";
  const [cashType, setCashType] = useState(initialType);
  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(selectedUidFromUrl);
  const [selectSearch, setSelectSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const idemKeyRef = useRef(null);

  const config = CASH_ACTIONS[cashType] || CASH_ACTIONS.deposit;
  const Icon = config.icon;
  const selectedUser = users.find((user) => user.user_id === selectedUserId) || null;
  const selectedCurrency = selectedUser?.currency_code || "EUR";

  const filteredUsers = useMemo(() => {
    const query = selectSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const label = `${user.full_name || ""} ${user.email || ""} ${user.phone_e164 || ""}`.toLowerCase();
      return label.includes(query);
    });
  }, [users, selectSearch]);

  useEffect(() => {
    setCashType(initialType);
  }, [initialType]);

  useEffect(() => {
    setSelectedUserId(selectedUidFromUrl);
  }, [selectedUidFromUrl]);

  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const data = await api.searchAgentCashUsers(userQuery, 200);
        if (!active) return;
        const nextUsers = Array.isArray(data) ? data : [];
        setUsers(nextUsers);
        setSelectedUserId((prev) => {
          if (prev && nextUsers.some((user) => user.user_id === prev)) return prev;
          if (selectedUidFromUrl && nextUsers.some((user) => user.user_id === selectedUidFromUrl)) {
            return selectedUidFromUrl;
          }
          return prev || "";
        });
      } catch {
        if (!active) return;
        setUsers([]);
      } finally {
        if (active) setLoadingUsers(false);
      }
    };
    loadUsers();
    return () => {
      active = false;
    };
  }, [userQuery, selectedUidFromUrl]);

  const handleTypeChange = (nextType) => {
    if (nextType === cashType) return;
    setCashType(nextType);
    setSuccessMessage("");
    setErrorMessage("");
    navigate(`/dashboard/agent/${nextType === "deposit" ? "cash-in" : "cash-out"}${selectedUserId ? `?uid=${selectedUserId}` : ""}`);
  };

  const handleSelectUser = (nextUserId) => {
    setSelectedUserId(nextUserId);
    setSuccessMessage("");
    const nextParams = new URLSearchParams(searchParams);
    if (nextUserId) nextParams.set("uid", nextUserId);
    else nextParams.delete("uid");
    setSearchParams(nextParams, { replace: true });
  };

  const handleSubmit = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedUserId || !amount || Number(amount) <= 0) {
      setErrorMessage("Selectionnez un client et entrez un montant valide.");
      return;
    }

    try {
      setSubmitting(true);
      if (!idemKeyRef.current) {
        idemKeyRef.current = api.newIdempotencyKey(config.scope);
      }

      const payload = { amount: Number(amount) };
      const response = cashType === "deposit"
        ? await api.agentCashDeposit({ ...payload, user_id: selectedUserId }, idemKeyRef.current)
        : await api.postWithHeaders(
          "/agent/cash-out",
          { ...payload, client_user_id: selectedUserId },
          { "Idempotency-Key": idemKeyRef.current }
        );

      idemKeyRef.current = null;
      setAmount("");
      setSuccessMessage(
        cashType === "deposit"
          ? `Depot effectue. Nouveau solde client: ${response.new_balance} ${response.currency}`
          : "Retrait effectue avec succes."
      );
    } catch (err) {
      setErrorMessage(
        err?.message || (cashType === "deposit" ? "Erreur depot cash." : "Echec retrait cash.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${config.badgeClassName}`}>
            <Icon size={14} />
            {config.summaryLabel}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{config.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">{config.subtitle}</p>
          </div>
        </div>
        <div className="inline-flex rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => handleTypeChange("deposit")}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              cashType === "deposit" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Depot
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("withdraw")}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              cashType === "withdraw" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Retrait
          </button>
        </div>
      </header>

      <ApiErrorAlert message={errorMessage} />
      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Recherche client
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400"
                  placeholder="Nom, email ou telephone"
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                />
              </div>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Selection du client
              </span>
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                value={selectedUserId}
                onChange={(event) => handleSelectUser(event.target.value)}
              >
                <option value="">-- selectionner un client --</option>
                {filteredUsers.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.full_name || "Sans nom"} - {user.email || "-"} - {user.phone_e164 || "-"}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Filtre dans la liste
              </span>
              <input
                type="text"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="Affiner par nom, email ou telephone"
                value={selectSearch}
                onChange={(event) => setSelectSearch(event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Montant
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder={`${config.amountPlaceholder} (${selectedCurrency})`}
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${config.buttonClassName}`}
              >
                <Icon size={18} />
                {submitting ? "Traitement..." : config.actionLabel}
              </button>
              <button
                type="button"
                onClick={() => setUserQuery("")}
                disabled={loadingUsers}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <RefreshCcw size={16} />
                {loadingUsers ? "Chargement..." : "Rafraichir la liste"}
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <UserRound size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Client selectionne</p>
              <h2 className="text-lg font-semibold">{selectedUser?.full_name || "Aucun client"}</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Email</p>
              <p className="mt-1 break-all text-slate-100">{selectedUser?.email || "-"}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Telephone</p>
              <p className="mt-1 text-slate-100">{selectedUser?.phone_e164 || "-"}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="flex items-center gap-2 text-slate-200">
                <Wallet size={16} />
                <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Devise</span>
              </div>
              <p className="mt-2 text-xl font-semibold text-white">{selectedCurrency}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {cashType === "deposit"
              ? "Utilisez ce flux pour crediter directement le portefeuille d'un client en face a face."
              : "Utilisez ce flux pour debiter le portefeuille d'un client apres verification terrain."}
          </div>
        </aside>
      </section>
    </div>
  );
}
