import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";

const formatPaymentMethod = (m) => (m === "ECOCASH" ? "eNOTI" : m);

export default function TradeRoom() {
  const { id } = useParams();
  const [trade, setTrade] = useState(null);
  const [history, setHistory] = useState([]);
  const [proofUrl, setProofUrl] = useState("");
  const [sandboxTxHash, setSandboxTxHash] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const [t, h] = await Promise.all([
      api.get(`/api/p2p/trades/${id}`),
      api.get(`/api/p2p/trades/${id}/timeline`),
    ]);
    setTrade(t);
    setHistory(Array.isArray(h) ? h : []);
  }, [id]);

  useEffect(() => {
    load().catch((err) => setError(err.message || "Erreur chargement trade"));
  }, [load]);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const current = await api.get("/auth/me");
        setMe(current || null);
        setIsAdmin(String(current?.role || "").toLowerCase() === "admin");
      } catch {
        setMe(null);
        setIsAdmin(false);
      }
    };
    loadMe();
  }, []);

  const myUserId = String(me?.user_id || "");
  const isBuyer = myUserId && String(trade?.buyer_id || "") === myUserId;
  const isSeller = myUserId && String(trade?.seller_id || "") === myUserId;
  const status = String(trade?.status || "");
  const canMarkPaid = isBuyer && (status === "AWAITING_FIAT" || status === "CRYPTO_LOCKED");
  const canConfirmFiat = isSeller && status === "FIAT_SENT";

  const markPaid = async () => {
    if (!canMarkPaid) {
      setError("Action non autorisee: seul l'acheteur peut marquer le fiat envoye (status requis: AWAITING_FIAT/CRYPTO_LOCKED).");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post(`/api/p2p/trades/${id}/fiat-sent`, { proof_url: proofUrl, note: "" });
      await load();
    } catch (err) {
      setError(err.message || "Erreur envoi preuve paiement");
    } finally {
      setLoading(false);
    }
  };

  const confirmFiat = async () => {
    if (!canConfirmFiat) {
      setError("Action non autorisee: seul le vendeur peut confirmer le fiat recu (status requis: FIAT_SENT).");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post(`/api/p2p/trades/${id}/fiat-confirm`, {});
      await load();
    } catch (err) {
      setError(err.message || "Erreur confirmation fiat");
    } finally {
      setLoading(false);
    }
  };

  const openDispute = async () => {
    const reason = window.prompt("Raison du litige ?");
    if (!reason) return;
    setLoading(true);
    setError("");
    try {
      await api.post(`/api/p2p/trades/${id}/dispute`, { reason });
      await load();
    } catch (err) {
      setError(err.message || "Erreur ouverture litige");
    } finally {
      setLoading(false);
    }
  };

  const forceCryptoLocked = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post(`/api/p2p/trades/${id}/sandbox/crypto-locked`, {
        escrow_tx_hash: sandboxTxHash || null,
      });
      await load();
    } catch (err) {
      setError(err.message || "Erreur sandbox CRYPTO_LOCKED");
    } finally {
      setLoading(false);
    }
  };

  if (!trade) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        {error ? <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div> : "Chargement..."}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-semibold text-slate-900">Trade {trade.trade_id}</h2>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}

      <div className="p-4 border border-slate-200 bg-white rounded-xl">
        <div>
          <b>Status:</b> {trade.status}
        </div>
        <div>
          <b>Mon role:</b>{" "}
          {isBuyer ? "Acheteur" : isSeller ? "Vendeur" : "Observateur"}
        </div>
        <div>
          <b>Token:</b> {trade.token} - <b>Montant:</b> {trade.token_amount}
        </div>
        <div>
          <b>BIF:</b> {trade.bif_amount} (prix: {trade.price_bif_per_usd})
        </div>
        <div>
          <b>Paiement BIF:</b> {formatPaymentMethod(trade.payment_method)}
        </div>

        <div className="mt-3">
          <b>Adresse depot crypto:</b>
          <div className="font-mono break-all">{trade.escrow_deposit_addr || "En attente d'allocation..."}</div>
          {trade.escrow_tx_hash && (
            <div>
              <b>Tx:</b> <span className="font-mono break-all">{trade.escrow_tx_hash}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          value={proofUrl}
          onChange={(e) => setProofUrl(e.target.value)}
          placeholder="URL preuve paiement (recu photo uploade)"
          className="flex-1 min-w-[280px] px-3 py-2 border border-slate-300 rounded-lg"
        />
        <button
          disabled={loading || !proofUrl || !canMarkPaid}
          onClick={markPaid}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
          title="Acheteur uniquement, status AWAITING_FIAT ou CRYPTO_LOCKED"
        >
          J'ai paye (BIF)
        </button>
        <button
          disabled={loading || !canConfirmFiat}
          onClick={confirmFiat}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-60"
          title="Vendeur uniquement, status FIAT_SENT"
        >
          Confirmer reception (Seller)
        </button>
        <button disabled={loading} onClick={openDispute} className="px-4 py-2 rounded-lg bg-amber-600 text-white disabled:opacity-60">
          Ouvrir litige
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Regle: confirmation fiat possible uniquement pour le vendeur quand le trade est en FIAT_SENT.
      </p>

      {isAdmin && (
        <div className="p-4 border border-indigo-200 bg-indigo-50 rounded-xl space-y-3">
          <div className="text-sm font-semibold text-indigo-900">Sandbox Admin</div>
          <div className="flex gap-3 flex-wrap">
            <input
              value={sandboxTxHash}
              onChange={(e) => setSandboxTxHash(e.target.value)}
              placeholder="Tx hash optionnel (sinon auto)"
              className="flex-1 min-w-[280px] px-3 py-2 border border-indigo-300 rounded-lg"
            />
            <button
              disabled={loading}
              onClick={forceCryptoLocked}
              className="px-4 py-2 rounded-lg bg-indigo-700 text-white disabled:opacity-60"
            >
              Forcer CRYPTO_LOCKED
            </button>
          </div>
        </div>
      )}

      <h3 className="text-lg font-semibold text-slate-900">Timeline</h3>
      <div className="border border-slate-200 bg-white rounded-xl p-4">
        {history.length === 0 && <div className="text-slate-500">Aucun evenement.</div>}
        {history.map((e, idx) => (
          <div key={e.id || `${e.created_at}-${idx}`} className="py-3 border-b border-slate-100 last:border-b-0">
            <div>
              <b>{e.to_status}</b> - {e.created_at ? new Date(e.created_at).toLocaleString() : ""}
            </div>
            <div className="text-slate-600">{e.note || ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
