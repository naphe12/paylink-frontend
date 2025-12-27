import { useState } from "react";

export default function CollateralForm({ onSubmit, loading }) {
  const [type, setType] = useState("cash");
  const [value, setValue] = useState("");
  const [details, setDetails] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!type) return;
    onSubmit({ type, value_estimated: value || null, details: details || null });
    setValue("");
    setDetails("");
  };

  return (
    <form className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm" onSubmit={submit}>
      <select
        className="border rounded-lg px-2 py-1"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="cash">Cash</option>
        <option value="asset">Asset</option>
        <option value="guarantor">Guarantor</option>
      </select>
      <input
        className="border rounded-lg px-2 py-1"
        placeholder="Valeur estimee"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <input
        className="border rounded-lg px-2 py-1"
        placeholder="Details (optionnel)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
      <div className="md:col-span-3">
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Ajout..." : "Ajouter un collaterale"}
        </button>
      </div>
    </form>
  );
}
