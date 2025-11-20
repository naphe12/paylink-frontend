export default function Footer() {
  return (
    <footer className="py-6 text-center text-gray-500 border-t border-gray-200">
      <p>© {new Date().getFullYear()} PayLink — Tous droits réservés.</p>
      <p className="text-sm mt-1">Développé avec ❤️ pour la diaspora.</p>
    </footer>
  );
}
