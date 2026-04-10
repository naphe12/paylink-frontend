import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import api from "@/services/api";

function buildPublicPaymentLink(shareToken) {
  if (!shareToken) return "";
  if (typeof window === "undefined") {
    return `https://app.pesapaid.com/pay/request/${shareToken}`;
  }
  return `${window.location.origin}/pay/request/${shareToken}`;
}

function formatMoney(amount, currencyCode) {
  const numeric = Number(amount || 0);
  return `${numeric.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currencyCode || ""}`.trim();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusBadgeClasses(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "delivered") return "bg-emerald-100 text-emerald-700";
  if (normalized === "failed") return "bg-rose-100 text-rose-700";
  if (normalized === "simulated") return "bg-cyan-100 text-cyan-700";
  return "bg-slate-100 text-slate-700";
}

export default function MerchantApiPage() {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [integration, setIntegration] = useState(null);
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [plainApiKey, setPlainApiKey] = useState("");
  const [plainWebhookSecret, setPlainWebhookSecret] = useState("");
  const [createdPaymentLink, setCreatedPaymentLink] = useState("");
  const [createdScanToPayValue, setCreatedScanToPayValue] = useState("");
  const [keyForm, setKeyForm] = useState({ key_name: "" });
  const [webhookForm, setWebhookForm] = useState({
    target_url: "",
    event_types: "payment.request.paid, wallet.balance.updated",
    max_consecutive_failures: "3",
  });
  const [paymentLinkForm, setPaymentLinkForm] = useState({
    payer_identifier: "",
    amount: "",
    currency_code: "USD",
    title: "",
    note: "",
    merchant_reference: "",
    expires_at: "",
    channel: "business_link",
  });
  const dueRetryCount = (integration?.recent_events || []).filter((event) => {
    if (String(event.delivery_status || "").toLowerCase() !== "failed") return false;
    if (!event.next_retry_at) return false;
    const dueAt = new Date(event.next_retry_at).getTime();
    return Number.isFinite(dueAt) && dueAt <= Date.now();
  }).length;

  const loadBusinesses = async (targetBusinessId = "") => {
    const rows = await api.listBusinessAccounts();
    const items = Array.isArray(rows) ? rows : [];
    setBusinesses(items);
    const nextBusinessId = targetBusinessId || selectedBusinessId || items[0]?.business_id || "";
    setSelectedBusinessId(nextBusinessId);
    return nextBusinessId;
  };

  const loadIntegration = async (businessId) => {
    if (!businessId) {
      setIntegration(null);
      return;
    }
    const data = await api.getBusinessMerchantIntegration(businessId);
    setIntegration(data || null);
  };

  const loadPaymentLinks = async (businessId) => {
    if (!businessId) {
      setPaymentLinks([]);
      return;
    }
    const data = await api.listBusinessPaymentRequests(businessId, { limit: 50 });
    setPaymentLinks(Array.isArray(data) ? data : []);
  };

  const bootstrap = async (targetBusinessId = "") => {
    try {
      setLoading(true);
      setError("");
      const businessId = await loadBusinesses(targetBusinessId);
      await Promise.all([loadIntegration(businessId), loadPaymentLinks(businessId)]);
    } catch (err) {
      setError(err?.message || "Impossible de charger l'integration marchande.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  const handleSelectBusiness = async (businessId) => {
    try {
      setSelectedBusinessId(businessId);
      setLoading(true);
      setError("");
      setSuccess("");
      setPlainApiKey("");
      setPlainWebhookSecret("");
      setCreatedPaymentLink("");
      setCreatedScanToPayValue("");
      await Promise.all([loadIntegration(businessId), loadPaymentLinks(businessId)]);
    } catch (err) {
      setError(err?.message || "Impossible de charger cette structure.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!selectedBusinessId || !keyForm.key_name.trim()) {
      setError("Renseigne un nom de cle API.");
      return;
    }
    try {
      setError("");
      setSuccess("");
      const created = await api.createMerchantApiKey(selectedBusinessId, {
        key_name: keyForm.key_name.trim(),
      });
      setPlainApiKey(created?.plain_api_key || "");
      setKeyForm({ key_name: "" });
      setSuccess("Cle API marchande creee.");
      await loadIntegration(selectedBusinessId);
    } catch (err) {
      setError(err?.message || "Creation de cle impossible.");
    }
  };

  const handleRevokeKey = async (keyId) => {
    try {
      setError("");
      setSuccess("");
      await api.revokeMerchantApiKey(keyId, {});
      setSuccess("Cle API revoquee.");
      await loadIntegration(selectedBusinessId);
    } catch (err) {
      setError(err?.message || "Revocation impossible.");
    }
  };

  const handleCreateWebhook = async () => {
    if (!selectedBusinessId || !webhookForm.target_url.trim()) {
      setError("Renseigne une URL webhook.");
      return;
    }
    try {
      setError("");
      setSuccess("");
      const eventTypes = webhookForm.event_types
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const created = await api.createMerchantWebhook(selectedBusinessId, {
        target_url: webhookForm.target_url.trim(),
        event_types: eventTypes,
        max_consecutive_failures: Number(webhookForm.max_consecutive_failures || 3),
      });
      setPlainWebhookSecret(created?.plain_signing_secret || "");
      setWebhookForm({
        target_url: "",
        event_types: "payment.request.paid, wallet.balance.updated",
        max_consecutive_failures: "3",
      });
      setSuccess("Webhook marchand cree.");
      await loadIntegration(selectedBusinessId);
    } catch (err) {
      setError(err?.message || "Creation webhook impossible.");
    }
  };

  const handleWebhookStatus = async (webhookId, status) => {
    try {
      setError("");
      setSuccess("");
      await api.updateMerchantWebhookStatus(webhookId, { status });
      setSuccess(`Webhook ${status}.`);
      await loadIntegration(selectedBusinessId);
    } catch (err) {
      setError(err?.message || "Mise a jour webhook impossible.");
    }
  };

  const handleRotateWebhookSecret = async (webhookId) => {
    try {
      setError("");
      setSuccess("");
      const rotated = await api.rotateMerchantWebhookSecret(webhookId, {});
      setPlainWebhookSecret(rotated?.plain_signing_secret || "");
      setSuccess("Secret webhook regenere.");
      await loadIntegration(selectedBusinessId);
    } catch (err) {
      setError(err?.message || "Rotation du secret impossible.");
    }
  };

  const handleSendTest = async (webhookId) => {
    try {
      setError("");
      setSuccess("");
      const result = await api.sendMerchantWebhookTest(webhookId, {});
      setSuccess(
        result?.delivery_status === "delivered"
          ? "Test webhook livre avec succes."
          : "Test webhook journalise avec echec de livraison."
      );
      await loadIntegration(selectedBusinessId);
    } catch (err) {
      setError(err?.message || "Test webhook impossible.");
    }
  };

  const handleRetryEvent = async (eventId) => {
    try {
      setError("");
      setSuccess("");
      const result = await api.retryMerchantWebhookEvent(eventId, {});
      setSuccess(
        result?.delivery_status === "delivered"
          ? "Relance webhook livree avec succes."
          : "Relance webhook effectuee, livraison toujours en echec."
      );
      await loadIntegration(selectedBusinessId);
    } catch (err) {
      setError(err?.message || "Relance webhook impossible.");
    }
  };

  const handleRetryDueEvents = async () => {
    if (!selectedBusinessId) return;
    try {
      setError("");
      setSuccess("");
      const retried = await api.retryDueMerchantWebhookEvents(selectedBusinessId, {});
      const count = Array.isArray(retried) ? retried.length : 0;
      setSuccess(
        count > 0
          ? `${count} webhook${count > 1 ? "s" : ""} arrive${count > 1 ? "s" : ""} a echeance ont ete retraites.`
          : "Aucun webhook en echec n'etait arrive a echeance."
      );
      await loadIntegration(selectedBusinessId);
    } catch (err) {
      setError(err?.message || "Relance des webhooks dus impossible.");
    }
  };

  const handleCreatePaymentLink = async () => {
    if (!selectedBusinessId || !paymentLinkForm.amount.trim()) {
      setError("Renseigne au minimum un montant pour le lien.");
      return;
    }
    try {
      setError("");
      setSuccess("");
      const created = await api.createBusinessPaymentRequest(selectedBusinessId, {
        payer_identifier: paymentLinkForm.payer_identifier.trim() || undefined,
        amount: Number(paymentLinkForm.amount),
        currency_code: paymentLinkForm.currency_code.trim().toUpperCase(),
        title: paymentLinkForm.title.trim() || undefined,
        note: paymentLinkForm.note.trim() || undefined,
        merchant_reference: paymentLinkForm.merchant_reference.trim() || undefined,
        expires_at: paymentLinkForm.expires_at ? new Date(paymentLinkForm.expires_at).toISOString() : undefined,
        channel: paymentLinkForm.channel || "business_link",
      });
      const publicPayUrl = created?.public_pay_url || buildPublicPaymentLink(created?.share_token);
      setCreatedPaymentLink(publicPayUrl);
      setCreatedScanToPayValue(created?.scan_to_pay_payload?.pay_url || publicPayUrl);
      setSuccess("Lien de paiement marchand cree.");
      setPaymentLinkForm({
        payer_identifier: "",
        amount: "",
        currency_code: paymentLinkForm.currency_code || "USD",
        title: "",
        note: "",
        merchant_reference: "",
        expires_at: "",
        channel: paymentLinkForm.channel || "business_link",
      });
      await loadPaymentLinks(selectedBusinessId);
    } catch (err) {
      setError(err?.message || "Creation du lien de paiement impossible.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">API marchande</h1>
          <p className="text-sm text-slate-500">
            Gere les cles serveur, les webhooks et maintenant les liens de paiement pour tes comptes business.
          </p>
        </div>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
        {plainApiKey ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Nouvelle cle API: <span className="font-mono">{plainApiKey}</span>
          </p>
        ) : null}
        {plainWebhookSecret ? (
          <p className="rounded-lg bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
            Nouveau secret webhook: <span className="font-mono">{plainWebhookSecret}</span>
          </p>
        ) : null}
        {createdPaymentLink ? (
          <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
            Nouveau lien de paiement: <span className="font-mono break-all">{createdPaymentLink}</span>
          </p>
        ) : null}
        {createdScanToPayValue ? (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-indigo-900">
            <p className="text-xs uppercase tracking-wide text-indigo-700">Scan to Pay</p>
            <div className="mt-2 flex items-center gap-4">
              <div className="rounded-md bg-white p-2">
                <QRCodeSVG value={createdScanToPayValue} size={96} />
              </div>
              <p className="text-xs text-indigo-700">Le client peut scanner ce QR pour ouvrir le paiement.</p>
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.5fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Structures business</h2>
              <p className="text-sm text-slate-500">Selectionne une structure pour configurer l'integration.</p>
            </div>
            <button
              onClick={() => bootstrap(selectedBusinessId)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Rafraichir
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Chargement...</p>
          ) : businesses.length === 0 ? (
            <p className="text-sm text-slate-500">Cree d'abord un compte business pour activer l'API marchande.</p>
          ) : (
            <div className="space-y-3">
              {businesses.map((business) => (
                <button
                  key={business.business_id}
                  onClick={() => handleSelectBusiness(business.business_id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedBusinessId === business.business_id
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{business.display_name}</p>
                  <p className="text-xs text-slate-500">{business.legal_name}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          {!integration ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
              Selectionne un compte business pour continuer.
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{integration.business_label}</h2>
                    <p className="text-sm text-slate-500">Role courant: {integration.membership_role}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <StatCard label="Cles API" value={(integration.api_keys || []).length} />
                    <StatCard label="Webhooks" value={(integration.webhooks || []).length} />
                    <StatCard label="Liens" value={(paymentLinks || []).length} />
                    <StatCard label="Evenements" value={(integration.recent_events || []).length} />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Liens de paiement</h3>
                  <p className="text-sm text-slate-500">
                    Cree un lien marchand partageable avec reference, montant et expiration.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <input
                    aria-label="Payeur cible lien marchand"
                    type="text"
                    placeholder="Payeur cible optionnel"
                    value={paymentLinkForm.payer_identifier}
                    onChange={(e) => setPaymentLinkForm((prev) => ({ ...prev, payer_identifier: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Montant lien marchand"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant"
                    value={paymentLinkForm.amount}
                    onChange={(e) => setPaymentLinkForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Devise lien marchand"
                    type="text"
                    placeholder="Devise"
                    value={paymentLinkForm.currency_code}
                    onChange={(e) => setPaymentLinkForm((prev) => ({ ...prev, currency_code: e.target.value.toUpperCase() }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
                  />
                  <input
                    aria-label="Titre lien marchand"
                    type="text"
                    placeholder="Titre"
                    value={paymentLinkForm.title}
                    onChange={(e) => setPaymentLinkForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Reference lien marchand"
                    type="text"
                    placeholder="Reference marchande"
                    value={paymentLinkForm.merchant_reference}
                    onChange={(e) => setPaymentLinkForm((prev) => ({ ...prev, merchant_reference: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Expiration lien marchand"
                    type="datetime-local"
                    value={paymentLinkForm.expires_at}
                    onChange={(e) => setPaymentLinkForm((prev) => ({ ...prev, expires_at: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <select
                    aria-label="Canal lien marchand"
                    value={paymentLinkForm.channel}
                    onChange={(e) => setPaymentLinkForm((prev) => ({ ...prev, channel: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="business_link">Lien partage</option>
                    <option value="static_qr">QR statique</option>
                    <option value="dynamic_qr">QR dynamique</option>
                  </select>
                  <div className="md:col-span-2">
                    <textarea
                      aria-label="Note lien marchand"
                      rows={3}
                      placeholder="Note optionnelle"
                      value={paymentLinkForm.note}
                      onChange={(e) => setPaymentLinkForm((prev) => ({ ...prev, note: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreatePaymentLink}
                  className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Creer un lien de paiement
                </button>

                <div className="space-y-3">
                  {(paymentLinks || []).map((item) => (
                    <div key={item.request_id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.title || "Lien de paiement"}</p>
                          <p className="text-xs text-slate-500">
                            {formatMoney(item.amount, item.currency_code)} • {item.payer_label || "Payeur ouvert"}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{item.status}</span>
                      </div>
                      <div className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="rounded-md bg-white p-2">
                          <QRCodeSVG
                            value={item.public_pay_url || item.scan_to_pay_payload?.pay_url || buildPublicPaymentLink(item.share_token)}
                            size={88}
                          />
                        </div>
                        <div className="space-y-1 text-xs text-slate-500">
                          <p>
                            Mode scan:{" "}
                            {item.channel === "static_qr"
                              ? "QR statique"
                              : item.channel === "dynamic_qr"
                                ? "QR dynamique"
                                : "Lien partage"}
                          </p>
                          <p>Le QR ouvre le paiement public et permet l'encaissement rapide.</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <p>Reference: {item.metadata?.merchant_reference || "-"}</p>
                        <p>Expire le: {formatDateTime(item.expires_at)}</p>
                        <p className="font-mono break-all">{item.public_pay_url || buildPublicPaymentLink(item.share_token)}</p>
                      </div>
                    </div>
                  ))}
                  {(paymentLinks || []).length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun lien de paiement marchand pour le moment.</p>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Cles API serveur</h3>
                  <p className="text-sm text-slate-500">Une cle est affichee une seule fois a la creation.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-[1.2fr,auto]">
                  <input
                    aria-label="Nom cle API marchande"
                    type="text"
                    placeholder="Nom interne de la cle"
                    value={keyForm.key_name}
                    onChange={(e) => setKeyForm({ key_name: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleCreateKey}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Creer une cle
                  </button>
                </div>
                <div className="space-y-3">
                  {(integration.api_keys || []).map((item) => (
                    <div key={item.key_id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.key_name}</p>
                        <p className="text-xs font-mono text-slate-500">
                          {item.key_prefix}...{item.metadata?.last4 || "****"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs ${item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {item.is_active ? "active" : "revoquee"}
                        </span>
                        {item.is_active ? (
                          <button
                            onClick={() => handleRevokeKey(item.key_id)}
                            className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                          >
                            Revoquer
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {(integration.api_keys || []).length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune cle API pour le moment.</p>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Webhooks marchands</h3>
                  <p className="text-sm text-slate-500">
                    Configure les callbacks de paiement avec une vraie trace de livraison, signatures et retries.
                  </p>
                </div>
                <div className="grid gap-3">
                  <input
                    aria-label="URL webhook marchande"
                    type="url"
                    placeholder="https://merchant.example.com/webhooks/pesapaid"
                    value={webhookForm.target_url}
                    onChange={(e) => setWebhookForm((prev) => ({ ...prev, target_url: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Evenements webhook marchand"
                    type="text"
                    placeholder="payment.request.paid, wallet.balance.updated"
                    value={webhookForm.event_types}
                    onChange={(e) => setWebhookForm((prev) => ({ ...prev, event_types: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Echecs consecutifs webhook marchand"
                    type="number"
                    min="1"
                    max="10"
                    placeholder="Seuil pause auto (defaut 3)"
                    value={webhookForm.max_consecutive_failures}
                    onChange={(e) => setWebhookForm((prev) => ({ ...prev, max_consecutive_failures: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleCreateWebhook}
                    className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Creer un webhook
                  </button>
                </div>
                <div className="space-y-3">
                  {(integration.webhooks || []).map((item) => (
                    <div key={item.webhook_id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.target_url}</p>
                          <p className="text-xs text-slate-500">{(item.event_types || []).join(", ")}</p>
                          <p className="text-xs text-slate-500">
                            Echecs consecutifs: {Number(item.consecutive_failures || 0)} / {Number(item.max_consecutive_failures || 3)}
                          </p>
                          {item.auto_paused_for_failures ? (
                            <p className="text-xs text-amber-700">Pause auto activee suite aux echecs repetes.</p>
                          ) : null}
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{item.status}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleSendTest(item.webhook_id)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Tester
                        </button>
                        {item.status !== "revoked" ? (
                          <button
                            onClick={() => handleRotateWebhookSecret(item.webhook_id)}
                            className="rounded-lg border border-indigo-300 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                          >
                            Regenerer secret
                          </button>
                        ) : null}
                        {item.status !== "active" ? (
                          <button
                            onClick={() => handleWebhookStatus(item.webhook_id, "active")}
                            className="rounded-lg border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                          >
                            Activer
                          </button>
                        ) : null}
                        {item.status === "active" ? (
                          <button
                            onClick={() => handleWebhookStatus(item.webhook_id, "paused")}
                            className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                          >
                            Mettre en pause
                          </button>
                        ) : null}
                        {item.status !== "revoked" ? (
                          <button
                            onClick={() => handleWebhookStatus(item.webhook_id, "revoked")}
                            className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                          >
                            Revoquer
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {(integration.webhooks || []).length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun webhook marchand configure.</p>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Journal de livraison</h3>
                  <p className="text-sm text-slate-500">
                    Statut, signature, tentative et prochaine relance pour les derniers evenements emis.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    A echeance: {dueRetryCount}
                  </span>
                  <button
                    onClick={handleRetryDueEvents}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Relancer les echecs dus
                  </button>
                </div>
                <div className="space-y-3">
                  {(integration.recent_events || []).map((event) => (
                    <div key={event.event_id} className="rounded-xl border border-slate-200 px-4 py-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900">{event.event_type}</p>
                        <span className={`rounded-full px-3 py-1 text-xs ${statusBadgeClasses(event.delivery_status)}`}>
                          {event.delivery_status}
                        </span>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4 text-xs text-slate-500">
                        <p>Tentatives: {event.attempt_count ?? 0}</p>
                        <p>HTTP: {event.response_status_code ?? "-"}</p>
                        <p>Derniere tentative: {formatDateTime(event.last_attempted_at || event.created_at)}</p>
                        <p>Prochain retry: {formatDateTime(event.next_retry_at)}</p>
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <p className="font-mono break-all">Signature: {event.request_signature || "-"}</p>
                        <p className="break-all">Reponse: {event.response_body || "-"}</p>
                      </div>
                      {event.delivery_status === "failed" ? (
                        <button
                          onClick={() => handleRetryEvent(event.event_id)}
                          className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                        >
                          Relancer
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {(integration.recent_events || []).length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun evenement webhook recent.</p>
                  ) : null}
                </div>
              </section>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
