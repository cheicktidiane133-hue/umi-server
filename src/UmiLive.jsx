import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent } from "livekit-client";

import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";
import "./UmiLive.css";


/* ========================================
   SERVEUR BACKEND UMI
======================================== */

const API_URL =
  "https://umi-server.onrender.com";


/* ========================================
   LIVE EN DIRECT
======================================== */

function LiveCard({
  live,
  onOpen,
  focused = false,
  onClose,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const roomRef = useRef(null);
  const messageInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [error, setError] = useState("");

  const [spectatorCount, setSpectatorCount] = useState(0);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatError, setChatError] = useState("");

  const [selectedMessage, setSelectedMessage] = useState(null);


  /* ========================================
     COMMENTAIRES FIRESTORE
  ======================================== */

  useEffect(() => {
    if (!live.id) {
      return;
    }

    const messagesRef = collection(
      db,
      "live",
      live.id,
      "questions"
    );

    const unsubscribe = onSnapshot(
      messagesRef,

      (snapshot) => {
        const list = snapshot.docs.map((messageDoc) => ({
          id: messageDoc.id,
          ...messageDoc.data(),
        }));

        list.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;

          return aTime - bTime;
        });

        setMessages(list);
        setChatError("");
      },

      (firestoreError) => {
        console.error(
          "Erreur commentaires :",
          firestoreError
        );

        setChatError(
          "Impossible de charger les commentaires."
        );
      }
    );

    return () => unsubscribe();
  }, [live.id]);


  /* ========================================
     SCROLL COMMENTAIRES
  ======================================== */

  useEffect(() => {
    if (
      focused &&
      chatEndRef.current &&
      !selectedMessage
    ) {
      chatEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [messages, focused, selectedMessage]);


  /* ========================================
     UTILISATEUR
  ======================================== */

  const getCurrentUser = () => {
    try {
      const saved =
        localStorage.getItem("umiCurrentUser");

      if (!saved) {
        return null;
      }

      return JSON.parse(saved);
    } catch {
      return null;
    }
  };


  /* ========================================
     RÉPONDRE À UN COMMENTAIRE
  ======================================== */

  const selectMessageToReply = (item) => {
    setSelectedMessage(item);

    try {
      messageInputRef.current?.focus({
        preventScroll: true,
      });
    } catch {
      messageInputRef.current?.focus();
    }
  };


  /* ========================================
     ENVOYER COMMENTAIRE
  ======================================== */

  const sendMessage = async () => {
    const cleanMessage = message.trim();

    if (
      !cleanMessage ||
      sendingMessage ||
      !live.id
    ) {
      return;
    }

    try {
      setSendingMessage(true);
      setChatError("");

      const currentUser = getCurrentUser();

      await addDoc(
        collection(
          db,
          "live",
          live.id,
          "questions"
        ),
        {
          text: cleanMessage,

          userId:
            currentUser?.userId || null,

          userName:
            currentUser?.nom ||
            currentUser?.name ||
            "Spectateur",

          senderRole: "spectator",

          liveId: live.id,

          liveType:
            live.liveType || "umi",

          roomName:
            live.roomName || "",

          replyToId:
            selectedMessage?.id || null,

          replyToText:
            selectedMessage?.text || null,

          replyToUserName:
            selectedMessage
              ? selectedMessage.senderRole === "presenter"
                ? "UMI"
                : selectedMessage.userName || "Spectateur"
              : null,

          createdAt: serverTimestamp(),

          answered: false,
        }
      );

      setMessage("");
      setSelectedMessage(null);
    } catch (sendError) {
      console.error(
        "Erreur envoi commentaire :",
        sendError
      );

      setChatError(
        "Impossible d'envoyer le commentaire."
      );
    } finally {
      setSendingMessage(false);
    }
  };


  /* ========================================
     TOUCHE ENTRÉE
  ======================================== */

  const handleMessageKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  };


  /* ========================================
     SPECTATEURS
  ======================================== */

  const updateSpectatorCount = (room) => {
    if (!room) {
      setSpectatorCount(0);
      return;
    }

    const remoteSpectators = Array.from(
      room.remoteParticipants.values()
    ).filter((participant) =>
      participant.identity?.startsWith("spectateur-")
    );

    const me =
      room.localParticipant?.identity?.startsWith(
        "spectateur-"
      )
        ? 1
        : 0;

    setSpectatorCount(
      remoteSpectators.length + me
    );
  };


  /* ========================================
     PISTES LIVEKIT
  ======================================== */

  const attachTrack = (track) => {
    if (!track) {
      return;
    }

    if (
      track.kind === "video" &&
      videoRef.current
    ) {
      track.attach(videoRef.current);
    }

    if (
      track.kind === "audio" &&
      audioRef.current
    ) {
      track.attach(audioRef.current);
    }
  };


  /* ========================================
     REJOINDRE LIVE
  ======================================== */

  const joinLive = async () => {
    if (
      isConnected ||
      isConnecting
    ) {
      return;
    }

    if (!live.roomName) {
      setError("Salle LIVE introuvable.");
      return;
    }

    try {
      setError("");
      setIsConnecting(true);

      const spectatorIdentity =
        `spectateur-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;

      const response = await fetch(
        `${API_URL}/token`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            identity: spectatorIdentity,
            role: "spectateur",
            roomName: live.roomName,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Impossible d'obtenir le token du spectateur."
        );
      }

      const data = await response.json();

      if (
        !data.token ||
        !data.url
      ) {
        throw new Error(
          "Informations LiveKit manquantes."
        );
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      room.on(
        RoomEvent.TrackSubscribed,
        (track) => {
          attachTrack(track);
        }
      );

      room.on(
        RoomEvent.ParticipantConnected,
        () => {
          updateSpectatorCount(room);
        }
      );

      room.on(
        RoomEvent.ParticipantDisconnected,
        () => {
          updateSpectatorCount(room);
        }
      );

      room.on(
        RoomEvent.Disconnected,
        () => {
          setIsConnected(false);
          setSpectatorCount(0);
        }
      );

      await room.connect(
        data.url,
        data.token
      );

      setIsConnected(true);

      updateSpectatorCount(room);

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
    } catch (err) {
      console.error(
        "Erreur connexion LIVE :",
        err
      );

      setError(
        err?.message ||
        "Impossible de rejoindre le LIVE."
      );

      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }

      setIsConnected(false);
      setSpectatorCount(0);
    } finally {
      setIsConnecting(false);
    }
  };


  /* ========================================
     NETTOYAGE
  ======================================== */

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);


  /* ========================================
     OUVRIR CARTE
  ======================================== */

  const handleVideoClick = () => {
    if (
      !focused &&
      onOpen
    ) {
      onOpen(live);
    }
  };


  /* ========================================
     PLAY
  ======================================== */

  const handlePlayClick = (event) => {
    event.stopPropagation();

    if (
      !focused &&
      onOpen
    ) {
      onOpen(live);
      return;
    }

    joinLive();
  };


  /* ========================================
     LIVE PLEIN ÉCRAN
  ======================================== */

  if (focused) {
    return (
      <div className="umi-tiktok-live">

        <div className="umi-live-background">

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={false}
            className="umi-live-background-video"
          />

          <audio
            ref={audioRef}
            autoPlay
          />

        </div>


        <div className="umi-live-dark-gradient" />


        <div className="umi-live-overlay-top">

          <div className="umi-live-top-left">

            <div className="umi-live-profile-circle">
              U
            </div>


            <div className="umi-live-profile-info">

              <strong>
                UMI LIVE
              </strong>

              <span>
                {live.machineName ||
                  live.productName ||
                  "Machine"}
              </span>

            </div>


            <div className="umi-live-red-badge">
              ● EN DIRECT
            </div>

          </div>


          <div className="umi-live-top-right">

            <div className="umi-live-viewers">
              👁 {spectatorCount}
            </div>


            {onClose && (
              <button
                type="button"
                className="umi-live-close"
                onClick={onClose}
              >
                ×
              </button>
            )}

          </div>

        </div>


        {error && (
          <div className="umi-live-overlay-error">
            {error}
          </div>
        )}


        {!isConnected && (
          <div className="umi-live-center-play">

            <button
              type="button"
              onClick={handlePlayClick}
              disabled={isConnecting}
            >
              {isConnecting
                ? "Connexion..."
                : "▶"}
            </button>

          </div>
        )}


        {isConnected && (
          <div className="umi-live-comments">

            {messages
              .slice(-8)
              .map((item) => {
                const isPresenter =
                  item.senderRole === "presenter";

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={
                      selectedMessage?.id === item.id
                        ? "umi-live-comment selected"
                        : "umi-live-comment"
                    }
                    onClick={() =>
                      selectMessageToReply(item)
                    }
                  >

                    <div className="umi-live-comment-avatar">
                      {isPresenter
                        ? "U"
                        : (
                            item.userName?.[0] || "S"
                          ).toUpperCase()}
                    </div>


                    <div className="umi-live-comment-content">

                      <strong>
                        {isPresenter
                          ? "UMI"
                          : item.userName ||
                            "Spectateur"}
                      </strong>


                      {item.replyToText && (
                        <div className="umi-live-replied-message">
                          ↩{" "}
                          {item.replyToUserName ||
                            "Spectateur"}
                          {" : "}
                          {item.replyToText}
                        </div>
                      )}


                      <span>
                        {item.text}
                      </span>

                    </div>

                  </button>
                );
              })}

            <div ref={chatEndRef} />

          </div>
        )}


        {chatError && (
          <div className="umi-live-chat-error">
            {chatError}
          </div>
        )}


        {isConnected && (
          <div className="umi-live-bottom">

            {selectedMessage && (
              <div className="umi-live-reply-preview">

                <div>

                  <strong>
                    Répondre à{" "}
                    {selectedMessage.senderRole ===
                    "presenter"
                      ? "UMI"
                      : selectedMessage.userName ||
                        "Spectateur"}
                  </strong>

                  <span>
                    {selectedMessage.text}
                  </span>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setSelectedMessage(null)
                  }
                >
                  ×
                </button>

              </div>
            )}


            <div className="umi-live-input-row">

              <input
                ref={messageInputRef}
                type="text"
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                onKeyDown={handleMessageKeyDown}
                placeholder={
                  selectedMessage
                    ? "Écris ta réponse..."
                    : "Saisis ton message..."
                }
                maxLength={300}
                disabled={sendingMessage}
                autoComplete="off"
              />


              <button
                type="button"
                className="umi-live-send-button"
                onClick={sendMessage}
                disabled={
                  sendingMessage ||
                  !message.trim()
                }
              >
                {sendingMessage
                  ? "…"
                  : "➤"}
              </button>

            </div>

          </div>
        )}

      </div>
    );
  }


  /* ========================================
     PETITE CARTE LIVE
  ======================================== */

  return (
    <article className="live-card">

      <div
        className="live-video-container"
        onClick={handleVideoClick}
      >

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="live-video"
        />


        <div className="live-badge">
          <span>●</span>
          EN DIRECT
        </div>


        <div className="live-play-overlay">

          <button
            type="button"
            className="live-play-button"
            onClick={handlePlayClick}
          >
            ▶
          </button>

        </div>

      </div>


      <div className="live-card-content">

        <h2>
          {live.title || "UMI LIVE"}
        </h2>


        <p className="live-machine-name">
          {live.machineName ||
            live.productName ||
            "Machine"}
        </p>


        <div className="live-actions">

          <button
            type="button"
            onClick={() =>
              onOpen?.(live)
            }
          >
            🔴 Voir le LIVE
          </button>

        </div>

      </div>

    </article>
  );
}


/* ========================================
   REPLAY / TEMPS FORTS
======================================== */

function ReplayCard({
  live,
  onOpen,
  focused = false,
}) {
  const hasHighlight =
    live.highlightPublished === true &&
    typeof live.highlightUrl === "string" &&
    live.highlightUrl.trim() !== "";

  const hasReplay =
    live.replayPublished === true &&
    typeof live.recordingUrl === "string" &&
    live.recordingUrl.trim() !== "";

  const [
    showFullReplay,
    setShowFullReplay,
  ] = useState(false);

  const showingHighlight =
    hasHighlight &&
    !showFullReplay;

  const videoUrl =
    showingHighlight
      ? live.highlightUrl
      : live.recordingUrl;

  const videoBadgeText =
    showingHighlight
      ? "TEMPS FORTS"
      : "REPLAY";

  return (
    <article className="live-card">

      <div
        className="live-video-container"
        onClick={() => {
          if (
            !focused &&
            onOpen
          ) {
            onOpen(live);
          }
        }}
      >

        <video
          key={videoUrl}
          src={videoUrl}
          controls={focused}
          playsInline
          preload="metadata"
          className="live-video"
        />


        <div className="live-badge replay-video-badge">
          <span>●</span>
          {videoBadgeText}
        </div>


        {!focused && (
          <div className="live-play-overlay">

            <button
              type="button"
              className="live-play-button"
              onClick={(event) => {
                event.stopPropagation();
                onOpen?.(live);
              }}
            >
              ▶
            </button>

          </div>
        )}

      </div>


      <div className="live-card-content">

        <h2>
          {live.title || "UMI LIVE"}
        </h2>


        <p className="live-machine-name">

          {live.liveType === "client"
            ? live.productName ||
              live.machineName ||
              "Produit"
            : live.machineName ||
              "Machine"}

        </p>


        {live.liveType === "client" &&
          live.price && (
            <p className="umi-live-price">
              {live.price}
            </p>
          )}


        {hasHighlight && hasReplay && (
          <div className="umi-replay-choice">

            <button
              type="button"
              className={
                showingHighlight
                  ? "umi-replay-choice-button active"
                  : "umi-replay-choice-button"
              }
              onClick={(event) => {
                event.stopPropagation();
                setShowFullReplay(false);
              }}
            >
              🔴 Temps forts
            </button>


            <button
              type="button"
              className={
                !showingHighlight
                  ? "umi-replay-choice-button active"
                  : "umi-replay-choice-button"
              }
              onClick={(event) => {
                event.stopPropagation();
                setShowFullReplay(true);
              }}
            >
              🔴 Replay
            </button>

          </div>
        )}


        {hasHighlight && !hasReplay && (
          <div className="umi-replay-choice">

            <button
              type="button"
              className="umi-replay-choice-button active"
              onClick={(event) => {
                event.stopPropagation();

                if (!focused) {
                  onOpen?.(live);
                }
              }}
            >
              🔴 Temps forts
            </button>

          </div>
        )}


        {hasReplay && !hasHighlight && (
          <div className="umi-replay-choice">

            <button
              type="button"
              className="umi-replay-choice-button active"
              onClick={(event) => {
                event.stopPropagation();

                if (!focused) {
                  onOpen?.(live);
                }
              }}
            >
              🔴 Replay
            </button>

          </div>
        )}

      </div>

    </article>
  );
}


/* ========================================
   LIVE À VENIR
======================================== */

function UpcomingLiveCard({
  live,
}) {
  const scheduledDate =
    live.scheduledAt?.toDate?.();

  if (!scheduledDate) {
    return null;
  }

  const isClient =
    live.liveType === "client";

  const formattedDate =
    scheduledDate.toLocaleDateString(
      "fr-FR",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

  const formattedTime =
    scheduledDate.toLocaleTimeString(
      "fr-FR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  return (
    <article className="live-card">

      <div className="upcoming-live-cover">

        <div>

          <div className="upcoming-live-icon">
            📅
          </div>

          <strong>
            {isClient
              ? "LIVE PROCHAINEMENT"
              : "UMI LIVE PROCHAINEMENT"}
          </strong>

        </div>

      </div>


      <div className="live-card-content">

        <h2>
          {isClient
            ? live.productName ||
              live.title ||
              "LIVE Client"
            : live.title ||
              "Prochain UMI LIVE"}
        </h2>


        <p className="live-machine-name">
          {isClient
            ? `Vendeur : ${
                live.sellerName ||
                "Vendeur UMI"
              }`
            : live.machineName ||
              "Machine à confirmer"}
        </p>


        {isClient &&
          live.price && (
            <p className="umi-live-price">
              {live.price}
            </p>
          )}


        <div className="upcoming-live-date">

          <div>
            📅 {formattedDate}
          </div>

          <div>
            🕐 {formattedTime}
          </div>

        </div>


        {live.description && (
          <p className="upcoming-description">
            {live.description}
          </p>
        )}

      </div>

    </article>
  );
}


/* ========================================
   PAGE UMI LIVE
======================================== */

function UmiLive({
  onBack,
  onCreateClientLive,
  onOpenMyLives,
}) {
  const [items, setItems] = useState([]);

  const [
    activeFilter,
    setActiveFilter,
  ] = useState("all");

  const [now, setNow] =
    useState(Date.now());

  const [
    selectedLive,
    setSelectedLive,
  ] = useState(null);


  /* ========================================
     HORLOGE
  ======================================== */

  useEffect(() => {
    const interval =
      setInterval(() => {
        setNow(Date.now());
      }, 15000);

    return () =>
      clearInterval(interval);
  }, []);


  /* ========================================
     BLOQUER PAGE DERRIÈRE
  ======================================== */

  useEffect(() => {
    if (!selectedLive) {
      return;
    }

    const oldOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        oldOverflow;
    };
  }, [selectedLive]);


  /* ========================================
     FIRESTORE
  ======================================== */

  useEffect(() => {
    const unsubscribe =
      onSnapshot(
        collection(
          db,
          "live"
        ),

        (snapshot) => {
          const itemList =
            snapshot.docs
              .map((liveDoc) => ({
                id: liveDoc.id,
                ...liveDoc.data(),
              }))
              .filter((live) => {
                if (
                  live.isScheduled === true &&
                  live.isLive === false &&
                  live.scheduledAt
                ) {
                  return true;
                }

                if (
                  live.isLive === true &&
                  typeof live.roomName === "string" &&
                  live.roomName.trim() !== ""
                ) {
                  return true;
                }

                if (
                  live.isLive === false &&
                  live.replayPublished === true &&
                  typeof live.recordingUrl === "string" &&
                  live.recordingUrl.trim() !== ""
                ) {
                  return true;
                }

                if (
                  live.isLive === false &&
                  live.highlightPublished === true &&
                  typeof live.highlightUrl === "string" &&
                  live.highlightUrl.trim() !== ""
                ) {
                  return true;
                }

                return false;
              });

          itemList.sort((a, b) => {
            const aTime =
              a.isLive
                ? a.startedAt?.seconds || 0
                : a.stoppedAt?.seconds ||
                  a.startedAt?.seconds ||
                  0;

            const bTime =
              b.isLive
                ? b.startedAt?.seconds || 0
                : b.stoppedAt?.seconds ||
                  b.startedAt?.seconds ||
                  0;

            return bTime - aTime;
          });

          setItems(itemList);
        },

        (firestoreError) => {
          console.error(
            "Erreur UMI LIVE :",
            firestoreError
          );
        }
      );

    return () => unsubscribe();
  }, []);


  /* ========================================
     ACTUALISER LIVE SÉLECTIONNÉ
  ======================================== */

  useEffect(() => {
    if (!selectedLive) {
      return;
    }

    const updated =
      items.find(
        (item) =>
          item.id === selectedLive.id
      );

    if (updated) {
      setSelectedLive((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          ...updated,
        };
      });
    }
  }, [items]);


  /* ========================================
     FILTRES
  ======================================== */

  const filteredItems =
    items.filter((live) => {
      if (
        activeFilter === "upcoming"
      ) {
        return (
          live.isScheduled === true &&
          live.isLive === false &&
          Boolean(live.scheduledAt) &&
          typeof live.scheduledAt
            .toMillis === "function" &&
          live.scheduledAt.toMillis() > now
        );
      }

      if (
        live.isScheduled === true &&
        live.isLive === false
      ) {
        return false;
      }

      if (
        activeFilter === "all"
      ) {
        return true;
      }

      if (
        activeFilter === "umi"
      ) {
        return (
          !live.liveType ||
          live.liveType === "umi"
        );
      }

      if (
        activeFilter === "clients"
      ) {
        return (
          live.liveType === "client"
        );
      }

      return true;
    });


  const displayedItems =
    activeFilter === "upcoming"
      ? [...filteredItems].sort(
          (a, b) => {
            const aIsUmi =
              !a.liveType ||
              a.liveType === "umi";

            const bIsUmi =
              !b.liveType ||
              b.liveType === "umi";

            if (
              aIsUmi &&
              !bIsUmi
            ) {
              return -1;
            }

            if (
              !aIsUmi &&
              bIsUmi
            ) {
              return 1;
            }

            return (
              (
                a.scheduledAt
                  ?.toMillis?.() || 0
              ) -
              (
                b.scheduledAt
                  ?.toMillis?.() || 0
              )
            );
          }
        )
      : filteredItems;


  /* ========================================
     PLEIN ÉCRAN
  ======================================== */

  if (selectedLive) {
    if (
      selectedLive.isLive === true
    ) {
      return (
        <LiveCard
          live={selectedLive}
          focused={true}
          onClose={() =>
            setSelectedLive(null)
          }
        />
      );
    }

    return (
      <div className="umi-live-fullscreen">

        <button
          type="button"
          className="umi-live-fullscreen-back"
          onClick={() =>
            setSelectedLive(null)
          }
        >
          ←
        </button>


        <div className="umi-live-fullscreen-content">

          <div className="umi-live-fullscreen-video">

            <ReplayCard
              live={selectedLive}
              focused={true}
            />

          </div>

        </div>

      </div>
    );
  }


  /* ========================================
     PAGE PRINCIPALE
  ======================================== */

  return (
    <div className="umi-live-page">

      <header className="umi-live-header">

        <button
          type="button"
          className="umi-live-back"
          onClick={onBack}
        >
          ←
        </button>


        <div>

          <h1>
            UMI LIVE
          </h1>

          <p>
            Découvrez les machines
            et produits en direct
          </p>

        </div>

      </header>


      <div className="umi-live-filters">

        <button
          type="button"
          className={
            activeFilter === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveFilter("all")
          }
        >
          Tous
        </button>


        <button
          type="button"
          className={
            activeFilter === "umi"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveFilter("umi")
          }
        >
          LIVE UMI
        </button>


        <button
          type="button"
          className={
            activeFilter === "clients"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveFilter("clients")
          }
        >
          LIVE Clients
        </button>


        <button
          type="button"
          className={
            activeFilter === "upcoming"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveFilter("upcoming")
          }
        >
          À venir
        </button>

      </div>


      <main className="umi-live-content">

        {/* =====================================
            LES 2 BOUTONS SUR LA MÊME LIGNE
        ===================================== */}

        {activeFilter === "clients" && (
          <div className="umi-live-client-buttons">

            <button
              type="button"
              className="create-client-live-button"
              onClick={onCreateClientLive}
            >
              <span>＋</span>
              Créer mon LIVE
            </button>


            <button
              type="button"
              className="create-client-live-button"
              onClick={onOpenMyLives}
            >
              <span>📹</span>
              Mes LIVE
            </button>

          </div>
        )}


        {displayedItems.length === 0 ? (
          <div className="no-live-message">

            <div className="no-live-icon">
              {activeFilter === "upcoming"
                ? "📅"
                : "📹"}
            </div>


            <h2>
              {activeFilter === "clients"
                ? "Aucun LIVE Client actuellement"
                : activeFilter === "upcoming"
                ? "Aucun LIVE à venir"
                : "Aucun LIVE ou Temps fort actuellement"}
            </h2>


            <p>
              {activeFilter === "clients"
                ? "Soyez le premier vendeur à présenter un produit en direct."
                : activeFilter === "upcoming"
                ? "Les prochains directs UMI et Clients apparaîtront ici."
                : "Les directs, Temps forts et Replays apparaîtront ici."}
            </p>

          </div>
        ) : (
          <div className="umi-live-cards-grid">

            {displayedItems.map((live) => {
              if (
                live.isScheduled === true &&
                live.isLive === false
              ) {
                return (
                  <UpcomingLiveCard
                    key={live.id}
                    live={live}
                  />
                );
              }

              if (
                live.isLive === true
              ) {
                return (
                  <LiveCard
                    key={live.id}
                    live={live}
                    onOpen={setSelectedLive}
                  />
                );
              }

              return (
                <ReplayCard
                  key={live.id}
                  live={live}
                  onOpen={setSelectedLive}
                />
              );
            })}

          </div>
        )}

      </main>

    </div>
  );
}


export default UmiLive;