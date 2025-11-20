export default function Navbar() {
  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 text-2xl font-bold text-indigo-600">
        <span className="text-3xl">♾️</span>
        <span>PayLink</span>
      </div>

      <ul className="hidden md:flex items-center gap-8 font-medium text-gray-700">
        <li><a href="#" className="hover:text-indigo-600">Accueil</a></li>
        <li><a href="#" className="hover:text-indigo-600">Wallets</a></li>
        <li><a href="#" className="hover:text-indigo-600">Transferts</a></li>
        <li><a href="#" className="hover:text-indigo-600">FX</a></li>
        <li><a href="#" className="hover:text-indigo-600">Compte</a></li>
      </ul>

      <div className="flex gap-3">
        <button className="px-4 py-2 rounded-lg border border-indigo-600 text-indigo-600 hover:bg-indigo-50">
          Connexion
        </button>
        <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          Créer un compte
        </button>
      </div>
    </nav>
  );
}
