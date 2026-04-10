import { useEffect, useState } from "react";
import { Check, LayoutPanelLeft } from "lucide-react";
import {
  CLIENT_UI_MODES,
  getClientUiMode,
  setClientUiMode,
  subscribeClientUiMode,
} from "@/utils/clientUiMode";

export default function ClientInterfaceModePage() {
  const [mode, setMode] = useState(getClientUiMode());

  useEffect(() => subscribeClientUiMode(setMode), []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Client</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold text-slate-900">
          <LayoutPanelLeft className="text-indigo-600" /> Mode interface
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Choisis le niveau de complexite de ton espace client. Le mode simple masque les modules avances.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {Object.values(CLIENT_UI_MODES).map((option) => {
          const selected = option.key === mode;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setClientUiMode(option.key)}
              className={`rounded-2xl border p-5 text-left shadow-sm transition ${
                selected
                  ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Mode</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">{option.label}</h2>
                </div>
                {selected ? (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <Check size={16} />
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm text-slate-600">{option.description}</p>
              <div className="mt-5 text-sm font-medium text-indigo-700">
                {selected ? "Mode actif" : "Activer ce mode"}
              </div>
            </button>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Perimetre</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ModeSummary
            title="Simple"
            items={[
              "Portefeuille, paiements, transferts et cash",
              "Assistants generaux",
              "Credit, microfinance et profil",
              "Actions rapides alignees au menu simple",
            ]}
          />
          <ModeSummary
            title="Expert"
            items={[
              "Tout le mode simple",
              "Epargne, cartes, comptes pro et API marchande",
              "Cagnottes, tontines, P2P et escrow",
              "Actions rapides completes",
            ]}
          />
        </div>
      </section>
    </div>
  );
}

function ModeSummary({ title, items }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check size={14} className="mt-0.5 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

