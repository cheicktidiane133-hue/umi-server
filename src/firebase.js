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

/* FIRESTORE */
export const db =
  Capacitor.getPlatform() === "ios"
    ? initializeFirestore(app, {
        experimentalForceLongPolling: true,
        useFetchStreams: false,
      })
    : getFirestore(app);

/* AUTHENTIFICATION */
export const auth = getAuth(app);

/* STOCKAGE */
export const storage = getStorage(app);