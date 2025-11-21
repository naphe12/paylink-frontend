// src/pages/dashboard/ProfilePage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { User } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get("/auth/me");
        setProfile(data);
      } catch (err) {
        console.error("Erreur profil :", err);
      }
    })();
  }, []);

  if (!profile) return <p>Chargement...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#0b3b64] mb-6 flex items-center gap-2">
        <User /> Mon profil
      </h2>
      <div className="bg-white p-6 rounded-2xl shadow w-full max-w-md">
        <p>
          <strong>Nom :</strong> {profile.full_name}
        </p>
        <p>
          <strong>Email :</strong> {profile.email}
        </p>
        <p>
          <strong>Téléphone :</strong> {profile.phone_e164}
        </p>
        <p>
          <strong>Pays :</strong> {profile.country_code}
        </p>
        <p>
          <strong>Status :</strong> {profile.status}
        </p>
        <div className="mt-4">
          <Link
            to="/auth/reset-password"
            className="inline-block px-4 py-2 rounded-lg border border-[#0b3b64] text-[#0b3b64] hover:bg-[#0b3b64] hover:text-white transition"
          >
            Réinitialiser le mot de passe
          </Link>
        </div>
      </div>
    </div>
  );
}
