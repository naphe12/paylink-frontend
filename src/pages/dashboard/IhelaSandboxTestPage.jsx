import { useState } from "react";
import api from "@/services/api";
import ApiErrorAlert from "@/components/ApiErrorAlert";

function initialWithdrawalForm() {
  return {
    debit_account: "",
    debit_account_holder: "",
    amount: "",
    description: "Test transfert externe",
    external_reference: `PAYLINK-${Date.now()}`,
    pin_code: "",
  };
}

export default function IhelaSandboxTestPage() {
  const [withdrawalForm, setWithdrawalForm] = useState(initialWithdrawalForm);
  const [lookupForm, setLookupForm] = useState({ account_number: "16-01" });
  const [statusForm, setStatusForm] = useState({ reference: "" });
  const [loadingWithdrawal, setLoadingWithdrawal] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [error, setError] = useState("");
  const [withdrawalResult, setWithdrawalResult] = useState(null);
  const [lookupResult, setLookupResult] = useState(null);
  const [statusResult, setStatusResult] = useState(null);

  const onChangeWithdrawal = (key, value) => {
    setWithdrawalForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitWithdrawal = async (event) => {
    event.preventDefault();
    setError("");
    setWithdrawalResult(null);
    setLoadingWithdrawal(true);
    try {
      const payload = {
        ...withdrawalForm,
        amount: Number(withdrawalForm.amount),
      };
      const data = await api.post("/providers/ihela/test/withdrawal", payload);
      setWithdrawalResult(data);
      const ref = data?.response?.response_data?.reference;
      if (ref) {
        setStatusForm({ reference: String(ref) });
      }
    } catch (err) {
      setError(err?.message || "Erreur pendant le test iHela (withdrawal).");
    } finally {
      setLoadingWithdrawal(false);
    }
  };

  const submitLookup = async (event) => {
    event.preventDefault();
    setError("");
    setLookupResult(null);
    setLoadingLookup(true);
    try {
      const data = await api.post("/providers/ihela/test/account-lookup", lookupForm);
      setLookupResult(data);
    } catch (err) {
      setError(err?.message || "Erreur pendant le test iHela (lookup).");
    } finally {
      setLoadingLookup(false);
    }
  };

  const submitStatus = async (event) => {
    event.preventDefault();
    setError("");
    setStatusResult(null);
    setLoadingStatus(true);
    try {
      const data = await api.post("/providers/ihela/test/transaction-status", statusForm);
      setStatusResult(data);
    } catch (err) {
      setError(err?.message || "Erreur pendant le test iHela (status).");
    } finally {
      setLoadingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="text-xl font-semibold text-slate-900">iHela Sandbox Test</h1>
        <p className="mt-2 text-sm text-slate-600">
          Test direct depuis le frontend React via proxy backend. Le secret OAuth2 reste cote serveur.
        </p>
      </header>

      {error ? <ApiErrorAlert message={error} onClose={() => setError("")} /> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">1) Test make-withdrawal</h2>
        <form onSubmit={submitWithdrawal} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="debit_account"
            value={withdrawalForm.debit_account}
            onChange={(e) => onChangeWithdrawal("debit_account", e.target.value)}
            required
          />
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="debit_account_holder"
            value={withdrawalForm.debit_account_holder}
            onChange={(e) => onChangeWithdrawal("debit_account_holder", e.target.value)}
            required
          />
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="amount"
            type="number"
            min="1"
            value={withdrawalForm.amount}
            onChange={(e) => onChangeWithdrawal("amount", e.target.value)}
            required
          />
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="pin_code"
            value={withdrawalForm.pin_code}
            onChange={(e) => onChangeWithdrawal("pin_code", e.target.value)}
            required
          />
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            placeholder="description"
            value={withdrawalForm.description}
            onChange={(e) => onChangeWithdrawal("description", e.target.value)}
          />
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            placeholder="external_reference"
            value={withdrawalForm.external_reference}
            onChange={(e) => onChangeWithdrawal("external_reference", e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loadingWithdrawal}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loadingWithdrawal ? "Envoi..." : "Tester withdrawal"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">2) Test account lookup</h2>
        <form onSubmit={submitLookup} className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="account_number"
            value={lookupForm.account_number}
            onChange={(e) => setLookupForm({ account_number: e.target.value })}
            required
          />
          <button
            type="submit"
            disabled={loadingLookup}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loadingLookup ? "Recherche..." : "Tester lookup"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">3) Test transaction-status</h2>
        <form onSubmit={submitStatus} className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="reference"
            value={statusForm.reference}
            onChange={(e) => setStatusForm({ reference: e.target.value })}
            required
          />
          <button
            type="submit"
            disabled={loadingStatus}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loadingStatus ? "Verification..." : "Tester status"}
          </button>
        </form>
      </section>

      {withdrawalResult ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Resultat withdrawal</h3>
          <pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
            {JSON.stringify(withdrawalResult, null, 2)}
          </pre>
        </section>
      ) : null}

      {lookupResult ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Resultat account lookup</h3>
          <pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
            {JSON.stringify(lookupResult, null, 2)}
          </pre>
        </section>
      ) : null}

      {statusResult ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Resultat transaction-status</h3>
          <pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
            {JSON.stringify(statusResult, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
