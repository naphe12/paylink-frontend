import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import { Share2, UserPlus, ArrowRight, Coins } from "lucide-react";
import AddMemberModal from "@/components/tontine/AddMemberModal";
import DebtsTable from "@/components/tontine/DebtsTable";
import useTontineWS from "@/hooks/useTontineWS";

export default function TontineDetailPage() {
  const { id } = useParams();

  const [tontine, setTontine] = useState(null);
  const [activeTab, setActiveTab] = useState("members");
  const [showAdd, setShowAdd] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);

  const [rotation, setRotation] = useState([]);
  const [currentReceiver, setCurrentReceiver] = useState(null);

  const [contributions, setContributions] = useState([]);

  const [commonPot, setCommonPot] = useState(null);

  const userRole = localStorage.getItem("role");
  const userId = localStorage.getItem("user_id");

  const isAdminOrCreator =
    userRole === "admin" || userId === tontine?.created_by;

  const loadData = async () => {
    const data = await api.getTontine(id);
    setTontine(data);

    if (data.tontine_type === "rotative") {
      const rot = await api.get(`/tontines/${id}/rotation`);
      setRotation(rot.rotation);
      setCurrentReceiver(rot.current_user);
    } else {
      const pot = await api.get(`/tontines/${id}/common-pot`);
      setCommonPot(pot.common_pot);
    }

    const contribs = await api.get(`/tontines/${id}/contributions`);
    setContributions(contribs);
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  // ✅ WebSocket → Appel unique
  useTontineWS(id, (msg) => {
    if (msg.type === "contribution_update") {
      loadData();

      const audio = new Audio("/sounds/notify.mp3");
      audio.play().catch(() => {});
      if (navigator.vibrate) navigator.vibrate(150);
    }

    if (msg.type === "member_online" || msg.type === "member_offline") {
      setTontine((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members?.map((m) =>
                m.user_id === msg.user_id
                  ? { ...m, is_online: msg.type === "member_online" }
                  : m
              ),
            }
          : prev
      );
    }
  });

  if (!tontine) return <p className="p-8">Chargement...</p>;

  return (
    <div className="bg-white shadow-md p-6 rounded-xl max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-[#0b3b64]">{tontine.name}</h2>

      <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-600">
        {tontine.tontine_type === "rotative"
          ? "Tontine rotative 🔁"
          : "Épargne commune 💰"}
      </span>

      {tontine.tontine_type === "rotative" && (
        <div className="mt-4 p-4 bg-green-50 border rounded-lg">
          {tontine.members?.length > 0 && (
            <>
              <p className="text-xl font-bold text-green-700">
                🎯 Tour actuel : {tontine.members[tontine.current_round].name}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Prochaine rotation :{" "}
                {new Date(tontine.next_rotation_at).toLocaleString()}
              </p>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          className="btn-primary flex gap-2 items-center"
          onClick={() => setShowAdd(true)}
        >
          <UserPlus size={18} /> Ajouter Membres
        </button>

        <button
          onClick={async () => {
            const data = await api.post(`/tontines/${id}/invitation`);
            await navigator.clipboard.writeText(data.invite_url);
            alert("🔗 Lien copié : " + data.invite_url);
          }}
          className="btn-secondary flex gap-2 items-center"
        >
          <Share2 size={18} /> Copier l’invitation
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mt-8 border-b pb-2">
        <TabButton
          id="members"
          active={activeTab}
          onClick={setActiveTab}
          label="Membres"
        />
        <TabButton
          id="contributions"
          active={activeTab}
          onClick={setActiveTab}
          label="Contributions"
        />
        {tontine.tontine_type === "rotative" ? (
          <TabButton
            id="rotation"
            active={activeTab}
            onClick={setActiveTab}
            label="Rotation 🔁"
          />
        ) : (
          <TabButton
            id="common-pot"
            active={activeTab}
            onClick={setActiveTab}
            label="Pot Commun 💰"
          />
        )}
      </div>

      {/* Membres */}
      {activeTab === "members" && (
        <ul className="mt-4 space-y-2">
          {tontine.members?.map((m) => (
            <li
              key={m.user_id}
              className="p-3 border rounded-lg flex justify-between items-center"
            >
              <div className="flex items-center gap-2">
                <span
                  className={m.is_online ? "text-green-500" : "text-gray-400"}
                >
                  ●
                </span>
                <span>{m.name}</span>
              </div>
              <span className="text-gray-500">{m.phone}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Contributions */}
      {activeTab === "contributions" && (
        <div className="mt-6 space-y-6">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            onClick={() => setShowContributeModal(true)}
          >
            🤝 Contribuer ({tontine.amount_per_member} {tontine.currency_code})
          </button>

          {contributions?.map((c) => (
            <div
              key={c.contribution_id}
              className="p-3 border rounded-lg flex justify-between items-center bg-white"
            >
              <span>{c.user_name}</span>
              <span>
                {c.amount} {tontine.currency_code}
              </span>
              <span
                className={
                  c.status === "paid"
                    ? "text-green-600"
                    : c.status === "pending"
                    ? "text-yellow-600"
                    : "text-gray-500"
                }
              >
                {c.status}
              </span>
            </div>
          ))}

          <DebtsTable id={id} currency={tontine.currency_code} />
        </div>
      )}

      {/* Pot commun */}
      {activeTab === "common-pot" && tontine.tontine_type === "epargne" && (
        <div className="p-5 bg-white rounded-xl shadow-sm border mt-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Coins size={20} /> Pot Commun Total
          </h3>
          <p className="text-3xl font-bold text-green-600 my-3">
            {commonPot?.toFixed(2)} {tontine.currency_code}
          </p>
        </div>
      )}

      {showAdd && (
        <AddMemberModal
          tontineId={id}
          onClose={() => setShowAdd(false)}
          onAdded={loadData}
        />
      )}

      {showContributeModal && (
        <PaymentModal
          id={id}
          close={() => setShowContributeModal(false)}
          refresh={loadData}
        />
      )}
    </div>
  );
}

function TabButton({ id, active, onClick, label }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={
        active === id
          ? "border-b-2 border-purple-600 font-semibold"
          : "text-gray-500"
      }
    >
      {label}
    </button>
  );
}
