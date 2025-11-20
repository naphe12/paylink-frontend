// components/account/AccountCard.jsx
export default function AccountCard({
  currency = "EUR",
  available = 0,
  pending = 0,
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white p-5 shadow-md">
      <div className="text-sm opacity-80">Solde disponible</div>
      <div className="text-3xl font-semibold mt-1">
        {available.toLocaleString()} {currency}
      </div>
      <div className="mt-3 text-sm opacity-80">
        En cours: {pending.toLocaleString()} {currency}
      </div>
    </div>
  );
}
