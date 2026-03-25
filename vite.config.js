import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const buildTime = process.env.VITE_BUILD_TIME || new Date().toISOString();
const releaseSha =
  process.env.VITE_RELEASE_SHA ||
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  "";
const appVersion = process.env.VITE_APP_VERSION || process.env.npm_package_version || "0.0.0";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
    "import.meta.env.VITE_BUILD_TIME": JSON.stringify(buildTime),
    "import.meta.env.VITE_RELEASE_SHA": JSON.stringify(releaseSha),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
    host: "127.0.0.1",
  },
});
