import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  ArrowLeft,
  Loader2,
  Phone,
  Globe,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getRoleDashboardPath } from "@/utils/roleRoutes";



const API_URL = import.meta.env.VITE_API_URL;
export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const navigate = useNavigate();

  // ✅ Vérifie le token existant → redirection auto
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const storedRole = localStorage.getItem("role") || "client";
      navigate(getRoleDashboardPath(storedRole));
    }
  }, [navigate]);

  // ✅ Charger les pays depuis le backend
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(`${API_URL}/api/countries/`);
        if (!res.ok) throw new Error("Erreur de chargement des pays");
        const data = await res.json();
        setCountries(data.countries || data); // compatibilité deux formats
      } catch (err) {
        console.error("Erreur chargement pays:", err);
      }
    };
    fetchCountries();
  }, []);

  const toggleMode = () => {
    setError("");
    setIsLogin(!isLogin);
  };

  const handleChange = (e) => setSelectedCountry(e.target.value);

  // 🔹 LOGIN HANDLER
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur de connexion");

      localStorage.setItem("token", data.token || data.access_token);

      const userRole = data.role || data.user?.role || "client";
      localStorage.setItem("role", userRole);

      const userPayload =
        data.user ||
        {
          user_id: data.user_id,
          full_name: data.full_name,
          role: userRole,
        };
      localStorage.setItem("user", JSON.stringify(userPayload));

      toast.success(`🎉 Bienvenue ${userPayload.full_name || ""}`);
      navigate(getRoleDashboardPath(userRole));

    } catch (err) {
      setError(err.message);
      toast.error("Erreur de connexion : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 REGISTER HANDLER
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const full_name = e.target.full_name.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const phone = e.target.phone.value;

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name,
          email,
          password,
          phone_e164: phone,
          country_code: selectedCountry,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur d’inscription");

      localStorage.setItem("token", data.token || data.access_token);
      const userRole = data.role || data.user?.role || "client";
      localStorage.setItem("role", userRole);
      localStorage.setItem("user", JSON.stringify(data.user || {}));

      toast.success(`Bienvenue ${data.user?.full_name || full_name} 🎉`);
      navigate(getRoleDashboardPath(userRole));
    } catch (err) {
      console.error("Erreur d'inscription :", err);
      toast.error("Erreur d'inscription : " + err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🧱 UI principale
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-700 via-blue-600 to-sky-500 text-white relative overflow-hidden">
      {/* 🌈 Halo décoratif */}
      <div className="absolute top-[-6rem] right-[-4rem] w-[20rem] h-[20rem] bg-yellow-400/20 blur-3xl rounded-full"></div>
      <div className="absolute bottom-[-6rem] left-[-4rem] w-[20rem] h-[20rem] bg-blue-300/30 blur-3xl rounded-full"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-[95%] sm:w-[420px] bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20 text-center"
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
          className="text-[4rem] text-yellow-400 mb-2"
        >
          ♾️
        </motion.div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-8">PayLink</h1>

        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="text-2xl font-semibold mb-6">Connexion</h2>
              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div>
                  <label className="text-sm">Email</label>
                  <div className="flex items-center bg-white/20 rounded-xl px-3 py-2 mt-1">
                    <Mail className="w-5 h-5 mr-2 opacity-80" />
                    <input
                      type="email"
                      name="email"
                      required
                      className="bg-transparent w-full outline-none placeholder-white/60"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm">Mot de passe</label>
                  <div className="flex items-center bg-white/20 rounded-xl px-3 py-2 mt-1">
                    <Lock className="w-5 h-5 mr-2 opacity-80" />
                    <input
                      type="password"
                      name="password"
                      required
                      className="bg-transparent w-full outline-none placeholder-white/60"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-300 text-sm text-center mt-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 bg-yellow-400 hover:bg-yellow-500 text-indigo-900 font-bold py-3 rounded-xl shadow-md transition-all flex justify-center"
                >
                  {loading ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    "Se connecter"
                  )}
                </button>
              </form>

              <p className="mt-6 text-sm opacity-80">
                Pas encore de compte ?{" "}
                <button
                  onClick={toggleMode}
                  className="text-yellow-300 hover:underline font-semibold"
                >
                  Créez-en un
                </button>
              </p>
            </motion.div>
          ) : (
            // … ton formulaire d’inscription (inchangé)
            <></>
          )}
        </AnimatePresence>
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



