import { useEffect, useState } from "react";

import api from "@/services/api";

export default function AdminAssistantUserPicker({
  targetUserId,
  setTargetUserId,
  title = "Client cible",
}) {
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (!targetUserId) {
      setSelectedUser(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/admin/users/${targetUserId}`)
      .then((data) => {
        if (cancelled || !data) return;
        const nextUser = {
          user_id: data.user_id,
          full_name: data.full_name,
          email: data.email,
          phone: data.phone_e164,
        };
        setSelectedUser(nextUser);
        setUserSearch(data.full_name || data.email || data.phone_e164 || "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  useEffect(() => {
    const query = String(userSearch || "").trim();
    if (query.length < 2) {
      setUserResults([]);
      setUserLoading(false);
      return undefined;
    }
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setUserLoading(true);
      try {
        const data = await api.get(`/admin/users?q=${encodeURIComponent(query)}&role=client`);
        if (!cancelled) {
          setUserResults(Array.isArray(data) ? data.slice(0, 8) : []);
        }
      } catch {
        if (!cancelled) setUserResults([]);
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [userSearch]);

  const chooseUser = (user) => {
    setSelectedUser(user);
    setTargetUserId(String(user?.user_id || ""));
    setUserSearch(user?.full_name || user?.email || "");
    setUserResults([]);
  };

  return (
    <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-900">{title}</p>
      <input
        value={userSearch}
        onChange={(event) => setUserSearch(event.target.value)}
        className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
        placeholder="Rechercher un client par nom, email ou telephone"
      />
      {selectedUser ? (
        <div className="mt-3 rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">{selectedUser.full_name || "Client sans nom"}</p>
          <p>{selectedUser.email || selectedUser.phone || selectedUser.user_id}</p>
          <p className="mt-1 text-xs text-slate-500">user_id: {selectedUser.user_id}</p>
        </div>
      ) : null}
      {userLoading ? <p className="mt-3 text-xs text-blue-700">Recherche...</p> : null}
      {userResults.length ? (
        <div className="mt-3 space-y-2">
          {userResults.map((user) => (
            <button
              key={user.user_id}
              type="button"
              onClick={() => chooseUser(user)}
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-3 text-left text-sm text-slate-700 hover:bg-blue-100/60"
            >
              <p className="font-semibold text-slate-900">{user.full_name || "Client sans nom"}</p>
              <p>{user.email || user.phone || user.user_id}</p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
