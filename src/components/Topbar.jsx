// src/components/Topbar.jsx
import { Bell, User } from "lucide-react";

export default function Topbar() {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
      <h1 className="text-xl font-semibold text-gray-800">Tableau de bord</h1>
      <div className="flex items-center gap-4">
        <button className="relative text-gray-500 hover:text-blue-600">
          <Bell size={20} />
        </button>
        <div className="flex items-center gap-2 text-gray-700">
          <User size={20} className="text-blue-600" />
          <span className="font-medium">Adolphe</span>
        </div>
      </div>
    </div>
  );
}
