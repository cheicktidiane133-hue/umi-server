import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, requestAgoraToken } from "./umiAgora";
import { auth } from "./firebase";
import "./AdminLivePreview.css";

const API_URL =
  import.meta.env.VITE_UMI_API_URL ||
  "https://umi-server.onrender.com";

export default function AdminLivePreview({ live }) {
  const videoRef = useRef(null);
  const roomRef = useRef(null);
  const audioTracksRef = useRef(new Set());
  const audioElementsRef = useRef(new Map());
  const audioEnabledRef = useRef(false);

  const [status, setStatus] = useState(
    "Connexion au direct…"
  );
  const [connected, setConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const liveId = live?.id;
  const roomName = live?.roomName;

  const stopAudio = () => {
    audioElementsRef.current.forEach((element, track) => {
      element.pause();
      track.detach(element);
      element.remove();
    });

    audioElementsRef.current.clear();
  };

  useEffect(() => {
    let disposed = false;
    let room = null;

    const controller = new AbortController();
    const tracks = new Set();
    const elements = new Map();

    audioTracksRef.current = tracks;
    audioElementsRef.current = elements;
    audioEnabledRef.current = false;

    setConnected(false);
    setAudioEnabled(false);
    setStatus("Connexion au direct…");

    const attachAudio = async (track) => {
      if (disposed || elements.has(track)) return;

      const element = track.attach();

      element.autoplay = true;
      elements.set(track, element);

      try {
        await element.play();
      } catch {
        if (!disposed) {
          setStatus("Réessayez d’activer le son.");
        }
      }
    };

    const attachTrack = (track) => {
      if (disposed) return;

      if (track.kind === "video" && videoRef.current) {
        track.attach(videoRef.current);
        setStatus("");
      }

      if (track.kind === "audio") {
        tracks.add(track);

        if (audioEnabledRef.current) {
          void attachAudio(track);
        }
      }
    };

    const connect = async () => {
      try {
        if (!liveId || !roomName) {
          throw new Error("Salle du live introuvable.");
        }

        if (!auth.currentUser) {
          throw new Error(
            "Reconnectez-vous au compte administrateur."
          );
        }

        const data = await requestAgoraToken(API_URL, liveId, "audience", controller.signal, true);
        if (disposed) return;

        room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        room.on(
          RoomEvent.TrackSubscribed,
          attachTrack
        );

        room.on(
          RoomEvent.TrackUnsubscribed,
          (track) => {
            track.detach();
            tracks.delete(track);

            const element = elements.get(track);

            if (element) {
              element.pause();
              element.remove();
              elements.delete(track);
            }
          }
        );

        room.on(RoomEvent.Disconnected, () => {
          if (disposed) return;

          elements.forEach((element, track) => {
            element.pause();
            track.detach(element);
            element.remove();
          });

          elements.clear();
          audioEnabledRef.current = false;

          setConnected(false);
          setAudioEnabled(false);
          setStatus("Direct terminé.");
        });

        await room.connect(data);

        if (disposed) {
          await room.disconnect();
          return;
        }

        setConnected(true);
        setStatus("Caméra du présentateur en attente…");

        room.remoteParticipants.forEach(
          (participant) => {
            participant.trackPublications.forEach(
              (publication) => {
                if (publication.track) {
                  attachTrack(publication.track);
                }
              }
            );
          }
        );
      } catch (error) {
        if (room) {
          try {
            await room.disconnect();
          } catch {
            // La salle peut être déjà fermée.
          }
        }

        if (!disposed && error?.name !== "AbortError") {
          setConnected(false);
          setStatus(
            error?.message || "Aperçu indisponible."
          );
        }
      }
    };

    void connect();

    return () => {
      disposed = true;
      controller.abort();

      elements.forEach((element, track) => {
        element.pause();
        track.detach(element);
        element.remove();
      });

      elements.clear();
      tracks.clear();

      if (roomRef.current === room) {
        roomRef.current = null;
      }

      if (room) {
        Promise.resolve(room.disconnect()).catch(
          () => {}
        );
      }
    };
  }, [liveId, roomName]);

  const toggleAudio = async () => {
    if (!connected) return;

    if (audioEnabledRef.current) {
      audioEnabledRef.current = false;
      stopAudio();
      setAudioEnabled(false);
      return;
    }

    if (audioTracksRef.current.size === 0) {
      setStatus(
        "Le présentateur ne diffuse pas encore de son."
      );
      return;
    }

    audioEnabledRef.current = true;
    setAudioEnabled(true);

    let failed = false;

    for (const track of audioTracksRef.current) {
      if (audioElementsRef.current.has(track)) continue;

      const element = track.attach();

      element.autoplay = true;
      audioElementsRef.current.set(track, element);

      try {
        await element.play();
      } catch {
        failed = true;
      }
    }

    if (failed) {
      audioEnabledRef.current = false;
      stopAudio();
      setAudioEnabled(false);
      setStatus("Réessayez d’activer le son.");
    }
  };

  return (
    <div className="umi-admin-live-preview">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
      />

      {live?.presenterMedia?.type === "image" &&
        live.presenterMedia.url && (
          <img
            src={live.presenterMedia.url}
            alt="Photo présentée pendant le live"
          />
        )}

      {status && (
        <span
          className="umi-admin-preview-status"
          role="status"
        >
          {status}
        </span>
      )}

      <button
        type="button"
        className="umi-admin-preview-audio"
        onClick={toggleAudio}
        disabled={!connected}
        aria-pressed={audioEnabled}
      >
        {audioEnabled
          ? "🔊 Couper le son"
          : "🔇 Activer le son"}
      </button>
    </div>
  );
}