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

  const getCountryCode = (c) =>
    (c?.alpha2 || c?.code || c?.iso2 || "").toUpperCase();

  // Redirige si un token existe déjà
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const storedRole = localStorage.getItem("role") || "client";
      navigate(getRoleDashboardPath(storedRole));
    }
  }, [navigate]);

  // Charge la liste des pays pour l'inscription
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(`${API_URL}/api/countries/`);
        if (!res.ok) throw new Error("Erreur de chargement des pays");
        const data = await res.json();
        const list = data.countries || data;
        setCountries(list);
        if (!selectedCountry && Array.isArray(list) && list.length) {
          const code = getCountryCode(list[0]);
          if (code) setSelectedCountry(code);
        }
      } catch (err) {
        console.error("Erreur chargement pays:", err);
      }
    };
    fetchCountries();
  }, []);

  const toggleMode = () => {
    setError("");
    setIsLogin((prev) => !prev);
  };

  const handleCountryChange = (e) =>
    setSelectedCountry((e.target.value || "").toUpperCase());

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

      toast.success(`Bienvenue ${userPayload.full_name || ""}`);
      navigate(getRoleDashboardPath(userRole));
    } catch (err) {
      setError(err.message);
      toast.error("Erreur de connexion : " + err.message);
    } finally {
      setLoading(false);
    }
  };

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
      if (!res.ok) throw new Error(data.detail || "Erreur d'inscription");

      localStorage.setItem("token", data.token || data.access_token);
      const userRole = data.role || data.user?.role || "client";
      localStorage.setItem("role", userRole);
      localStorage.setItem("user", JSON.stringify(data.user || {}));

      toast.success(`Bienvenue ${data.user?.full_name || full_name}`);
      navigate(getRoleDashboardPath(userRole));
    } catch (err) {
      console.error("Erreur d'inscription :", err);
      toast.error("Erreur d'inscription : " + err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-700 via-blue-600 to-sky-500 text-white relative overflow-hidden">
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
          💫
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
                      placeholder="Votre mot de passe"
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
            <motion.div
              key="register"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="text-2xl font-semibold mb-6">Créer un compte</h2>
              <form onSubmit={handleRegister} className="space-y-4 text-left">
                <div>
                  <label className="text-sm">Nom complet</label>
                  <div className="flex items-center bg-white/20 rounded-xl px-3 py-2 mt-1">
                    <User className="w-5 h-5 mr-2 opacity-80" />
                    <input
                      type="text"
                      name="full_name"
                      required
                      className="bg-transparent w-full outline-none placeholder-white/60"
                      placeholder="Votre nom"
                    />
                  </div>
                </div>

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
                  <label className="text-sm">Téléphone</label>
                  <div className="flex items-center bg-white/20 rounded-xl px-3 py-2 mt-1">
                    <Phone className="w-5 h-5 mr-2 opacity-80" />
                    <input
                      type="tel"
                      name="phone"
                      required
                      className="bg-transparent w-full outline-none placeholder-white/60"
                      placeholder="+2577xxxxxxx"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm">Pays</label>
                  <div className="flex items-center bg-white/20 rounded-xl px-3 py-2 mt-1">
                    <Globe className="w-5 h-5 mr-2 opacity-80" />
                    <select
                      name="country"
                      value={selectedCountry}
                      onChange={handleCountryChange}
                      required
                      className="bg-transparent w-full outline-none text-white placeholder-white/60 appearance-none"
                    >
                      <option value="" disabled className="text-indigo-900">
                        Choisir un pays
                      </option>
                      {countries.map((c) => (
                        <option
                          key={getCountryCode(c) || c.name}
                          value={getCountryCode(c)}
                          className="text-indigo-900"
                        >
                          {c.name || c.caption || c.code}
                        </option>
                      ))}
                    </select>
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
                      placeholder="Votre mot de passe"
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
                    "Créer mon compte"
                  )}
                </button>
              </form>

              <p className="mt-6 text-sm opacity-80 text-center">
                Vous avez déjà un compte ?{" "}
                <button
                  onClick={toggleMode}
                  className="text-yellow-300 hover:underline font-semibold"
                >
                  Se connecter
                </button>
              </p>
            </motion.div>
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
