import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,

    allowedHosts: [
      ".trycloudflare.com",
    ],

    proxy: {
      "/token": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
"/search-machine-image": {
  target: "http://127.0.0.1:3001",
  changeOrigin: true,
},
      "/live-viewers": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },

      "/start-recording": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },

      "/stop-recording": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },

      "/admin-stop-live": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },

      "/highlight-status": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },

      "/delete-highlight": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },

      "/delete-replay": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
});