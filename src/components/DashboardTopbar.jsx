// src/components/DashboardTopbar.jsx
import { Bell, Settings } from "lucide-react";

export default function DashboardTopbar() {
  return (
    <header className="flex justify-between items-center bg-white px-8 py-4 border-b shadow-sm">
      <h2 className="text-xl font-semibold text-[#0b3b64]">Tableau de bord</h2>

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-gray-100">
          <Bell size={20} className="text-[#0b3b64]" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100">
          <Settings size={20} className="text-[#0b3b64]" />
        </button>

        <div className="flex items-center gap-2 pl-4 border-l">
          <img
            src="https://i.pravatar.cc/40"
            alt="avatar"
            className="w-8 h-8 rounded-full"
          />
          <span className="font-medium text-[#0b3b64]">Adolphe</span>
        </div>
      </div>
    </header>
  );
}
