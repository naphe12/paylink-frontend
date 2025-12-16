import { useEffect, useState } from "react";
import api from "@/services/api";
import { Settings, RefreshCw } from "lucide-react";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({
    charge: "",
    fix_charge: "",
    coefficient: "",
    smsTransfert_fees: "",
    currency: "EUR",
  });
  const [fxCurrency, setFxCurrency] = useState("BIF");
  const [fxRate, setFxRate] = useState("");
  const [fxList, setFxList] = useState([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [gen, fx] = await Promise.all([
        api.getAdminSettings().catch(() => null),
        api.listFxCustomRates().catch(() => []),
      ]);
      if (gen) {
        setSettings((prev) => ({
          ...prev,
          charge: gen.charge ?? "",
          fix_charge: gen.fix_charge ?? "",
          coefficient: gen.coefficient ?? "",
          smsTransfert_fees: gen.smsTransfert_fees ?? "",
          currency: gen.currency ?? "EUR",
        }));
      }
      setFxList(fx);
    } catch (err) {
      setError(err.message || "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.updateAdminSettings(settings);
    } catch (err) {
      setError(err.message || "Sauvegarde impossible");
    } finally {
      setSaving(false);
    }
  };

  const saveFx = async () => {
    setSaving(true);
    try {
      await api.updateFxCustomRate(fxCurrency, fxRate);
      await load();
    } catch (err) {
      setError(err.message || "Sauvegarde FX impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin</p>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="text-indigo-600" /> Paramètres & FX
          </h1>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50"
          disabled={loading}
        >
          <RefreshCw size={16} /> Rafraîchir
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Paramètres généraux</h2>
        {loading ? (
          <p className="text-slate-500">Chargement...</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Charge (%)" value={settings.charge} onChange={(v) => setSettings((s) => ({ ...s, charge: v }))} />
            <Input label="Fix charge" value={settings.fix_charge} onChange={(v) => setSettings((s) => ({ ...s, fix_charge: v }))} />
            <Input label="Coefficient" value={settings.coefficient} onChange={(v) => setSettings((s) => ({ ...s, coefficient: v }))} />
            <Input label="SMS Transfert fees" value={settings.smsTransfert_fees} onChange={(v) => setSettings((s) => ({ ...s, smsTransfert_fees: v }))} />
            <Input label="Devise" value={settings.currency} onChange={(v) => setSettings((s) => ({ ...s, currency: v }))} />
          </div>
        )}
        <div className="mt-4">
          <button
            onClick={saveSettings}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Sauvegarde..." : "Enregistrer"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Taux FX custom</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Devise destination" value={fxCurrency} onChange={setFxCurrency} />
          <Input label="Taux" value={fxRate} onChange={setFxRate} />
        </div>
        <div className="mt-3">
          <button
            onClick={saveFx}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Sauvegarde..." : "Mettre à jour"}
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {fxList.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun taux défini.</p>
          ) : (
            fxList.map((fx) => (
              <div
                key={`${fx.origin_currency}-${fx.destination_currency}`}
                className="rounded-xl border px-3 py-2 flex justify-between text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {fx.origin_currency} → {fx.destination_currency}
                  </p>
                  <p className="text-slate-500">Source: {fx.source || "custom"} </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{fx.rate}</p>
                  <p className="text-xs text-slate-500">Actif: {fx.is_active ? "Oui" : "Non"}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      {label}
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border px-3 py-2"
      />
    </label>
  );
}
