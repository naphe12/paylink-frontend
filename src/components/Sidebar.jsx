// src/components/Sidebar.jsx
import { Wallet, Send, RefreshCcw, LogOut, Gift } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();

  const menuItems = [
    { name: "Mon Portefeuille", icon: <Wallet size={20} />, path: "/dashboard/client/wallet" },
    { name: "Demandes de paiement", icon: <Send size={20} />, path: "/dashboard/client/payments" },
    { name: "Transactions", icon: <RefreshCcw size={20} />, path: "/dashboard/client/transactions" },
    { name: "Transfert externe", path: "/dashboard/client/external-transfer", icon: <Send size={18} /> },
    { name: "Bonus", path: "/dashboard/client/bonus", icon: <Gift size={18}/> },
    


  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="w-64 h-screen bg-[#0b3b64] text-white flex flex-col justify-between shadow-lg">
      <div>
        <div className="text-2xl font-bold p-6 border-b border-white/10">💳 PayLink</div>
        <nav className="mt-4">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 hover:bg-white/10 transition ${
                  isActive ? "bg-white/20 font-semibold" : ""
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      <button
        onClick={handleLogout}
        className="m-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-red-500/80 transition"
      >
        <LogOut size={18} /> Déconnexion
      </button>
    </div>
  );
}

