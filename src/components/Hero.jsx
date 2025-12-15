// src/components/Hero.jsx
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Hero() {
  const navigate = useNavigate(); // Hook pour la redirection

  return (
    <section className="relative text-center py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-br from-indigo-700 via-blue-600 to-sky-500 text-white overflow-hidden rounded-3xl sm:rounded-[2.5rem] shadow-lg w-full">
      {/* Logo animé en haut */}
      <motion.div
        className="flex justify-center items-center gap-3 mb-12 cursor-pointer"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        onClick={() => navigate("/")} // Retour à l’accueil
      >
        <motion.span
          animate={{ rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
          className="inline-flex h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] items-center justify-center rounded-2xl bg-white text-indigo-800 text-2xl sm:text-3xl font-extrabold shadow-lg"
        >
          PL
        </motion.span>
        <h1 className="text-[2.5rem] sm:text-[3rem] md:text-[3.5rem] font-extrabold tracking-tight">
          PayLink
        </h1>
      </motion.div>

      {/* Titre principal */}
      <motion.h2
        className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight px-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        Connecter la diaspora à l’Afrique 🌍
      </motion.h2>

      {/* Sous-titre */}
      <motion.p
        className="text-base sm:text-lg md:text-xl mb-10 max-w-2xl mx-auto opacity-90 px-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        Envoyez, recevez et gérez votre argent en toute transparence grâce à{" "}
        <span className="font-semibold text-yellow-300">PayLink</span>, la passerelle financière infinie.
      </motion.p>

      {/* Boutons d’action */}
      <motion.div
        className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 w-full sm:w-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        {/* Bouton créer un compte */}
        <button
          onClick={() => navigate("/auth?mode=register")} // ajout d’un paramètre
          className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0b3b64] font-semibold text-lg shadow-lg hover:from-yellow-300 hover:to-orange-400 hover:scale-105 transition-all"
        >
          Créer un compte
        </button>

        {/* Bouton se connecter */}
        <button
          onClick={() => navigate("/auth?mode=login")} // redirection correcte
          className="w-full sm:w-auto px-8 py-4 rounded-full border-2 border-white text-white font-semibold text-lg hover:bg-white/10 transition-all"
        >
          Se connecter
        </button>
      </motion.div>

      {/* Halo lumineux décoratif */}
      <div className="absolute top-[-10rem] right-[-8rem] w-[20rem] h-[20rem] bg-yellow-400/20 blur-3xl rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-8rem] left-[-10rem] w-[18rem] h-[18rem] bg-blue-300/30 blur-3xl rounded-full pointer-events-none"></div>
    </section>
  );
}
