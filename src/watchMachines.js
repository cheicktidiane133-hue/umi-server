import { Capacitor } from "@capacitor/core";
import { onSnapshot } from "firebase/firestore";
import {
  getFirestore,
  collection,
  getDocs,
} from "firebase/firestore/lite";
function showMachinesDiagnostic(message) {
  let panel = document.getElementById("umi-machines-diagnostic");

  if (!panel) {
    panel = document.createElement("div");
    panel.id = "umi-machines-diagnostic";

    Object.assign(panel.style, {
      position: "fixed",
      top: "110px",
      left: "10px",
      right: "10px",
      zIndex: "2147483647",
      padding: "12px",
      background: "#d1ecf1",
      color: "#000",
      fontSize: "14px",
      whiteSpace: "pre-wrap",
      pointerEvents: "none",
    });

    document.body.appendChild(panel);
  }

  panel.textContent = message;
}
export function watchMachines(reference, onData, onError) {
  if (Capacitor.getPlatform() !== "ios") {
    return onSnapshot(reference, onData, onError);
  }

  let stopped = false;
  let loading = false;
  let retryTimer;

  const directDb = getFirestore(reference.firestore.app);
  const machinesRef = collection(directDb, reference.path);

    async function loadMachines() {
    if (stopped || loading) return;

    loading = true;

    showMachinesDiagnostic(
      "Machines V2 : requête REST en cours…"
    );

    try {
      const snapshot = await getDocs(machinesRef);

      if (!stopped) {
        showMachinesDiagnostic(
          `Machines V2 : ${snapshot.size} reçues, transmission à App…`
        );

        onData(snapshot);

        showMachinesDiagnostic(
          `Machines V2 : ${snapshot.size} transmises à App.`
        );
      }
    } catch (error) {
      if (!stopped) {
        showMachinesDiagnostic(
          `Machines V2 : erreur\n${error.code || ""}\n${
            error.message || String(error)
          }`
        );

        retryTimer = setTimeout(loadMachines, 10000);
        onError(error);
      }
    } finally {
      loading = false;
    }
  }
  function handleVisibility() {
    if (document.visibilityState === "visible") {
      clearTimeout(retryTimer);
      loadMachines();
    }
  }

  loadMachines();

  document.addEventListener(
    "visibilitychange",
    handleVisibility
  );

  return () => {
    stopped = true;
    clearTimeout(retryTimer);

    document.removeEventListener(
      "visibilitychange",
      handleVisibility
    );
  };
}