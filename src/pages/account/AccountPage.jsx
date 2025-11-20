export default function AccountPage() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="p-6 space-y-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-[#0b3b64]">Mon Compte</h1>

      <div className="p-4 bg-white rounded-xl border shadow-sm">
        <p className="text-lg font-semibold">{user.full_name}</p>
        <p className="text-gray-600">{user.phone_e164}</p>
      </div>

      {/* ✅ Ajout du bouton QR */}
      <Link
        to="/me/qr"
        className="flex items-center justify-between p-4 bg-white border rounded-xl hover:bg-gray-50 shadow-sm"
      >
        <span className="text-lg">📱 Mon QR PayLink</span>
        <span className="text-gray-400">→</span>
      </Link>
    </div>
  );
}
