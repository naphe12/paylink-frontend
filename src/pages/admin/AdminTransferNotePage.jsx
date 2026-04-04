import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "@/services/api";

export default function AdminTransferNotePage() {
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
          setNote(data || null);
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
    const node = document.getElementById("payment-note-paper");
    if (!node) return;
    setExporting(format);
    try {
      const blob = await renderNodeToImageBlob(node, format);
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
        @media print {
          .note-toolbar { display: none !important; }
          .note-shell { padding: 0 !important; }
          .note-paper { box-shadow: none !important; border: 0 !important; }
          body { background: white !important; }
        }
      `}</style>

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

      <div className="note-shell flex justify-center px-2">
        <article
          id="payment-note-paper"
          className="note-paper w-full max-w-4xl overflow-hidden rounded-[32px] border border-stone-200 bg-[#fbf8f1] shadow-[0_22px_80px_rgba(15,23,42,0.12)]"
        >
          <header className="bg-[linear-gradient(135deg,#0b3b64,#124f82)] px-10 py-10 text-white">
            <p className="text-center text-[18px] font-semibold tracking-[0.35em] uppercase text-white/75">PesaPaid</p>
            <h2 className="mt-4 text-center font-serif text-5xl font-semibold">Note de paiement</h2>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-5 text-sm text-white/90">
              <span>Reference: {note?.reference_code || "-"}</span>
              <span>Date impression: {printedAt}</span>
            </div>
          </header>

          <section className="grid gap-6 px-10 py-10 md:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-6">
              <InfoCard title="Client">
                <Field label="Nom client" value={payload.client_name} />
                <Field label="Beneficiaire" value={payload.recipient_name} />
                <Field label="Pays destination" value={payload.country_destination} />
                <Field label="Statut" value={note?.status} />
              </InfoCard>

              <div className="rounded-[28px] border border-amber-200 bg-[linear-gradient(180deg,#fff6dd,#fffaf0)] px-7 py-7">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Montant a payer</p>
                <p className="mt-4 font-serif text-5xl font-semibold text-slate-950">{payload.amount_text || "-"}</p>
                <p className="mt-4 text-lg font-semibold leading-7 text-slate-950">
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

          <footer className="border-t border-stone-200 bg-white/70 px-10 py-6 text-sm font-medium leading-6 text-slate-700">
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
          ? "rounded-[28px] bg-slate-950 px-7 py-7 text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
          : "rounded-[28px] border border-stone-200 bg-white px-7 py-7"
      }
    >
      <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isDark ? "text-slate-300" : "text-slate-500"}`}>
        {title}
      </p>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, value, dark = false }) {
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${dark ? "text-slate-400" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold leading-8 ${dark ? "text-white" : "text-slate-950"}`}>{value || "-"}</p>
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

async function renderNodeToImageBlob(node, format = "png") {
  const rect = node.getBoundingClientRect();
  const width = Math.max(Math.ceil(rect.width), 1);
  const height = Math.max(Math.ceil(rect.height), 1);
  const clonedNode = node.cloneNode(true);

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.background = "#fbf8f1";
  wrapper.appendChild(clonedNode);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">${serialized}</foreignObject>
    </svg>
  `;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas indisponible pour l'export.");
    }
    context.scale(2, 2);
    context.fillStyle = "#fbf8f1";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (value) => {
          if (value) resolve(value);
          else reject(new Error("Generation image impossible."));
        },
        format === "jpeg" ? "image/jpeg" : "image/png",
        format === "jpeg" ? 0.95 : undefined
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Chargement image impossible."));
    image.src = src;
  });
}
