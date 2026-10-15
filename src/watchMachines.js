import { Capacitor } from "@capacitor/core";
import { onSnapshot } from "firebase/firestore";
import {
  getFirestore,
  collection,
  getDocs,
} from "firebase/firestore/lite";

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

    try {
      const snapshot = await getDocs(machinesRef);

      if (!stopped) {
        onData(snapshot);
      }
    } catch (error) {
      if (!stopped) {
        onError(error);
        retryTimer = setTimeout(loadMachines, 10000);
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