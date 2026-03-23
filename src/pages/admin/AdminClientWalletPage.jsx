import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, CreditCard, Search, Users, Wallet } from "lucide-react";
import api from "@/services/api";
import { formatWalletOperationLabel, inferWalletEntryIsCredit } from "@/utils/walletHistory";

const DEFAULT_HISTORY_FILTERS = { limit: 25, search: "" };

function buildWalletHistoryLinks(entry, userId, selectedWalletId) {
  const operationType = String(entry?.operation_type || "").toLowerCase();
  const reference = encodeURIComponent(String(entry?.reference || "").trim());
  const links = [];

  if (operationType.includes("external_transfer")) {
    links.push({
      label: "Transfert externe",
      to: `/dashboard/admin/transfers?user_id=${userId}`,
    });
  }
  if (operationType.includes("cash") || operationType.includes("topup") || operationType.includes("deposit")) {
    links.push({
      label: "Cash in/out",
      to: `/dashboard/admin/cash-requests`,
    });
  }
  if (operationType.includes("tontine")) {
    links.push({
      label: "Tontines",
      to: `/dashboard/admin/tontines-dashboard`,
    });
    links.push({
      label: "Membres tontines",
      to: `/dashboard/admin/tontines/members`,
    });
  }
  if (selectedWalletId?.startsWith("crypto:")) {
    links.push({
      label: "Audit ledger",
      to: `/dashboard/admin/transactions-audit`,
    });
  }
  if (reference && reference !== "-") {
    links.push({
      label: "Balance events",
      to: `/dashboard/admin/users/${userId}/balance-events`,
    });
  }
  return links;
}

function SummaryCard({ title, value, subvalue, icon: Icon, tone = "slate" }) {
  const toneClass = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass[tone] || toneClass.slate}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <Icon size={18} className="opacity-70" />
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      {subvalue ? <p className="mt-1 text-sm opacity-80">{subvalue}</p> : null}
    </div>
  );
}

export default function AdminClientWalletPage() {
  const [userSearch, setUserSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [summary, setSummary] = useState(null);
  const [cryptoSummary, setCryptoSummary] = useState(null);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [cryptoActionLoading, setCryptoActionLoading] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({ ...DEFAULT_HISTORY_FILTERS });
  const [historyForm, setHistoryForm] = useState({ ...DEFAULT_HISTORY_FILTERS });
  const [historyReload, setHistoryReload] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setUsersLoading(true);
      try {
        const data = await api.getUsers(userSearch.trim());
        if (!active) return;
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        console.error("Erreur chargement utilisateurs admin:", err);
        setUsers([]);
      } finally {
        if (active) {
          setUsersLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [userSearch]);

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    if (!search) return users;
    return users.filter((user) => (user.full_name || "").toLowerCase().includes(search));
  }, [users, userSearch]);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null);
      setSummary(null);
      setCryptoSummary(null);
      setWallets([]);
      setSelectedWalletId("");
      setHistory([]);
      setError("");
      return;
    }

    let active = true;
    const loadSelectedUserWallets = async () => {
      setWalletsLoading(true);
      setError("");
      try {
        const [userData, summaryData, walletsData, cryptoData] = await Promise.all([
          api.getUser(selectedUserId),
          api.getAdminFinancialSummary(selectedUserId),
          api.getAdminWallets({ user_id: selectedUserId, limit: 50 }),
          api.getAdminCryptoWalletSummary(selectedUserId),
        ]);

        if (!active) return;

        const normalizedWallets = Array.isArray(walletsData) ? walletsData : [];
        setSelectedUser(userData || null);
        setSummary(summaryData || null);
        setCryptoSummary(cryptoData || null);
        setWallets(normalizedWallets);
        setSelectedWalletId((current) => {
          if (current && normalizedWallets.some((wallet) => wallet.wallet_id === current)) {
            return current;
          }
          return normalizedWallets[0]?.wallet_id || "";
        });
        setHistory([]);
        setHistoryFilters({ ...DEFAULT_HISTORY_FILTERS });
        setHistoryForm({ ...DEFAULT_HISTORY_FILTERS });
      } catch (err) {
        if (!active) return;
        console.error("Erreur chargement wallets client admin:", err);
        setSelectedUser(null);
        setSummary(null);
        setCryptoSummary(null);
        setWallets([]);
        setSelectedWalletId("");
        setHistory([]);
        setError(err?.message || "Impossible de charger les wallets du client.");
      } finally {
        if (active) {
          setWalletsLoading(false);
        }
      }
    };

    loadSelectedUserWallets();
    return () => {
      active = false;
    };
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedWalletId) {
      setHistory([]);
      return;
    }

    let active = true;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const data = selectedWalletId.startsWith("crypto:")
          ? await api.getAdminCryptoWalletHistory(
              selectedUserId,
              selectedWalletId.replace("crypto:", ""),
              historyFilters
            )
          : await api.getAdminWalletHistory(selectedWalletId, historyFilters);
        if (active) {
          setHistory(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) {
          console.error("Erreur chargement historique wallet admin:", err);
          setHistory([]);
        }
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, [selectedWalletId, selectedUserId, historyFilters, historyReload]);

  const selectedWallet = wallets.find((wallet) => wallet.wallet_id === selectedWalletId) || null;
  const usdcWallet = cryptoSummary?.wallets?.find((wallet) => wallet.token_symbol === "USDC") || null;
  const usdtWallet = cryptoSummary?.wallets?.find((wallet) => wallet.token_symbol === "USDT") || null;

  const handleEnsureCryptoWallet = async (tokenSymbol) => {
    if (!selectedUserId) return;
    setCryptoActionLoading(tokenSymbol);
    setError("");
    try {
      await api.ensureAdminCryptoWallet(selectedUserId, tokenSymbol);
      const refreshed = await api.getAdminCryptoWalletSummary(selectedUserId);
      setCryptoSummary(refreshed || null);
      setSelectedWalletId(`crypto:${tokenSymbol}`);
    } catch (err) {
      setError(err?.message || `Impossible de creer le wallet ${tokenSymbol}.`);
    } finally {
      setCryptoActionLoading("");
    }
  };

  const handleHistorySubmit = (event) => {
    event.preventDefault();
    setHistoryFilters({
      limit: Number(historyForm.limit) || DEFAULT_HISTORY_FILTERS.limit,
      search: historyForm.search.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Administration</p>
            <h1 className="text-2xl font-bold text-slate-900">Wallets clients</h1>
            <p className="mt-1 text-sm text-slate-500">
              Recherchez un client puis consultez ses wallets et leur historique.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[540px]">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Rechercher client</span>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Nom, email, telephone"
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Client</span>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">
                  {usersLoading ? "Chargement..." : "Selectionner un client"}
                </option>
                {filteredUsers.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.full_name || "Sans nom"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!selectedUserId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Selectionnez un client pour afficher sa vue wallet.
        </div>
      ) : null}

      {selectedUserId && (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedUser?.full_name || "Client selectionne"}
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedUser?.email || "Email non renseigne"}
                  {" · "}
                  {selectedUser?.phone_e164 || selectedUser?.phone || "Telephone non renseigne"}
                </p>
              </div>
              {walletsLoading ? (
                <p className="text-sm text-slate-500">Chargement des wallets...</p>
              ) : (
                <p className="text-sm text-slate-500">
                  {wallets.length} wallet{wallets.length > 1 ? "s" : ""} trouve
                  {wallets.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {summary ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                  title="Solde wallet principal"
                  value={`${Number(summary.wallet_available || 0).toLocaleString()} ${summary.wallet_currency || ""}`.trim()}
                  subvalue={`En attente: ${Number(summary.wallet_pending || 0).toLocaleString()} ${summary.wallet_currency || ""}`.trim()}
                  icon={Wallet}
                  tone="blue"
                />
                <SummaryCard
                  title="Wallet USDC"
                  value={usdcWallet?.exists ? `${Number(usdcWallet.balance || 0).toLocaleString()} USDC` : "Non cree"}
                  subvalue={
                    usdcWallet?.exists
                      ? `Compte crypto actif`
                      : "Aucun wallet USDC pour ce client"
                  }
                  icon={Coins}
                  tone="slate"
                />
                <SummaryCard
                  title="Wallet USDT"
                  value={usdtWallet?.exists ? `${Number(usdtWallet.balance || 0).toLocaleString()} USDT` : "Non cree"}
                  subvalue={
                    usdtWallet?.exists
                      ? `Compte crypto actif`
                      : "Aucun wallet USDT pour ce client"
                  }
                  icon={Coins}
                  tone="slate"
                />
                <SummaryCard
                  title="Ligne de credit"
                  value={`${Number(summary.credit_available || 0).toLocaleString()} EUR`}
                  subvalue={`Limite: ${Number(summary.credit_limit || 0).toLocaleString()} EUR · Utilise: ${Number(summary.credit_used || 0).toLocaleString()} EUR`}
                  icon={CreditCard}
                  tone="amber"
                />
                <SummaryCard
                  title="Tontines"
                  value={`${Number(summary.tontines_count || 0)} participation${Number(summary.tontines_count || 0) > 1 ? "s" : ""}`}
                  subvalue={`Bonus: ${Number(summary.bonus_balance || 0).toLocaleString()} ${summary.wallet_currency || ""}`.trim()}
                  icon={Users}
                  tone="emerald"
                />
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to={`/dashboard/admin/users/${selectedUserId}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Profil client
              </Link>
              <Link to={`/dashboard/admin/transfers?user_id=${selectedUserId}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Transferts externes
              </Link>
              <Link to={`/dashboard/admin/cash-requests`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Cash in/out
              </Link>
              <Link to={`/dashboard/admin/tontines-dashboard`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Tontines
              </Link>
              <Link to={`/dashboard/admin/users/${selectedUserId}/balance-events`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Balance events
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {["USDC", "USDT"].map((tokenSymbol) => {
                const cryptoWallet = tokenSymbol === "USDC" ? usdcWallet : usdtWallet;
                const exists = Boolean(cryptoWallet?.exists);
                return (
                  <div key={tokenSymbol} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Wallet {tokenSymbol}</p>
                        <p className="text-xs text-slate-500">
                          {exists ? `Compte ledger: ${cryptoWallet.account_code}` : "Wallet crypto absent"}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-slate-900">
                        {exists ? `${Number(cryptoWallet.balance || 0).toLocaleString()} ${tokenSymbol}` : "Non cree"}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {exists ? (
                        <button
                          type="button"
                          onClick={() => setSelectedWalletId(`crypto:${tokenSymbol}`)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                        >
                          Voir operations {tokenSymbol}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEnsureCryptoWallet(tokenSymbol)}
                          disabled={cryptoActionLoading === tokenSymbol}
                          className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {cryptoActionLoading === tokenSymbol ? "Creation..." : `Creer wallet ${tokenSymbol}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Wallets du client</h3>
                  <p className="text-sm text-slate-500">Choisissez un wallet pour voir son historique.</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {walletsLoading ? (
                  <p className="text-sm text-slate-500">Chargement...</p>
                ) : wallets.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    Aucun wallet trouve pour ce client.
                  </p>
                ) : (
                  wallets.map((wallet) => {
                    const isSelected = wallet.wallet_id === selectedWalletId;
                    return (
                      <button
                        key={wallet.wallet_id}
                        type="button"
                        onClick={() => setSelectedWalletId(wallet.wallet_id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-blue-300 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {(wallet.type || "wallet").toUpperCase()}
                            </p>
                            <p className="text-xs text-slate-500">{wallet.currency || "-"}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {wallet.alert || "ok"}
                          </span>
                        </div>
                        <p className="mt-4 text-xl font-bold text-slate-900">
                          {Number(wallet.available || 0).toLocaleString()} {wallet.currency || ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          En attente: {Number(wallet.pending || 0).toLocaleString()} {wallet.currency || ""}
                        </p>
                        <p className="mt-3 font-mono text-[11px] text-slate-400">
                          {wallet.wallet_id}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              {selectedWallet || selectedWalletId.startsWith("crypto:") ? (
                <>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {selectedWalletId.startsWith("crypto:")
                          ? `Historique wallet crypto ${selectedWalletId.replace("crypto:", "")}`
                          : `Historique wallet ${selectedWallet?.type?.toUpperCase()} ${selectedWallet?.currency}`}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {selectedWalletId.startsWith("crypto:")
                          ? cryptoSummary?.wallets?.find((w) => w.token_symbol === selectedWalletId.replace("crypto:", ""))?.account_code || "-"
                          : selectedWallet?.wallet_id}
                      </p>
                    </div>

                    <form onSubmit={handleHistorySubmit} className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={historyForm.search}
                        onChange={(event) =>
                          setHistoryForm((previous) => ({
                            ...previous,
                            search: event.target.value,
                          }))
                        }
                        placeholder="Recherche reference ou type"
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                      <select
                        value={historyForm.limit}
                        onChange={(event) =>
                          setHistoryForm((previous) => ({
                            ...previous,
                            limit: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      >
                        {[25, 50, 100, 200].map((option) => (
                          <option key={option} value={option}>
                            {option} lignes
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                      >
                        Filtrer
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryReload((count) => count + 1)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
                      >
                        Rafraichir
                      </button>
                    </form>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="p-3 text-left">Date</th>
                          <th className="p-3 text-left">Operation</th>
                          <th className="p-3 text-left">Sens</th>
                          <th className="p-3 text-left">Montant</th>
                          <th className="p-3 text-left">Solde apres</th>
                          <th className="p-3 text-left">Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyLoading ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-slate-500">
                              Chargement...
                            </td>
                          </tr>
                        ) : history.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-slate-500">
                              Aucun mouvement trouve pour ce wallet.
                            </td>
                          </tr>
                        ) : (
                          history.map((entry) => {
                            const amountNum = Number(entry.amount || 0);
                            const isCredit = inferWalletEntryIsCredit(entry);

                            return (
                              <tr key={entry.transaction_id} className="border-t border-slate-100">
                                <td className="p-3 text-slate-600">
                                  {new Date(entry.created_at).toLocaleString()}
                                </td>
                                <td className="p-3">
                                  <p className="font-medium text-slate-900">
                                    {formatWalletOperationLabel(entry.operation_type)}
                                  </p>
                                  <p className="text-xs text-slate-500">{entry.description || "-"}</p>
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                      isCredit
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-rose-100 text-rose-700"
                                    }`}
                                  >
                                    {isCredit ? "Credit" : "Debit"}
                                  </span>
                                </td>
                                <td
                                  className={`p-3 font-semibold ${
                                    isCredit ? "text-emerald-600" : "text-rose-600"
                                  }`}
                                >
                                  {isCredit ? "+" : "-"}
                                  {Math.abs(amountNum).toLocaleString()} {entry.currency_code || selectedWallet?.currency || ""}
                                </td>
                                <td className="p-3 text-slate-700">
                                  {Number(entry.balance_after || 0).toLocaleString()} {entry.currency_code || selectedWallet?.currency || ""}
                                </td>
                                <td className="p-3 text-slate-500">
                                  <div>{entry.reference || "-"}</div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {buildWalletHistoryLinks(entry, selectedUserId, selectedWalletId).map((link) => (
                                      <Link
                                        key={`${entry.transaction_id}-${link.to}-${link.label}`}
                                        to={link.to}
                                        className="inline-flex rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-blue-700"
                                      >
                                        {link.label}
                                      </Link>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Selectionnez un wallet client dans la colonne de gauche.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
