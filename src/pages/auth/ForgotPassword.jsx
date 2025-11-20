import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur de réinitialisation");

      setMessage("📩 Un lien de réinitialisation a été envoyé à votre adresse email.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-700 via-blue-600 to-sky-500 text-white relative overflow-hidden">
      {/* 🌈 Halo décoratif */}
      <div className="absolute top-[-6rem] right-[-4rem] w-[20rem] h-[20rem] bg-yellow-400/20 blur-3xl rounded-full"></div>
      <div className="absolute bottom-[-6rem] left-[-4rem] w-[20rem] h-[20rem] bg-blue-300/30 blur-3xl rounded-full"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-[95%] sm:w-[420px] bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20 text-center"
      >
        <div className="text-[3.5rem] text-yellow-400 mb-2">♾️</div>
        <h1 className="text-3xl font-bold mb-6">Mot de passe oublié</h1>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <label className="text-sm">Adresse email</label>
          <div className="flex items-center bg-white/20 rounded-xl px-3 py-2 mt-1">
            <Mail className="w-5 h-5 mr-2 opacity-80" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent w-full outline-none placeholder-white/60"
              placeholder="votre@email.com"
            />
          </div>

          {message && <p className="text-green-300 text-sm">{message}</p>}
          {error && <p className="text-red-300 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-yellow-400 hover:bg-yellow-500 text-indigo-900 font-bold py-3 rounded-xl shadow-md transition flex justify-center"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Envoyer le lien"}
          </button>
        </form>

        <button
          onClick={() => navigate("/auth")}
          className="mt-6 text-sm text-yellow-300 hover:underline"
        >
          🔙 Retour à la connexion
        </button>
      </motion.div>

      <button
        onClick={() => navigate("/")}
        className="absolute top-8 left-8 flex items-center gap-2 text-white hover:text-yellow-300 transition-all"
      >
        <ArrowLeft size={20} /> Accueil
      </button>
    </div>
  );
}
