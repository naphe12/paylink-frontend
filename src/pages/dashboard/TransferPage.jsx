// src/pages/dashboard/TransferPage.jsx
import { useEffect, useState } from "react";
import api from "@/services/api";

import { Send } from "lucide-react";

export default function TransferPage() {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const query = email.trim();
    if (!searchOpen || query.length < 2) {
      setRecipients([]);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        const results = await api.searchInternalTransferRecipients(query);
        if (!cancelled) setRecipients(Array.isArray(results) ? results : []);
      } catch {
        if (!cancelled) setRecipients([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [email, searchOpen]);

  const handleTransfer = async () => {
    if (!email || !amount) return alert("Champs incomplets !");
    try {
      await api.post("/wallet/transfer", { receiver_email: email, amount: Number(amount) });
      alert("✅ Transfert effectué !");
      setEmail("");
      setAmount("");
    } catch (err) {
      alert("Erreur transfert : " + err.message);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#0b3b64] mb-6 flex items-center gap-2">
        <Send /> Transfert
      </h2>

      <div className="bg-white p-5 rounded-2xl shadow w-full max-w-md">
        <div className="relative mb-3">
          <input
            type="text"
            role="combobox"
            aria-label="Destinataire interne"
            aria-autocomplete="list"
            aria-expanded={searchOpen && email.trim().length >= 2}
            placeholder="Nom, email, telephone ou @paytag"
            value={email}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              setEmail(e.target.value);
              setSearchOpen(true);
            }}
            className="border rounded-lg px-3 py-2 w-full"
          />
          {searchOpen && email.trim().length >= 2 ? (
            <div role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border bg-white p-1 text-left shadow-lg">
              {searching ? (
                <p className="px-3 py-2 text-sm text-slate-500">Recherche...</p>
              ) : recipients.length ? (
                recipients.map((recipient) => {
                  const identifier = recipient.paytag || recipient.email || recipient.phone || recipient.username;
                  return (
                    <button
                      key={recipient.user_id}
                      type="button"
                      role="option"
                      onClick={() => {
                        setEmail(identifier);
                        setRecipients([]);
                        setSearchOpen(false);
                      }}
                      className="block w-full rounded-lg px-3 py-2 hover:bg-cyan-50"
                    >
                      <span className="block text-sm font-semibold text-slate-900">
                        {recipient.full_name || recipient.username || identifier}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {[recipient.email, recipient.phone, recipient.paytag].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-2 text-sm text-slate-500">Aucun client trouve.</p>
              )}
            </div>
          ) : null}
        </div>
        <input
          type="number"
          placeholder="Montant (€)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full mb-4"
        />
        <button
          onClick={handleTransfer}
          className="w-full bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
