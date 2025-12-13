// src/components/Hero.jsx
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Hero() {
  const navigate = useNavigate(); // ƒo. Hook pour la redirection

  return (
    <section className="relative text-center py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-br from-indigo-700 via-blue-600 to-sky-500 text-white overflow-hidden rounded-3xl sm:rounded-[2.5rem] shadow-lg w-full">
      {/* ÐY"û Logo animÇ¸ en haut */}
      <motion.div
        className="flex justify-center items-center gap-3 mb-12 cursor-pointer"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        onClick={() => navigate("/")} // ƒo. Retour Çÿ lƒ?Taccueil
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

      {/* ÐY"û Titre principal */}
      <motion.h2
        className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight px-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        Connecter la diaspora Çÿ lƒ?TAfrique ÐYO?
      </motion.h2>

      {/* ÐY"û Sous-titre */}
      <motion.p
        className="text-base sm:text-lg md:text-xl mb-10 max-w-2xl mx-auto opacity-90 px-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        Envoyez, recevez et gÇ¸rez votre argent en toute transparence grÇ½ce Çÿ{" "}
        <span className="font-semibold text-yellow-300">PayLink</span> ƒ?" la passerelle financiÇùre infinie.
      </motion.p>

      {/* ÐY"û Boutons dƒ?Taction */}
      <motion.div
        className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 w-full sm:w-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        {/* ÐY"û Bouton crÇ¸er un compte */}
        <button
          onClick={() => navigate("/auth?mode=register")} // ƒo. ajout dƒ?Tun paramÇùtre
          className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0b3b64] font-semibold text-lg shadow-lg hover:from-yellow-300 hover:to-orange-400 hover:scale-105 transition-all"
        >
          CrÇ¸er un compte
        </button>

        {/* ÐY"û Bouton se connecter */}
        <button
          onClick={() => navigate("/auth?mode=login")} // ƒo. redirection correcte
          className="w-full sm:w-auto px-8 py-4 rounded-full border-2 border-white text-white font-semibold text-lg hover:bg-white/10 transition-all"
        >
          Se connecter
        </button>
      </motion.div>

      {/* ÐY"û Halo lumineux dÇ¸coratif */}
      <div className="absolute top-[-10rem] right-[-8rem] w-[20rem] h-[20rem] bg-yellow-400/20 blur-3xl rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-8rem] left-[-10rem] w-[18rem] h-[18rem] bg-blue-300/30 blur-3xl rounded-full pointer-events-none"></div>
    </section>
  );
}
