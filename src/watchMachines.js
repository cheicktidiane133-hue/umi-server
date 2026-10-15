import { Capacitor } from "@capacitor/core";
import { onSnapshot } from "firebase/firestore";
import {
  getFirestore,
  collection,
  getDocs,
} from "firebase/firestore/lite";

export function watchMachines(reference, onData, onError) {
  let stopped = false;
  let serverResponded = false;
  let timer;
  let fallbackDelivered = false;

  const unsubscribe = onSnapshot(
    reference,
    (snapshot) => {
      if (stopped) return;

      if (!snapshot.metadata.fromCache) {
        serverResponded = true;
        clearTimeout(timer);
      }

      // Ne pas remplacer les données reçues par REST
      // par une ancienne réponse provenant du cache.
      if (fallbackDelivered && snapshot.metadata.fromCache) {
        return;
      }

      onData(snapshot);
    },
    (error) => {
      if (!stopped) onError(error);
    }
  );

  if (Capacitor.getPlatform() === "ios") {
    timer = setTimeout(async () => {
      if (stopped || serverResponded) return;

      try {
        const directDb = getFirestore(reference.firestore.app);

        const snapshot = await getDocs(
          collection(directDb, reference.path)
        );

        if (!stopped && !serverResponded) {
          fallbackDelivered = true;
          onData(snapshot);
        }
      } catch (error) {
        if (!stopped && !serverResponded) {
          onError(error);
        }
      }
    }, 8000);
  }

  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribe();
  };
}