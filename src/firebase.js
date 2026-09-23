import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";

import { getAuth } from "firebase/auth";


const firebaseConfig = {

  apiKey: "AIzaSyCLTjKVEpg-3PY3EoC8T5x01R2-CaOfCEM",

  authDomain: "umi1-12066.firebaseapp.com",

  projectId: "umi1-12066",

  storageBucket: "umi1-12066.firebasestorage.app",

  messagingSenderId: "472979263953",

  appId: "1:472979263953:web:607abedf2d36b1cdaad0f0"

};


const app =
  initializeApp(firebaseConfig);


/* =========================
   FIRESTORE
========================= */

export const db =
  getFirestore(app);


/* =========================
   AUTHENTICATION
========================= */

export const auth =
  getAuth(app);