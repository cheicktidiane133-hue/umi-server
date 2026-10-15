import { initializeApp } from "firebase/app";

import {
  getFirestore,
  initializeFirestore,
} from "firebase/firestore";

import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { Capacitor } from "@capacitor/core";

const firebaseConfig = {
  apiKey: "AIzaSyCLTjKVEpg-3PY3EoC8T5x01R2-CaOfCEM",
  authDomain: "umi1-12066.firebaseapp.com",
  projectId: "umi1-12066",
  storageBucket: "umi1-12066.firebasestorage.app",
  messagingSenderId: "472979263953",
  appId: "1:472979263953:web:607abedf2d36b1cdaad0f0",
};

const app = initializeApp(firebaseConfig);

/* FIRESTORE — test de connexion adapté à iOS */
export const db =
  Capacitor.getPlatform() === "ios"
    ? initializeFirestore(app, {
        experimentalForceLongPolling: true,
      })
    : getFirestore(app);

/* AUTHENTIFICATION */
export const auth = getAuth(app);

/* STOCKAGE */
export const storage = getStorage(app);
/* Diagnostic temporaire iOS */
if (Capacitor.getPlatform() === "ios") {
  const diagnostic = document.createElement("div");

  Object.assign(diagnostic.style, {
    position: "fixed",
    bottom: "100px",
    left: "10px",
    right: "10px",
    zIndex: "2147483647",
    padding: "12px",
    background: "#fff3cd",
    color: "#000",
    fontSize: "13px",
    whiteSpace: "pre-wrap",
    pointerEvents: "none",
  });

  diagnostic.textContent = "Diagnostic : connexion Firestore…";
  document.body.appendChild(diagnostic);

   const timer = setTimeout(async () => {
    diagnostic.textContent =
      "Firestore sans réponse. Test réseau direct…";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const url =
        "https://firestore.googleapis.com/v1/projects/" +
        firebaseConfig.projectId +
        "/databases/(default)/documents/machines" +
        "?pageSize=1&key=" +
        encodeURIComponent(firebaseConfig.apiKey);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      const data = await response.json();

      diagnostic.textContent = response.ok
        ? `Réseau direct OK : ${data.documents?.length || 0} machine reçue.`
        : `Erreur HTTP ${response.status}\n${data.error?.message || ""}`;
    } catch (error) {
      diagnostic.textContent =
        `Échec réseau direct : ${error.name}\n${error.message}`;
    } finally {
      clearTimeout(timeout);
    }
  }, 30000);

  import("firebase/firestore").then(async ({
    collection,
    query,
    limit,
    getDocsFromServer,
  }) => {
    try {
      const result = await getDocsFromServer(
        query(collection(db, "machines"), limit(1))
      );

      clearTimeout(timer);
      diagnostic.textContent =
        `Diagnostic : serveur accessible, ${result.size} machine reçue.`;
    } catch (error) {
      clearTimeout(timer);
      diagnostic.textContent =
        `Diagnostic : ${error.code || ""}\n${error.message}`;
    }
  });
}