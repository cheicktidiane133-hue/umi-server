import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import "./UmiNavigation.css";

import App from "./App.jsx";

import {
  UmiDialogProvider,
} from "./UmiDialogProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <UmiDialogProvider>
      <Suspense fallback={<div role="status" style={{ padding: "24px", textAlign: "center", color: "#163a5c" }}>Chargement UMI…</div>}>
        <App />
      </Suspense>
    </UmiDialogProvider>
  </StrictMode>
);