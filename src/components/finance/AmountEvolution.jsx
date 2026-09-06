import { useState } from "react";

const amount = (value, currency) => `${value.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} ${currency}`;
const date = (value) => new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
export default function AmountEvolution({ title, rows, note = "Évolution sur les événements disponibles ; cet historique peut être partiel.", loading = false, error = "" }) {
  const [period, setPeriod] = useState("all");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const currencies = [...new Set(rows.map((row) => row.currency))].sort();
  const currency = currencies.includes(selectedCurrency) ? selectedCurrency : currencies[0] || "";
  const cutoff = period === "all" ? -Infinity : Date.now() - Number(period) * 86400000;
  const selected = rows.filter((row) => row.currency === currency && row.time >= cutoff);
  const first = selected[0];
  const last = selected.at(-1);
  const change = first ? last.after - first.before : 0;
  const values = first ? [first.before, ...selected.map((row) => row.after)] : [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const y = (value) => 110 - ((value - min) / (max - min || 1)) * 90;
  const x = (time) => 20 + ((time - first.time) / (last.time - first.time || 1)) * 560;
  const path = first ? `M 20 ${y(first.before)} ${selected.map((row) => `H ${x(row.time)} V ${y(row.after)}`).join(" ")}` : "";

  return (
    <section className="space-y-4 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm" aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{note}</p></div>
        <div className="flex flex-wrap gap-2">
          {currencies.length > 1 && <label className="text-xs text-slate-600">Devise
            <select aria-label={`Devise — ${title}`} value={currency} onChange={(event) => setSelectedCurrency(event.target.value)} className="ml-2 rounded-lg border border-slate-200 p-2">{currencies.map((item) => <option key={item} value={item}>{item || "Non précisée"}</option>)}</select>
          </label>}
          <select aria-label={`Période — ${title}`} value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-lg border border-slate-200 p-2 text-sm">
            <option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option><option value="all">Historique disponible</option>
          </select>
        </div>
      </div>
      {loading ? <p role="status" className="text-sm text-slate-500">Chargement de l’évolution…</p> : error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : !first ? <p className="text-sm text-slate-500">Aucun événement exploitable sur cette période.</p> : <>
        <div className="grid gap-3 sm:grid-cols-3">
          {[['Avant le premier événement', first.before], ['Après le dernier événement', last.after], ['Variation observée', change]].map(([label, value], index) => <div key={label} className={`rounded-xl p-3 ${index === 2 ? 'bg-indigo-50 text-indigo-800' : 'bg-slate-50 text-slate-800'}`}><p className="text-xs">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{index === 2 && value > 0 ? '+' : ''}{amount(value, currency)}</p></div>)}
        </div>
        <figure>
          <svg viewBox="0 0 600 130" className="h-40 w-full text-indigo-600" role="img" aria-label={`${title} : de ${amount(first.before, currency)} à ${amount(last.after, currency)}`}>
            <path d="M 20 115 H 580" stroke="#e2e8f0" fill="none" />
            <path d={path} stroke="currentColor" strokeWidth="3" fill="none" vectorEffect="non-scaling-stroke" />
            {selected.map((row, index) => <circle key={index} cx={x(row.time)} cy={y(row.after)} r="4" fill="currentColor"><title>{date(row.time)} : {amount(row.after, currency)}</title></circle>)}
          </svg>
          <figcaption className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{date(first.time)}</span><span>{selected.length} événement(s)</span><span>{date(last.time)}</span></figcaption>
        </figure>
      </>}
    </section>
  );
}
