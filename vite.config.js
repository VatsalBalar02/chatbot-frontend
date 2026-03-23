// vite.config.js

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // ─── Proxy ───────────────────────────────────────────────────────────
    // Forwards all /api/* requests from the Vite dev server (port 5173)
    // to the Express backend (port 3001).
    // Without this, /api/reports/xxx.pdf is handled by Vite (React router)
    // instead of Express — causing a blank page instead of a download.
    proxy: {
      "/api": {
        target: "http://192.168.1.145:3001",
        changeOrigin: true,
      },
    },
  },
});
