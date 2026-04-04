import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "@/services/api";

export default function AdminTransferNotePage({ standalone = false }) {
  const { transferId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState(null);
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.getAdminTransferPaymentNoteContext(transferId);
        if (!cancelled) {
          setNote(data || null) ;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Chargement de la note impossible.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [transferId]);

  const printedAt = useMemo(() => new Date().toLocaleString("fr-FR"), []);
  const payload = note?.note_payload || {};
  const filenameBase = `note-paiement-${note?.reference_code || transferId}`;

  const handleDownloadImage = async (format) => {
    setExporting(format);
    try {
      const blob = await buildNoteImageBlob({ note, payload, printedAt, format });
      downloadBlob(`${filenameBase}.${format === "jpeg" ? "jpg" : "png"}`, blob);
    } catch (err) {
      window.alert(err?.message || "Export impossible.");
    } finally {
      setExporting("");
    }
  };

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">Chargement de la note...</div>;
  }

  if (error) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-800 shadow-sm">
        <p className="text-lg font-semibold">Note indisponible</p>
        <p className="text-sm">{error}</p>
        <Link to="/dashboard/admin/transfers" className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
          Retour aux transferts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        @media print {
          .note-toolbar { display: none !important; }
          .note-shell { padding: 0 !important; }
          .note-paper {
            width: 194mm !important;
            max-width: 194mm !important;
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
          }
          .note-header { padding: 7mm 8mm 5mm !important; }
          .note-brand { font-size: 13px !important; letter-spacing: 0.26em !important; }
          .note-title { margin-top: 3mm !important; font-size: 25px !important; }
          .note-meta { margin-top: 4mm !important; padding-top: 3mm !important; font-size: 11px !important; }
          .note-content {
            gap: 4mm !important;
            padding: 5mm 8mm !important;
            grid-template-columns: 1.25fr 0.9fr !important;
          }
          .note-card { padding: 4mm !important; border-radius: 6mm !important; }
          .note-card-title { font-size: 9px !important; }
          .note-field { margin-top: 0 !important; }
          .note-field-label { font-size: 8px !important; }
          .note-field-value { margin-top: 1mm !important; font-size: 15px !important; line-height: 1.3 !important; }
          .note-highlight { padding: 4mm !important; border-radius: 6mm !important; }
          .note-amount-label { font-size: 9px !important; }
          .note-amount-value { margin-top: 2mm !important; font-size: 32px !important; }
          .note-recipient-box { margin-top: 3mm !important; padding: 3mm !important; }
          .note-recipient-label { font-size: 8px !important; }
          .note-recipient-value { margin-top: 1mm !important; font-size: 21px !important; }
          .note-sentence { margin-top: 3mm !important; font-size: 14px !important; line-height: 1.4 !important; }
          .note-footer { padding: 4mm 8mm !important; font-size: 11px !important; line-height: 1.45 !important; }
          body { background: white !important; }
        }
      `}</style>

      {!standalone ? (
        <div className="note-toolbar flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Note de paiement</h1>
            <p className="text-sm text-slate-500">
              Reference {note?.reference_code || transferId} {note?.payment_note_required ? "· note requise ou recente" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              PDF
            </button>
            <button
              type="button"
              onClick={() => handleDownloadImage("png")}
              disabled={exporting === "png"}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
            >
              {exporting === "png" ? "Export PNG..." : "PNG"}
            </button>
            <button
              type="button"
              onClick={() => handleDownloadImage("jpeg")}
              disabled={exporting === "jpeg"}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
            >
              {exporting === "jpeg" ? "Export JPEG..." : "JPEG"}
            </button>
            <Link
              to="/dashboard/admin/transfers"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Retour
            </Link>
          </div>
        </div>
      ) : (
        <div className="note-toolbar flex justify-end gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            PDF
          </button>
          <button
            type="button"
            onClick={() => handleDownloadImage("png")}
            disabled={exporting === "png"}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
          >
            {exporting === "png" ? "Export PNG..." : "PNG"}
          </button>
          <button
            type="button"
            onClick={() => handleDownloadImage("jpeg")}
            disabled={exporting === "jpeg"}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
          >
            {exporting === "jpeg" ? "Export JPEG..." : "JPEG"}
          </button>
        </div>
      )}

      <div className="note-shell flex justify-center px-2">
        <article
          id="payment-note-paper"
          className="note-paper w-full max-w-[1100px] overflow-hidden rounded-[32px] border border-stone-200 bg-[#fbf8f1] shadow-[0_22px_80px_rgba(15,23,42,0.12)]"
        >
          <header className="note-header bg-[linear-gradient(135deg,#0b3b64,#124f82)] px-10 py-9 text-white">
            <p className="note-brand text-center text-[18px] font-semibold tracking-[0.35em] uppercase text-white/75">PesaPaid</p>
            <h2 className="note-title mt-4 text-center font-serif text-[44px] font-semibold">Note de paiement</h2>
            <div className="note-meta mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4 text-sm text-white/90">
              <span>Reference: {note?.reference_code || "-"}</span>
              <span>Date impression: {printedAt}</span>
            </div>
          </header>

          <section className="note-content grid gap-6 px-10 py-8 md:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-6">
              <InfoCard title="Client">
                <Field label="Nom client" value={payload.client_name} />
                <Field label="Beneficiaire" value={payload.recipient_name} />
                <Field label="Pays destination" value={payload.country_destination} />
                <Field label="Statut" value={note?.status} />
              </InfoCard>

              <div className="note-highlight rounded-[28px] border border-amber-200 bg-[linear-gradient(180deg,#fff6dd,#fffaf0)] px-7 py-7">
                <p className="note-amount-label text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Montant a payer</p>
                <p className="note-amount-value mt-4 font-serif text-5xl font-semibold text-slate-950">{payload.amount_text || "-"}</p>
                <div className="note-recipient-box mt-5 rounded-2xl bg-white/80 px-5 py-4">
                  <p className="note-recipient-label text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Montant recu par le beneficiaire</p>
                  <p className="note-recipient-value mt-2 text-3xl font-semibold text-slate-950">{payload.recipient_amount_text || "-"}</p>
                </div>
                <p className="note-sentence mt-4 text-lg font-semibold leading-7 text-slate-950">
                  {note?.payment_sentence || "Veuillez effectuer le paiement sur le compte indique ci-dessous."}
                </p>
              </div>
            </div>

            <InfoCard title="Informations de paiement" tone="dark">
              <Field label="Service" value={payload.service} dark />
              <Field label="Compte" value={payload.account_service} dark />
              <Field label="Pays du compte" value={payload.account_country_code} dark />
              <Field label="Devise" value={payload.payment_currency} dark />
            </InfoCard>
          </section>

          <footer className="note-footer border-t border-stone-200 bg-white/70 px-10 py-5 text-sm font-medium leading-6 text-slate-700">
            Veuillez effectuer le paiement exactement sur le compte indique. Conservez cette note comme justificatif.
          </footer>
        </article>
      </div>
    </div>
  );
}

function InfoCard({ title, children, tone = "light" }) {
  const isDark = tone === "dark";
  return (
    <section
      className={
        isDark
          ? "note-card rounded-[28px] bg-slate-950 px-7 py-7 text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
          : "note-card rounded-[28px] border border-stone-200 bg-white px-7 py-7"
      }
    >
      <p className={`note-card-title text-xs font-semibold uppercase tracking-[0.28em] ${isDark ? "text-slate-300" : "text-slate-500"}`}>
        {title}
      </p>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, value, dark = false }) {
  return (
    <div className="note-field">
      <p className={`note-field-label text-xs font-semibold uppercase tracking-[0.2em] ${dark ? "text-slate-400" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`note-field-value mt-1 text-xl font-semibold leading-8 ${dark ? "text-white" : "text-slate-950"}`}>{value || "-"}</p>
    </div>
  );
}

function downloadBlob(filename, blob) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

async function buildNoteImageBlob({ note, payload, printedAt, format = "png" }) {
  const svg = createPaymentNoteSvg({ note, payload, printedAt });
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 980;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas indisponible pour l'export image.");
  }
  context.fillStyle = "#fbf8f1";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (value) resolve(value);
        else reject(new Error(`Generation ${format.toUpperCase()} impossible.`));
      },
      format === "jpeg" ? "image/jpeg" : "image/png",
      0.96
    );
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Chargement image impossible."));
    image.src = src;
  });
}

function createPaymentNoteSvg({ note, payload, printedAt }) {
  const paymentSentence =
    note?.payment_sentence || "Veuillez effectuer le paiement sur le compte indique ci-dessous.";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="980" viewBox="0 0 1400 980">
      <defs>
        <linearGradient id="pp-header" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b3b64" />
          <stop offset="100%" stop-color="#124f82" />
        </linearGradient>
        <linearGradient id="pp-highlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fff6dd" />
          <stop offset="100%" stop-color="#fffaf0" />
        </linearGradient>
      </defs>

      <rect width="1400" height="980" rx="36" fill="#fbf8f1" />
      <rect x="1" y="1" width="1398" height="978" rx="35" fill="none" stroke="#e7e5e4" stroke-width="2" />

      <rect x="0" y="0" width="1400" height="230" rx="36" fill="url(#pp-header)" />
      <text x="700" y="54" text-anchor="middle" font-size="22" font-weight="700" letter-spacing="7" fill="rgba(255,255,255,0.78)">PesaPaid</text>
      <text x="700" y="116" text-anchor="middle" font-size="58" font-weight="600" font-family="Georgia, 'Times New Roman', serif" fill="#ffffff">Note de paiement</text>
      <line x1="90" y1="164" x2="1310" y2="164" stroke="rgba(255,255,255,0.24)" stroke-width="2" />
      <text x="90" y="201" font-size="22" fill="rgba(255,255,255,0.92)">Reference: ${escapeXml(note?.reference_code || "-")}</text>
      <text x="1310" y="201" text-anchor="end" font-size="22" fill="rgba(255,255,255,0.92)">Date impression: ${escapeXml(printedAt)}</text>

      <rect x="78" y="278" width="760" height="256" rx="30" fill="#ffffff" stroke="#e7e5e4" stroke-width="2" />
      <text x="120" y="324" font-size="18" font-weight="700" letter-spacing="5" fill="#64748b">CLIENT</text>
      ${svgField(120, 376, "Nom client", payload.client_name)}
      ${svgField(120, 446, "Beneficiaire", payload.recipient_name)}
      ${svgField(120, 516, "Pays destination", payload.country_destination)}
      ${svgField(430, 516, "Statut", note?.status)}

      <rect x="78" y="562" width="760" height="276" rx="30" fill="url(#pp-highlight)" stroke="#fcd34d" stroke-width="2" />
      <text x="120" y="608" font-size="18" font-weight="700" letter-spacing="5" fill="#b45309">MONTANT A PAYER</text>
      <text x="120" y="690" font-size="62" font-weight="600" font-family="Georgia, 'Times New Roman', serif" fill="#020617">${escapeXml(payload.amount_text || "-")}</text>

      <rect x="120" y="724" width="676" height="84" rx="22" fill="rgba(255,255,255,0.88)" />
      <text x="152" y="755" font-size="15" font-weight="700" letter-spacing="3" fill="#64748b">MONTANT RECU PAR LE BENEFICIAIRE</text>
      <text x="152" y="792" font-size="32" font-weight="700" fill="#020617">${escapeXml(payload.recipient_amount_text || "-")}</text>

      <foreignObject x="120" y="820" width="676" height="90">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, Helvetica, sans-serif; font-size: 18px; line-height: 1.45; font-weight: 700; color: #020617;">
          ${escapeHtml(paymentSentence)}
        </div>
      </foreignObject>

      <rect x="874" y="278" width="448" height="560" rx="30" fill="#020617" />
      <text x="916" y="324" font-size="18" font-weight="700" letter-spacing="5" fill="#cbd5e1">INFORMATIONS DE PAIEMENT</text>
      ${svgField(916, 386, "Service", payload.service, true)}
      ${svgField(916, 484, "Compte", payload.account_service, true)}
      ${svgField(916, 582, "Pays du compte", payload.account_country_code, true)}
      ${svgField(916, 680, "Devise", payload.payment_currency, true)}

      <rect x="0" y="888" width="1400" height="92" fill="rgba(255,255,255,0.72)" />
      <line x1="0" y1="888" x2="1400" y2="888" stroke="#e7e5e4" stroke-width="2" />
      <foreignObject x="90" y="912" width="1220" height="48">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, Helvetica, sans-serif; font-size: 20px; line-height: 1.45; font-weight: 600; color: #334155;">
          Veuillez effectuer le paiement exactement sur le compte indique. Conservez cette note comme justificatif.
        </div>
      </foreignObject>
    </svg>
  `.trim();
}

function svgField(x, y, label, value, dark = false) {
  const labelColor = dark ? "#94a3b8" : "#64748b";
  const valueColor = dark ? "#ffffff" : "#020617";
  const safeValue = escapeXml(value || "-");
  return `
    <text x="${x}" y="${y}" font-size="14" font-weight="700" letter-spacing="3" fill="${labelColor}">${escapeXml(label)}</text>
    <text x="${x}" y="${y + 34}" font-size="30" font-weight="700" fill="${valueColor}">${safeValue}</text>
  `;
}

function escapeXml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeHtml(value) {
  return escapeXml(value).replaceAll("\n", "<br />");
}
