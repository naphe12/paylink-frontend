import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';  // ✅ Nécessaire pour path.resolve

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),  // ✅ alias @ → dossier src
    },
  },
  server: {
    port: 5173,               // 🌐 ton port local
    open: true,               // ouvre automatiquement le navigateur
    host: '127.0.0.1',        // pour être compatible avec ton backend FastAPI
  },
});
