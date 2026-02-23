import { useEffect, useState } from "react";
import api from "@/services/api";

export default function P2PAdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const data = await api.get("/api/admin/p2p/disputes");
      if (Array.isArray(data)) {
        setDisputes(data);
      } else {
        setDisputes([]);
        setError("Format de reponse inattendu pour /api/admin/p2p/disputes");
      }
    } catch (e) {
      setDisputes([]);
      setError(e?.message || "Impossible de charger les disputes");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const fmtDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  };

  const fmtAmount = (value, code, maxFraction = 2) => {
    if (value === null || value === undefined) return "-";
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return `${n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFraction,
    })}${code ? ` ${code}` : ""}`;
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Disputes</h2>
      {error ? <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div> : null}
      {!error && disputes.length === 0 ? (
        <div style={{ color: "#64748b", marginBottom: 12 }}>
          Aucune dispute retournee par l'API.
        </div>
      ) : null}
      {disputes.map((d) => (
        <div
          key={d.dispute_id}
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 10,
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <div>
            <b>Dispute ID:</b> {d.dispute_id}
          </div>
          <div>
            <b>Source:</b> {d.source || "p2p"}
          </div>
          <div>
            <b>Ref:</b> {d.trade_id || d.tx_id}
          </div>
          <div>
            <b>Status dispute:</b> {d.status}
          </div>
          <div>
            <b>Status trade:</b> {d.trade_status || "-"}
          </div>
          <div>
            <b>Date ouverture:</b> {fmtDate(d.created_at)}
          </div>
          <div>
            <b>Derniere maj:</b> {fmtDate(d.updated_at)}
          </div>
          <div>
            <b>Date resolution:</b> {fmtDate(d.resolved_at)}
          </div>
          <div>
            <b>Ouverte par:</b> {d.opened_by_name || d.opened_by_user_id || "-"}
          </div>
          <div>
            <b>Resolue par:</b> {d.resolved_by_name || d.resolved_by_user_id || "-"}
          </div>
          <div>
            <b>Acheteur:</b> {d.buyer_name || d.buyer_user_id || "-"}
          </div>
          <div>
            <b>Vendeur:</b> {d.seller_name || d.seller_user_id || "-"}
          </div>
          <div>
            <b>Token:</b> {d.token || "-"}
          </div>
          <div>
            <b>Montant token:</b> {fmtAmount(d.token_amount, d.token, 8)}
          </div>
          <div>
            <b>Prix:</b> {fmtAmount(d.price_bif_per_usd, "BIF/USD", 6)}
          </div>
          <div>
            <b>Montant BIF:</b> {fmtAmount(d.bif_amount, "BIF", 2)}
          </div>
          <div>
            <b>Montant transaction legacy:</b> {fmtAmount(d.tx_amount, d.tx_currency, 6)}
          </div>
          <div>
            <b>Methode paiement:</b> {d.payment_method || "-"}
          </div>
          <div>
            <b>Raison:</b> {d.reason || "-"}
          </div>
          <div>
            <b>Resolution:</b> {d.resolution || "-"}
          </div>
          <div>
            <b>Evidence URL:</b>{" "}
            {d.evidence_url ? (
              <a href={d.evidence_url} target="_blank" rel="noreferrer">
                {d.evidence_url}
              </a>
            ) : (
              "-"
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
