import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, mergeConfig } from "vite";

// Préserve la configuration originale (React, alias, build, etc.).
export default defineConfig(async (environment) => {
  const original = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs", "vite.config.cjs", "vite.config.cts"]
    .map((name) => resolve(name)).find(existsSync);
  const { loadConfigFromFile } = await import("vite");
  const loaded = original ? await loadConfigFromFile(environment, original) : null;
  const proxy = {
    "/umi-api": {
      target: "http://127.0.0.1:3001", changeOrigin: true,
      rewrite: (path) => path.replace(/^\/umi-api(?=\/|$)/, ""),
      configure(server) {
        server.on("error", (error, req, res) => {
          console.error("Serveur UMI inaccessible :", error.code);
          if (res && typeof res.writeHead === "function" && !res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ error: "Le serveur Node UMI est arrêté. Lancez node server.js sur le port 3001." }));
          }
        });
      },
    },
  };
  return mergeConfig(loaded?.config || {}, {
    server: { host: "127.0.0.1", port: 5173, strictPort: true, proxy,
      // Ce mode est réservé au test via les tunnels Cloudflare.
      allowedHosts: [".trycloudflare.com", "localhost", "127.0.0.1"] },
  });
});
