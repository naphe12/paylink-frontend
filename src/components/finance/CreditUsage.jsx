export default function CreditUsage({ limit, used, available, currency }) {
  const ceiling = Number(limit || 0);
  const debt = Number(used || 0);
  const percent = ceiling > 0 ? (debt / ceiling) * 100 : null;
  const format = (value) => `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${currency || ""}`;
  return <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-label="Dette et capacité de crédit">
    <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold text-slate-900">Dette et capacité de crédit</h2><span className="text-sm text-slate-600">{percent == null ? "Aucun plafond disponible" : `${percent.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % du plafond utilisé`}</span></div>
    <div className="h-3 overflow-hidden rounded-full bg-slate-200" role="meter" aria-label="Utilisation du crédit" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, percent || 0))} aria-valuetext={percent == null ? "Plafond indisponible" : `${percent.toFixed(1)} %`}><div className={`h-full rounded-full ${percent >= 80 ? "bg-rose-500" : "bg-indigo-500"}`} style={{ width: `${Math.min(100, Math.max(0, percent || 0))}%` }} /></div>
    <div className="flex flex-wrap justify-between gap-2 text-sm"><p className="text-rose-700">Dette actuelle : <strong>{format(debt)}</strong></p><p className="text-slate-700">Crédit disponible : <strong>{format(available)}</strong></p></div>
    <p className="text-xs text-slate-500">Situation actuelle. La courbe historique présente les variations du crédit disponible.</p>
  </section>;
}
