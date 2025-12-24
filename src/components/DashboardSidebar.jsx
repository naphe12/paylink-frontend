// src/components/DashboardSidebar.jsx
import { Wallet, Send, RefreshCw, User, LogOut, HandCoins } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function DashboardSidebar() {
  const location = useLocation();

  const navItems = [
    { name: "Portefeuille", icon: <Wallet size={20} />, path: "/dashboard/client" },
    { name: "Transferts", icon: <Send size={20} />, path: "/dashboard/client/transfers" },
    { name: "Demandes", icon: <HandCoins size={20} />, path: "/dashboard/client/payments" },
    { name: "Taux FX", icon: <RefreshCw size={20} />, path: "/dashboard/client/fx" },
    { name: "Profil", icon: <User size={20} />, path: "/dashboard/client/profile" },
  ];

  return (
    <aside className="w-64 bg-[#0b3b64] text-white h-screen p-6 flex flex-col justify-between">
      <div>
        <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
          <span className="text-[#ff9f1c] text-4xl">PL</span> PayLink
        </h1>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  active ? "bg-[#ff9f1c] text-white" : "hover:bg-[#1a4d8c] text-gray-200"
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1a4d8c] transition-all">
        <LogOut size={20} />
        Deconnexion
      </button>
    </aside>
  );
}
