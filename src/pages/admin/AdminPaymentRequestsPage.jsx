import { useEffect, useMemo, useState } from "react";
import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";
import { BellRing, CheckCircle2, Clock3, RefreshCcw, Send, XCircle } from "lucide-react";
import useSessionStorageState from "@/hooks/useSessionStorageState";
import { buildUserOptionLabel } from "@/utils/userRecentActivity";

const PRODUCT_STATUS_LABELS = {
  pending: "En attente",
  paid: "Payee",
  declined: "Refusee",
  cancelled: "Annulee",
  expired: "Expiree",
  draft: "Brouillon",
};

const PRODUCT_STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  declined: "bg-rose-100 text-rose-800 border-rose-200",
  cancelled: "bg-slate-100 text-slate-700 border-slate-200",
  expired: "bg-orange-100 text-orange-800 border-orange-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
};

const PRODUCT_EVENT_LABELS = {
  created: "Creation",
  sent: "Envoi",
  viewed: "Consultation",
  reminder_sent: "Relance",
  paid: "Paiement",
  declined: "Refus",
  cancelled: "Annulation",
  expired: "Expiration",
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function formatAmount(value, currency) {
  return `${Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || ""}`.trim();
}

export default function AdminPaymentRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productRequests, setProductRequests] = useState([]);
  const [productStatus, setProductStatus] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState("");
  const [selectedProductRequestId, setSelectedProductRequestId] = useState("");
  const [selectedProductRequest, setSelectedProductRequest] = useState(null);
  const [productDetailLoading, setProductDetailLoading] = useState(false);
  const [productDetailError, setProductDetailError] = useState("");

  const [selectedUserId, setSelectedUserId] = useSessionStorageState("admin-payment-requests:selected-user-id", "");
  const [clientFilter, setClientFilter] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("credit");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [debtors, setDebtors] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (status) params.status = status;
      const data = await api.getAdminPaymentRequests(params);
      setRequests(data);
    } catch (err) {
      setError("Impossible de charger les demandes.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductRequests = async (preserveSelection = true) => {
    setProductLoading(true);
    setProductError("");
    try {
      const params = {};
      if (productStatus) params.status = productStatus;
      if (productQuery.trim()) params.q = productQuery.trim();
      const data = await api.getAdminPaymentRequestsV2(params);
      const items = Array.isArray(data) ? data : [];
      setProductRequests(items);
      if (!preserveSelection || !items.some((item) => item.request_id === selectedProductRequestId)) {
        setSelectedProductRequestId(items[0]?.request_id || "");
      }
    } catch (err) {
      setProductRequests([]);
      setProductError(err?.message || "Impossible de charger les demandes produit.");
    } finally {
      setProductLoading(false);
    }
  };

  const fetchDebtors = async () => {
    try {
      const data = await api.getAdminDebtors(200);
      setDebtors(data);
    } catch (err) {
      // silencieux
    }
  };

  useEffect(() => {
    fetchData();
    fetchDebtors();
    fetchProductRequests(false);
  }, [status]);

  useEffect(() => {
    fetchProductRequests(false);
  }, [productStatus]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedProductRequestId) {
        setSelectedProductRequest(null);
        setProductDetailError("");
        return;
      }
      setProductDetailLoading(true);
      setProductDetailError("");
      try {
        const detail = await api.getAdminPaymentRequestDetailV2(selectedProductRequestId);
        setSelectedProductRequest(detail);
      } catch (err) {
        setSelectedProductRequest(null);
        setProductDetailError(err?.message || "Impossible de charger le detail produit.");
      } finally {
        setProductDetailLoading(false);
      }
    };
    loadDetail();
  }, [selectedProductRequestId]);

  const filteredDebtors = debtors.filter((debtor) => {
    const haystack = [
      debtor.full_name,
      debtor.email,
      debtor.paytag,
      debtor.username,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(clientFilter.trim().toLowerCase());
  });

  const selectedProduct =
    selectedProductRequest?.request ||
    productRequests.find((item) => item.request_id === selectedProductRequestId) ||
    null;

  const productStats = useMemo(
    () => ({
      pending: productRequests.filter((item) => item.status === "pending").length,
      overdue: productRequests.filter((item) => item.status === "expired").length,
      paid: productRequests.filter((item) => item.status === "paid").length,
    }),
    [productRequests]
  );

  const createRequest = async () => {
    if (!selectedUserId || !amount) {
      setCreateMsg("Renseignez le client et le montant.");
      return;
    }
    setCreating(true);
    setCreateMsg("");
    try {
      await api.createAdminPaymentRequest({
        user_identifier: selectedUserId,
        amount: Number(amount),
        reason,
      });
      setCreateMsg("Demande envoyee.");
      setAmount("");
      fetchData();
    } catch (err) {
      setCreateMsg("Erreur: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Paiements clients (dettes credit / ligne)</p>
          <h1 className="text-2xl font-bold text-slate-900">Demandes de paiement (admin)</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="succeeded">Validees</option>
            <option value="cancelled">Refusees</option>
          </select>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <RefreshCcw size={16} /> Actualiser
          </button>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Produit en attente</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{productStats.pending}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Expirees</p>
              <p className="mt-2 text-2xl font-bold text-orange-700">{productStats.overdue}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Payees</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{productStats.paid}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">Demandes produit V2</h3>
                <p className="text-sm text-slate-500">Suivi des demandes creees par les utilisateurs.</p>
              </div>
              <button
                onClick={() => fetchProductRequests(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                <RefreshCcw size={16} /> Actualiser
              </button>
            </div>

            <ApiErrorAlert
              message={productError}
              onRetry={() => fetchProductRequests(false)}
              retryLabel="Recharger les demandes produit"
            />

            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <input
                type="text"
                placeholder="Rechercher titre, note ou token"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={productStatus}
                onChange={(e) => setProductStatus(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="paid">Payees</option>
                <option value="declined">Refusees</option>
                <option value="cancelled">Annulees</option>
                <option value="expired">Expirees</option>
              </select>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => fetchProductRequests(false)}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Filtrer
              </button>
            </div>

            {productLoading ? (
              <p className="text-sm text-slate-500">Chargement des demandes produit...</p>
            ) : productRequests.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune demande produit.</p>
            ) : (
              <div className="space-y-3">
                {productRequests.map((item) => (
                  <button
                    key={item.request_id}
                    type="button"
                    onClick={() => setSelectedProductRequestId(item.request_id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedProductRequestId === item.request_id
                        ? "border-[#0b3b64] bg-sky-50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{item.title || "Demande de paiement"}</p>
                        <p className="text-xs text-slate-500">
                          {item.requester_label || "Demandeur inconnu"} → {item.payer_label || "Payeur ouvert"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-medium ${
                          PRODUCT_STATUS_STYLES[item.status] || PRODUCT_STATUS_STYLES.draft
                        }`}
                      >
                        {PRODUCT_STATUS_LABELS[item.status] || item.status}
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <p className="text-lg font-bold text-[#0b3b64]">
                        {formatAmount(item.amount, item.currency_code)}
                      </p>
                      <p className="text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Detail demande produit</h3>
              <p className="text-sm text-slate-500">Vue backoffice du cycle de vie, avec timeline.</p>
            </div>
            {selectedProduct?.share_token && (
              <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {selectedProduct.share_token}
              </code>
            )}
          </div>

          <ApiErrorAlert
            message={productDetailError}
            onRetry={() =>
              selectedProductRequestId &&
              api.getAdminPaymentRequestDetailV2(selectedProductRequestId).then(setSelectedProductRequest)
            }
            retryLabel="Recharger le detail produit"
          />

          {!selectedProduct ? (
            <p className="text-sm text-slate-500">Selectionnez une demande produit.</p>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{selectedProduct.title || "Demande de paiement"}</p>
                    <p className="text-xs text-slate-500">
                      {selectedProduct.requester_label || "Demandeur inconnu"} → {selectedProduct.payer_label || "Payeur ouvert"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-medium ${
                      PRODUCT_STATUS_STYLES[selectedProduct.status] || PRODUCT_STATUS_STYLES.draft
                    }`}
                  >
                    {PRODUCT_STATUS_LABELS[selectedProduct.status] || selectedProduct.status}
                  </span>
                </div>
                <p className="text-2xl font-bold text-[#0b3b64]">
                  {formatAmount(selectedProduct.amount, selectedProduct.currency_code)}
                </p>
                {selectedProduct.note && (
                  <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    {selectedProduct.note}
                  </p>
                )}
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <Clock3 size={14} /> Creee le
                    </p>
                    <p className="text-sm text-slate-800">{formatDateTime(selectedProduct.created_at)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <BellRing size={14} /> Derniere relance
                    </p>
                    <p className="text-sm text-slate-800">{formatDateTime(selectedProduct.last_reminder_at)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <CheckCircle2 size={14} /> Echeance
                    </p>
                    <p className="text-sm text-slate-800">{formatDateTime(selectedProduct.due_at)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <XCircle size={14} /> Expiration
                    </p>
                    <p className="text-sm text-slate-800">{formatDateTime(selectedProduct.expires_at)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Timeline</h4>
                {productDetailLoading ? (
                  <p className="text-sm text-slate-500">Chargement du detail...</p>
                ) : (selectedProductRequest?.events || []).length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun evenement pour cette demande.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedProductRequest.events.map((event) => (
                      <div key={event.event_id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {PRODUCT_EVENT_LABELS[event.event_type] || event.event_type}
                          </p>
                          <p className="text-xs text-slate-500">{formatDateTime(event.created_at)}</p>
                        </div>
                        {(event.before_status || event.after_status) && (
                          <p className="mt-1 text-xs text-slate-500">
                            {event.before_status || "-"} → {event.after_status || "-"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Send size={16} /> Envoyer une demande
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-2 md:col-span-2">
            <input
              type="text"
              placeholder="Filtrer les clients"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Selectionner un client</option>
              {filteredDebtors.map((debtor) => (
                <option key={debtor.user_id} value={debtor.user_id}>
                  {buildUserOptionLabel(
                    debtor,
                    debtor.email || debtor.paytag || debtor.username || debtor.user_id
                  )}
                  {" · "}
                  {debtor.email || debtor.paytag || debtor.username || debtor.user_id}
                </option>
              ))}
            </select>
          </div>
          <input
            type="number"
            placeholder="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="credit">Credit</option>
            <option value="credit_line">Ligne de credit</option>
            <option value="other">Autre</option>
          </select>
          <button
            onClick={createRequest}
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-lg px-3 py-2 hover:bg-indigo-700 disabled:opacity-70"
          >
            {creating ? "Envoi..." : "Envoyer"}
          </button>
        </div>
        {createMsg && <p className="text-sm text-slate-600">{createMsg}</p>}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Clients en dette (credit ou solde negatif)</h3>
          <button
            onClick={fetchDebtors}
            className="text-sm text-slate-600 hover:text-slate-800 inline-flex items-center gap-1"
          >
            <RefreshCcw size={14} /> Rafraichir
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Client</th>
                <th className="px-3 py-2 text-left font-semibold">Credit utilise</th>
                <th className="px-3 py-2 text-left font-semibold">Solde wallet</th>
                <th className="px-3 py-2 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {debtors.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-3 py-4 text-center text-slate-500">
                    Aucun client en dette.
                  </td>
                </tr>
              ) : (
                debtors.map((d) => (
                  <tr key={d.user_id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-semibold">{d.full_name || d.email || d.paytag || d.username}</div>
                      <div className="text-xs text-slate-500">{d.email || d.paytag || d.username}</div>
                    </td>
                    <td className="px-3 py-2">
                      {Number(d.credit_used).toLocaleString()} / {Number(d.credit_limit).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      {Number(d.wallet_available).toLocaleString()} {d.wallet_currency || ""}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => {
                          setSelectedUserId(d.user_id);
                          setClientFilter(d.full_name || d.email || d.paytag || d.username || "");
                        }}
                        className="text-indigo-600 hover:underline text-sm"
                      >
                        Pre-remplir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading ? (
        <div className="text-slate-600">Chargement...</div>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Demandeur</th>
                <th className="px-4 py-3 text-left font-semibold">Destinataire</th>
                <th className="px-4 py-3 text-left font-semibold">Montant</th>
                <th className="px-4 py-3 text-left font-semibold">Statut</th>
                <th className="px-4 py-3 text-left font-semibold">Creee le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-slate-500">
                    Aucune demande.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.request_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.requester || "N/A"}</div>
                      <div className="text-xs text-slate-500">{r.requester_email || r.requester_paytag || r.requester_username}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.recipient || "N/A"}</div>
                      <div className="text-xs text-slate-500">{r.recipient_email || r.recipient_paytag || r.recipient_username}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {Number(r.amount).toLocaleString()} {r.currency_code || ""}
                    </td>
                    <td className="px-4 py-3 capitalize">{r.status}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
