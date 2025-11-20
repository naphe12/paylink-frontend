import DashboardSidebar from "../../components/DashboardSidebar";
import useAuth from "../../hooks/useAuth";
import WalletCard from "../../components/WalletCard";
import TransferCard from "../../components/TransferCard";
import RequestMoneyCard from "../../components/RequestMoneyCard";
import PaymentRequestsList from "../../components/PaymentRequestsList";
import TransactionsList from "../../components/TransactionsList";
import NotificationsBell from "../../components/NotificationsBell";
export default function DashboardPage() {
  const { logout } = useAuth();

  return (
    <div className="flex h-screen bg-[#f5f8ff]">
      {/* 🔹 Sidebar */}
      <DashboardSidebar />

      {/* 🔹 Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* 🔹 Topbar avec déconnexion */}
        <div className="flex justify-between items-center p-6 bg-white border-b shadow-sm">
          <h1 className="text-2xl font-bold text-[#0b3b64]">Tableau de bord</h1>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all"
          >
            🚪 Déconnexion
          </button>
        </div>

        {/* 🔹 Contenu central */}
        <main className="p-8 space-y-6 overflow-y-auto">
          {/* 💳 Carte portefeuille */}
          <section className="flex justify-center">
            <div className="absolute top-6 right-6">
        <NotificationsBell />
      </div>
            <WalletCard />
      <TransferCard />
      <RequestMoneyCard />
      <PaymentRequestsList />
      <TransactionsList />
      
          </section>

          {/* 📊 Section transactions */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border">
            <h3 className="text-lg font-semibold text-[#0b3b64] mb-4">
              Dernières transactions 📊
            </h3>
            <ul className="divide-y divide-gray-100">
              <li className="py-2 flex justify-between">
                <span>Transfert à John</span>
                <span className="text-[#0066ff] font-medium">- €200</span>
              </li>
              <li className="py-2 flex justify-between">
                <span>Reçu de Marie</span>
                <span className="text-green-600 font-medium">+ €350</span>
              </li>
              <li className="py-2 flex justify-between">
                <span>Frais FX</span>
                <span className="text-gray-500">- €5</span>
              </li>
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}
