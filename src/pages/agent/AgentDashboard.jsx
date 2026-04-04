import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { getCurrentRole } from "@/services/authStore";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  QrCode,
  Activity,
  RefreshCcw,
  Loader2,
} from "lucide-react";
import QuickActions from "@/components/QuickActions";
import DirectionBadge from "@/components/DirectionBadge";
import { AGENT_QUICK_ACTION_GROUPS } from "@/constants/agentQuickActionGroups";

const MetricCard = ({ label, value, icon: Icon, accent }) => (
  <div
    className={`rounded-2xl border bg-white px-4 py-4 flex items-center gap-4 ${accent}`}
  >
    <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

export default function AgentDashboard() {
  const navigate = useNavigate();
  const isAdmin = String(getCurrentRole() || "agent").toLowerCase() === "admin";
  const [dashboard, setDashboard] = useState(null);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientForm, setClientForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone_e164: "",
    country_code: "",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAgentDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err.message || "Impossible de charger le dashboard agent");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const list = await api.getCountries();
        setCountries(list);
      } catch (err) {
        setError((prev) => prev || err?.message || "Impossible de charger les pays");
      }
    };
    loadCountries();
  }, []);

  const handleClientChange = (field, value) => {
    setClientForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setCreatingClient(true);
    try {
      await api.createAgentClient({
        ...clientForm,
        phone_e164: clientForm.phone_e164 || undefined,
        country_code: clientForm.country_code.trim().toUpperCase() || undefined,
      });
      setClientForm({
        full_name: "",
        email: "",
        password: "",
        phone_e164: "",
        country_code: "",
      });
      alert("Client cree avec succes");
    } catch (err) {
      alert(err?.message || "Creation client impossible");
    } finally {
      setCreatingClient(false);
    }
  };

  const metrics = useMemo(() => {
    if (!dashboard?.metrics) return [];
    return [
      {
        label: "Solde agent",
        value: `${dashboard.balance?.toLocaleString() ?? 0} BIF`,
        icon: Wallet,
      },
      {
        label: "Cash-in (aujourd'hui)",
        value: `${dashboard.metrics.cashin_today?.toLocaleString() ?? 0} BIF`,
        icon: ArrowDownCircle,
      },
      {
        label: "Cash-out (aujourd'hui)",
        value: `${dashboard.metrics.cashout_today?.toLocaleString() ?? 0} BIF`,
        icon: ArrowUpCircle,
      },
      {
        label: "Commission cumulée",
        value: `${dashboard.metrics.total_commission?.toLocaleString() ?? 0} BIF`,
        icon: Activity,
      },
    ];
  }, [dashboard]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity size={24} /> Tableau de bord agent
          </h1>
          <p className="text-sm text-slate-500">
            Visualise tes flux quotidiens et tes commissions en un coup d’œil.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm"
        >
          <RefreshCcw size={16} />
          Rafraîchir
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-slate-500">
          <Loader2 className="animate-spin mr-2" /> Chargement...
        </div>
      ) : error ? (
        <div className="p-4 border border-red-200 rounded-xl bg-red-50 text-red-700">
          {error}
        </div>
      ) : (
        <>
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Nouveau client</h2>
              <p className="text-sm text-slate-500">
                Cree un client directement depuis l'espace agent.
              </p>
            </div>
            <form onSubmit={handleCreateClient} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <input
                className="rounded-xl border px-3 py-2"
                placeholder="Nom complet"
                value={clientForm.full_name}
                onChange={(e) => handleClientChange("full_name", e.target.value)}
                required
              />
              <input
                type="email"
                className="rounded-xl border px-3 py-2"
                placeholder="Email"
                value={clientForm.email}
                onChange={(e) => handleClientChange("email", e.target.value)}
                required
              />
              <input
                className="rounded-xl border px-3 py-2"
                placeholder="Telephone (+257...)"
                value={clientForm.phone_e164}
                onChange={(e) => handleClientChange("phone_e164", e.target.value)}
              />
              <input
                className="rounded-xl border px-3 py-2"
                placeholder="Mot de passe initial"
                value={clientForm.password}
                onChange={(e) => handleClientChange("password", e.target.value)}
                required
              />
              <select
                className="rounded-xl border px-3 py-2"
                value={clientForm.country_code}
                onChange={(e) => handleClientChange("country_code", e.target.value)}
              >
                <option value="">Choisir un pays</option>
                {countries.map((country) => (
                  <option key={country.country_code} value={country.country_code}>
                    {country.name} ({country.country_code})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={creatingClient}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 md:col-span-2 xl:col-span-5"
              >
                {creatingClient ? "Creation..." : "Creer le client"}
              </button>
            </form>
          </section>

          <QuickActions
            title="Actions rapides"
            subtitle="Chaque groupe reprend les items reels du menu agent."
            groups={isAdmin ? AGENT_QUICK_ACTION_GROUPS : AGENT_QUICK_ACTION_GROUPS.filter((group) => group.key !== "admin")}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              className="rounded-2xl border bg-white p-6 text-left hover:shadow-md transition"
              onClick={() => navigate("/dashboard/agent/operation")}
            >
              <p className="text-xs uppercase text-slate-500">Flux assisté</p>
              <h3 className="text-lg font-semibold text-slate-900 mt-1">
                Opération client
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Cash-in / cash-out guidé pour les clients présents.
              </p>
            </button>

            <button
              className="rounded-2xl border bg-white p-6 text-left hover:shadow-md transition"
              onClick={() => navigate("/dashboard/agent/scan")}
            >
              <p className="text-xs uppercase text-slate-500">Paiement</p>
              <h3 className="text-lg font-semibold text-slate-900 mt-1">
                Scanner un QR
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Encaisse un client via PesaPaid QR et confirme la transaction.
              </p>
            </button>
          </section>

          <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Dernières opérations
              </h2>
              <button
                className="text-sm text-slate-500 hover:text-slate-900"
                onClick={() => navigate("/dashboard/agent/history")}
              >
                Voir tout
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Montant</th>
                    <th className="p-3 text-left">Commission</th>
                    <th className="p-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard?.recent?.length ? (
                    dashboard.recent.map((tx) => (
                      <tr key={tx.transaction_id} className="border-t">
                        <td className="p-3"><DirectionBadge value={tx.direction} /></td>
                        <td className="p-3 font-semibold text-slate-900">
                          {tx.amount.toLocaleString()} BIF
                        </td>
                        <td className="p-3 text-emerald-600">
                          {tx.commission.toLocaleString()} BIF
                        </td>
                        <td className="p-3 text-xs text-slate-500">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-6 text-center text-slate-500"
                      >
                        Aucune opération récente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          className="w-full py-3 bg-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition"
          onClick={() => navigate("/dashboard/agent/cash-in")}
        >
          <ArrowDownCircle size={20} /> Cash-In direct
        </button>
        <button
          className="w-full py-3 bg-rose-600 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-rose-700 transition"
          onClick={() => navigate("/dashboard/agent/cash-out")}
        >
          <ArrowUpCircle size={20} /> Cash-Out direct
        </button>
      </div>

      <button
        className="w-full py-3 bg-teal-600 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-teal-700 transition"
        onClick={() => navigate("/dashboard/agent/history")}
      >
        <QrCode size={20} /> Historique détaillé
      </button>
    </div>
  );
}

