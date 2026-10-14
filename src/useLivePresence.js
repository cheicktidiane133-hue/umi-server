import { useEffect } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// Chaque live UMI envoie son signal de présence toutes les 20 secondes.
export default function useLivePresence(liveId, enabled, roomRef) {
  useEffect(() => {
    if (!liveId || !enabled) return;
    const reference = doc(db, "live", liveId);
    let disposed = false;
    let writing = false;
    const heartbeat = async () => {
      if (disposed || writing || roomRef.current?.state !== "connected") return;
      writing = true;
      try {
        await setDoc(reference, { presenterLastSeenAt: serverTimestamp() }, { merge: true });
      } catch (error) {
        console.error("Présence du présentateur :", error);
      } finally { writing = false; }
    };
    heartbeat();
    const timer = setInterval(heartbeat, 20000);
    return () => {
      disposed = true;
      clearInterval(timer);
      // La fermeture de la page ne dépend pas de la création du temps fort.
      setDoc(reference, { isLive: false, stoppedAt: serverTimestamp() }, { merge: true })
        .catch((error) => console.error("Fin du live :", error));
    };
  }, [liveId, enabled, roomRef]);
}
