import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent } from "livekit-client";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";

import "./CreateLive.css";
import "./UmiLive.css";

import logoUmi from "./assets/logo-umi.jpeg";


/* =====================================================
   SERVEUR UMI
===================================================== */

const API_URL =
  "https://anniversary-tub-command-squad.trycloudflare.com";

function CreateLive({ onBack }) {

  /* =====================================================
     INFORMATIONS LIVE
  ===================================================== */

  const [title, setTitle] = useState("");
  const [machineName, setMachineName] = useState("");

  const [isCameraStarted, setIsCameraStarted] =
    useState(false);

  const [isLiveStarted, setIsLiveStarted] =
    useState(false);

  const [isStarting, setIsStarting] =
    useState(false);

  const [recordingStatus, setRecordingStatus] =
    useState("not-started");


  /* =====================================================
     CHAT
  ===================================================== */

  const [questions, setQuestions] =
    useState([]);

  const [questionsError, setQuestionsError] =
    useState("");

  const [activeLiveId, setActiveLiveId] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [sendingMessage, setSendingMessage] =
    useState(false);

  const [selectedMessage, setSelectedMessage] =
    useState(null);


  /* =====================================================
     SPECTATEURS
  ===================================================== */

  const [spectatorCount, setSpectatorCount] =
    useState(0);


  /* =====================================================
     REFERENCES
  ===================================================== */

  const videoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const roomRef = useRef(null);
  const liveIdRef = useRef(null);
  const roomNameRef = useRef(null);
  const identityRef = useRef(null);
  const egressIdRef = useRef(null);
  const recordingFilePathRef = useRef(null);
  const messageInputRef = useRef(null);
  const chatEndRef = useRef(null);


  /* =====================================================
     URL PUBLIQUE R2
  ===================================================== */

  const getR2PublicUrl = () => {

    const url =
      import.meta.env.VITE_R2_PUBLIC_URL;

    if (!url) {

      console.error(
        "VITE_R2_PUBLIC_URL manque dans .env"
      );

      return "";

    }

    return url.replace(/\/$/, "");

  };


  /* =====================================================
     UTILISATEUR ADMIN
  ===================================================== */

  const getCurrentUser = () => {

    try {

      const saved =
        localStorage.getItem(
          "umiCurrentUser"
        );

      if (!saved) {
        return null;
      }

      return JSON.parse(saved);

    } catch (error) {

      console.error(
        "Erreur lecture utilisateur :",
        error
      );

      return null;

    }

  };


  /* =====================================================
     COMMENTAIRES FIRESTORE
  ===================================================== */

  useEffect(() => {

    if (!activeLiveId) {

      setQuestions([]);
      setQuestionsError("");

      return;

    }

    const questionsRef =
      collection(
        db,
        "live",
        activeLiveId,
        "questions"
      );

    const unsubscribe =
      onSnapshot(

        questionsRef,

        (snapshot) => {

          const list =
            snapshot.docs.map(
              (questionDoc) => ({
                id: questionDoc.id,
                ...questionDoc.data(),
              })
            );

          list.sort(
            (a, b) => {

              const aTime =
                a.createdAt?.seconds || 0;

              const bTime =
                b.createdAt?.seconds || 0;

              return aTime - bTime;

            }
          );

          setQuestions(list);
          setQuestionsError("");

        },

        (error) => {

          console.error(
            "Erreur chat présentateur :",
            error
          );

          setQuestionsError(
            "Impossible de recevoir les commentaires."
          );

        }

      );

    return () => {
      unsubscribe();
    };

  }, [activeLiveId]);


  /* =====================================================
     SCROLL AUTOMATIQUE CHAT
  ===================================================== */

  useEffect(() => {

    if (
      isLiveStarted &&
      chatEndRef.current &&
      !selectedMessage
    ) {

      chatEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });

    }

  }, [
    questions,
    isLiveStarted,
    selectedMessage,
  ]);


  /* =====================================================
     RÉATTACHER LA CAMÉRA AU MODE LIVE
  ===================================================== */

  useEffect(() => {

    if (!isLiveStarted) {
      return;
    }

    const room =
      roomRef.current;

    if (!room) {
      return;
    }

    const attachPresenterVideo = () => {

      try {

        const publications =
          Array.from(
            room.localParticipant
              .trackPublications
              .values()
          );

        const videoPublication =
          publications.find(
            (publication) =>
              publication.track?.kind ===
              "video"
          );

        if (
          videoPublication?.track &&
          videoRef.current
        ) {

          try {

            videoPublication.track.detach();

          } catch {
            // rien
          }

          videoPublication.track.attach(
            videoRef.current
          );

          videoRef.current.muted =
            true;

          videoRef.current.playsInline =
            true;

          videoRef.current
            .play()
            .catch(
              (error) => {

                console.log(
                  "Lecture caméra présentateur :",
                  error
                );

              }
            );

          console.log(
            "✅ Caméra UMI attachée au plein écran."
          );

        } else {

          console.warn(
            "⚠️ Piste vidéo UMI introuvable."
          );

        }

      } catch (error) {

        console.error(
          "Erreur attachement caméra UMI :",
          error
        );

      }

    };


    requestAnimationFrame(() => {

      requestAnimationFrame(() => {

        attachPresenterVideo();

      });

    });


    const timer1 =
      setTimeout(
        attachPresenterVideo,
        300
      );

    const timer2 =
      setTimeout(
        attachPresenterVideo,
        1000
      );


    return () => {

      clearTimeout(timer1);
      clearTimeout(timer2);

    };

  }, [isLiveStarted]);


  /* =====================================================
     COMPTER LES SPECTATEURS
  ===================================================== */

  const updateSpectatorCount = (
    room
  ) => {

    if (!room) {

      setSpectatorCount(0);

      return;

    }

    const spectators =
      Array.from(
        room.remoteParticipants.values()
      ).filter(
        (participant) =>
          participant.identity?.startsWith(
            "spectateur-"
          )
      );

    setSpectatorCount(
      spectators.length
    );

  };


  /* =====================================================
     SÉLECTIONNER MESSAGE
  ===================================================== */

  const selectMessageToReply = (
    item
  ) => {

    setSelectedMessage(item);

    try {

      messageInputRef.current?.focus({
        preventScroll: true,
      });

    } catch {

      messageInputRef.current?.focus();

    }

  };


  /* =====================================================
     ANNULER RÉPONSE
  ===================================================== */

  const cancelReply = () => {

    setSelectedMessage(null);

  };


  /* =====================================================
     ENVOYER MESSAGE
  ===================================================== */

  const sendMessage = async () => {

    const cleanMessage =
      message.trim();

    if (
      !cleanMessage ||
      sendingMessage ||
      !activeLiveId
    ) {
      return;
    }

    try {

      setSendingMessage(true);
      setQuestionsError("");

      const currentUser =
        getCurrentUser();

      await addDoc(
        collection(
          db,
          "live",
          activeLiveId,
          "questions"
        ),
        {

          text:
            cleanMessage,

          userId:
            currentUser?.userId ||
            null,

          userName:
            "UMI",

          senderRole:
            "presenter",

          liveId:
            activeLiveId,

          liveType:
            "umi",

          roomName:
            roomNameRef.current ||
            "",

          replyToId:
            selectedMessage?.id ||
            null,

          replyToText:
            selectedMessage?.text ||
            null,

          replyToUserName:
            selectedMessage
              ? selectedMessage.senderRole ===
                "presenter"
                ? "UMI"
                : selectedMessage.userName ||
                  "Spectateur"
              : null,

          createdAt:
            serverTimestamp(),

          answered:
            true,

        }
      );

      setMessage("");
      setSelectedMessage(null);

    } catch (error) {

      console.error(
        "Erreur envoi commentaire présentateur :",
        error
      );

      setQuestionsError(
        "Impossible d'envoyer le commentaire."
      );

    } finally {

      setSendingMessage(false);

    }

  };


  /* =====================================================
     ENTRÉE POUR ENVOYER
  ===================================================== */

  const handleMessageKeyDown = (
    event
  ) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  };


  /* =====================================================
     ATTENDRE TEMPS FORT
  ===================================================== */

  const waitForHighlight = async (
    liveId,
    maximumAttempts = 40
  ) => {

    console.log(
      "🎬 Attente du Temps fort..."
    );

    for (
      let attempt = 1;
      attempt <= maximumAttempts;
      attempt++
    ) {

      try {

        const response =
          await fetch(
            `${API_URL}/highlight-status/${encodeURIComponent(
              liveId
            )}`
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (
          data.status === "ready" &&
          data.highlightFilePath
        ) {

          const r2PublicUrl =
            getR2PublicUrl();

          if (!r2PublicUrl) {

            throw new Error(
              "VITE_R2_PUBLIC_URL n'est pas configurée."
            );

          }

          const highlightUrl =
            `${r2PublicUrl}/${data.highlightFilePath}`;

          await setDoc(
            doc(
              db,
              "live",
              liveId
            ),
            {

              highlightStatus:
                "ready",

              highlightFilePath:
                data.highlightFilePath,

              highlightUrl,

              highlightPublished:
                true,

            },
            {
              merge: true,
            }
          );

          return {
            success: true,
            highlightUrl,
          };

        }


        if (
          data.status === "error"
        ) {

          await setDoc(
            doc(
              db,
              "live",
              liveId
            ),
            {

              highlightStatus:
                "error",

              highlightPublished:
                false,

            },
            {
              merge: true,
            }
          );

          throw new Error(
            data.error ||
            "Erreur pendant la création du Temps fort."
          );

        }

      } catch (error) {

        console.error(
          "Attente Temps fort :",
          error
        );

      }


      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            3000
          )
      );

    }


    await setDoc(
      doc(
        db,
        "live",
        liveId
      ),
      {

        highlightStatus:
          "timeout",

        highlightPublished:
          false,

      },
      {
        merge: true,
      }
    );


    return {
      success: false,
    };

  };


  /* =====================================================
     ACTIVER CAMÉRA
  ===================================================== */

  const startCamera = async () => {

    try {

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {

        throw new Error(
          "La caméra n'est pas disponible sur cet appareil."
        );

      }


      if (
        previewStreamRef.current
      ) {

        previewStreamRef.current
          .getTracks()
          .forEach(
            (track) => {

              track.stop();

            }
          );

        previewStreamRef.current =
          null;

      }


      const stream =
        await navigator.mediaDevices
          .getUserMedia({

            video: {
              facingMode:
                "user",
            },

            audio:
              true,

          });


      previewStreamRef.current =
        stream;


      if (videoRef.current) {

        videoRef.current.srcObject =
          stream;

        videoRef.current.muted =
          true;

        videoRef.current.playsInline =
          true;

        try {

          await videoRef.current.play();

        } catch (
          playError
        ) {

          console.log(
            "Lecture aperçu caméra :",
            playError
          );

        }

      }


      setIsCameraStarted(true);


    } catch (error) {

      console.error(
        "Erreur caméra :",
        error
      );

      setIsCameraStarted(false);


      if (
        error?.name ===
        "NotAllowedError"
      ) {

        alert(
          "L'accès à la caméra ou au microphone a été refusé. Vérifiez les autorisations de UMI dans les paramètres du téléphone."
        );

      } else if (
        error?.name ===
        "NotReadableError"
      ) {

        alert(
          "La caméra ou le microphone est déjà utilisé par une autre application."
        );

      } else if (
        error?.name ===
        "NotFoundError"
      ) {

        alert(
          "Aucune caméra ou aucun microphone n'a été trouvé."
        );

      } else {

        alert(
          `Impossible d'accéder à la caméra ou au microphone.\n\n${
            error?.message || ""
          }`
        );

      }

    }

  };

/* =====================================================
   RETOURNER LA CAMÉRA
===================================================== */

const switchCamera = async () => {

  try {

    const room = roomRef.current;

    if (!room) {
      return;
    }

    const publications =
      Array.from(
        room.localParticipant
          .trackPublications
          .values()
      );

    const videoPublication =
      publications.find(
        (publication) =>
          publication.track?.kind === "video"
      );

    const videoTrack =
      videoPublication?.track;

    if (!videoTrack) {
      return;
    }

    const currentFacingMode =
      videoTrack.mediaStreamTrack
        ?.getSettings()
        ?.facingMode;

    const newFacingMode =
      currentFacingMode === "environment"
        ? "user"
        : "environment";

    await videoTrack.restartTrack({
      facingMode: newFacingMode,
    });

    if (videoRef.current) {

      videoTrack.detach();
      videoTrack.attach(videoRef.current);

      videoRef.current.muted = true;
      videoRef.current.playsInline = true;

      await videoRef.current
        .play()
        .catch(() => {});

    }

  } catch (error) {

    console.error(
      "Erreur changement caméra :",
      error
    );

    alert(
      "Impossible de changer de caméra."
    );

  }

};
  /* =====================================================
     DÉMARRER LIVE
  ===================================================== */

  const startLive = async (
    event
  ) => {

    event.preventDefault();


    if (!title.trim()) {

      alert(
        "Entre le titre du LIVE."
      );

      return;

    }


    if (!machineName.trim()) {

      alert(
        "Entre le nom de la machine."
      );

      return;

    }


    if (!isCameraStarted) {

      alert(
        "Active d'abord la caméra et le microphone."
      );

      return;

    }


    let createdRoom =
      null;


    try {

      setIsStarting(true);

      setRecordingStatus(
        "starting"
      );

      setQuestions([]);
      setQuestionsError("");
      setSelectedMessage(null);
      setMessage("");


      /* =================================================
         1. CRÉER LE LIVE
      ================================================= */

      const liveRef =
        doc(
          collection(
            db,
            "live"
          )
        );


      const liveId =
        liveRef.id;


      const roomName =
        `umi-live-${liveId}`;


      const identity =
        `admin-${liveId}`;


      liveIdRef.current =
        liveId;

      setActiveLiveId(
        liveId
      );

      roomNameRef.current =
        roomName;

      identityRef.current =
        identity;


      /* =================================================
         2. TOKEN
      ================================================= */

      const tokenResponse =
        await fetch(
          `${API_URL}/token`,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

            },

            body:
              JSON.stringify({

                identity,

                role:
                  "admin",

                roomName,

              }),

          }
        );


      const tokenData =
        await tokenResponse
          .json()
          .catch(
            () => ({})
          );


      if (!tokenResponse.ok) {

        throw new Error(
          tokenData.error ||
          "Impossible d'obtenir le token LiveKit."
        );

      }


      if (
        !tokenData.url ||
        !tokenData.token
      ) {

        throw new Error(
          "Le serveur n'a pas retourné les informations LiveKit."
        );

      }


      /* =================================================
         3. CONNEXION LIVEKIT
      ================================================= */

      const room =
        new Room({

          adaptiveStream:
            true,

          dynacast:
            true,

        });


      createdRoom =
        room;

      roomRef.current =
        room;


      room.on(
        RoomEvent.ParticipantConnected,
        () => {

          updateSpectatorCount(
            room
          );

        }
      );


      room.on(
        RoomEvent.ParticipantDisconnected,
        () => {

          updateSpectatorCount(
            room
          );

        }
      );


      room.on(
        RoomEvent.Disconnected,
        () => {

          setSpectatorCount(0);

        }
      );


      await room.connect(
        tokenData.url,
        tokenData.token
      );


      updateSpectatorCount(
        room
      );


      /* =================================================
         4. ARRÊTER APERÇU
      ================================================= */

      if (
        previewStreamRef.current
      ) {

        previewStreamRef.current
          .getTracks()
          .forEach(
            (track) => {

              track.stop();

            }
          );


        previewStreamRef.current =
          null;

      }


      if (videoRef.current) {

        videoRef.current.srcObject =
          null;

      }


      /* =================================================
         5. PUBLIER CAMÉRA + MICRO
      ================================================= */

      await room.localParticipant
        .enableCameraAndMicrophone();


      /* =================================================
         6. ATTACHER CAMÉRA
      ================================================= */

      const publications =
        Array.from(
          room.localParticipant
            .trackPublications
            .values()
        );


      const videoPublication =
        publications.find(
          (publication) =>
            publication.track?.kind ===
            "video"
        );


      if (
        videoPublication?.track &&
        videoRef.current
      ) {

        videoPublication.track.attach(
          videoRef.current
        );

        videoRef.current.muted =
          true;

        videoRef.current.playsInline =
          true;

        videoRef.current
          .play()
          .catch(() => {});

      }


      /* =================================================
         7. DÉMARRER ENREGISTREMENT
      ================================================= */

      const recordingResponse =
        await fetch(
          `${API_URL}/start-recording`,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

            },

            body:
              JSON.stringify({

                roomName,

                identity,

                liveId,

                liveType:
                  "umi",

              }),

          }
        );


      const recordingData =
        await recordingResponse
          .json()
          .catch(
            () => ({})
          );


      if (
        !recordingResponse.ok
      ) {

        throw new Error(
          recordingData.error ||
          "Impossible de démarrer l'enregistrement."
        );

      }


      if (
        !recordingData.egressId ||
        !recordingData.filePath
      ) {

        throw new Error(
          "Informations d'enregistrement manquantes."
        );

      }


      egressIdRef.current =
        recordingData.egressId;


      recordingFilePathRef.current =
        recordingData.filePath;


      setRecordingStatus(
        "recording"
      );


      /* =================================================
         8. FIREBASE
      ================================================= */

      await setDoc(
        liveRef,
        {

          isLive:
            true,

          liveType:
            "umi",

          title:
            title.trim(),

          machineName:
            machineName.trim(),

          roomName,

          broadcasterIdentity:
            identity,

          egressId:
            recordingData.egressId,

          recordingFilePath:
            recordingData.filePath,

          recordingStatus:
            "recording",

          recordingUrl:
            null,

          hasReplay:
            false,

          replayPublished:
            false,

          highlightStatus:
            "waiting",

          highlightPublished:
            false,

          highlightFilePath:
            null,

          highlightUrl:
            null,

          startedAt:
            serverTimestamp(),

        }
      );


      setIsCameraStarted(true);

      setIsLiveStarted(true);


    } catch (error) {

      console.error(
        "Erreur démarrage LIVE :",
        error
      );


      setRecordingStatus(
        "error"
      );


      if (createdRoom) {

        try {

          await createdRoom
            .disconnect();

        } catch {
          // rien
        }

      }


      roomRef.current =
        null;

      liveIdRef.current =
        null;

      setActiveLiveId(null);

      roomNameRef.current =
        null;

      identityRef.current =
        null;

      egressIdRef.current =
        null;

      recordingFilePathRef.current =
        null;

      setSpectatorCount(0);
      setIsLiveStarted(false);


      alert(
        `Impossible de démarrer le LIVE.\n\n${
          error.message ||
          "Erreur inconnue"
        }`
      );


    } finally {

      setIsStarting(false);

    }

  };


  /* =====================================================
     ARRÊTER LIVE
  ===================================================== */

  const stopLive = async () => {

    const liveId =
      liveIdRef.current;


    const egressId =
      egressIdRef.current;


    const recordingFilePath =
      recordingFilePathRef.current;


    if (
      !liveId ||
      !egressId ||
      !recordingFilePath
    ) {

      alert(
        "Informations du LIVE manquantes."
      );

      return;

    }


    try {

      setRecordingStatus(
        "stopping"
      );


      /* =================================================
         ARRÊTER ENREGISTREMENT
      ================================================= */

      const response =
        await fetch(
          `${API_URL}/stop-recording`,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

            },

            body:
              JSON.stringify({

                egressId,

                recordingFilePath,

                liveId,

                liveType:
                  "umi",

              }),

          }
        );


      const data =
        await response
          .json()
          .catch(
            () => ({})
          );


      if (!response.ok) {

        throw new Error(
          data.error ||
          "Impossible d'arrêter l'enregistrement."
        );

      }


      /* =================================================
         URL REPLAY
      ================================================= */

      const r2PublicUrl =
        getR2PublicUrl();


      if (!r2PublicUrl) {

        throw new Error(
          "VITE_R2_PUBLIC_URL manque dans le fichier .env."
        );

      }


      const recordingUrl =
        `${r2PublicUrl}/${recordingFilePath}`;


      /* =================================================
         FIREBASE
      ================================================= */

      await setDoc(
        doc(
          db,
          "live",
          liveId
        ),
        {

          isLive:
            false,

          recordingStatus:
            "stopped",

          recordingFilePath,

          recordingUrl,

          hasReplay:
            true,

          replayPublished:
            true,

          highlightStatus:
            "processing",

          highlightPublished:
            false,

          highlightUrl:
            null,

          stoppedAt:
            serverTimestamp(),

        },
        {
          merge: true,
        }
      );


      /* =================================================
         DÉCONNECTER LIVEKIT
      ================================================= */

      if (
        roomRef.current
      ) {

        await roomRef.current
          .disconnect();

        roomRef.current =
          null;

      }


      if (
        videoRef.current
      ) {

        videoRef.current.srcObject =
          null;

      }


      setIsLiveStarted(false);
      setIsCameraStarted(false);
      setSpectatorCount(0);

      setRecordingStatus(
        "stopped"
      );


      /* =================================================
         TEMPS FORT
      ================================================= */

      const highlightResult =
        await waitForHighlight(
          liveId
        );


      /* =================================================
         NETTOYAGE
      ================================================= */

      liveIdRef.current =
        null;

      setActiveLiveId(null);

      roomNameRef.current =
        null;

      identityRef.current =
        null;

      egressIdRef.current =
        null;

      recordingFilePathRef.current =
        null;


      setQuestions([]);
      setQuestionsError("");
      setSelectedMessage(null);
      setMessage("");


      if (
        highlightResult.success
      ) {

        alert(
          "✅ LIVE terminé.\n\n🎥 Replay disponible.\n🎬 Temps fort disponible."
        );

      } else {

        alert(
          "LIVE terminé.\n\n🎥 Replay disponible.\n⚠️ Le Temps fort n'a pas encore été publié."
        );

      }


    } catch (error) {

      console.error(
        "Erreur arrêt LIVE :",
        error
      );


      setRecordingStatus(
        "error"
      );


      alert(
        `Erreur pendant l'arrêt du LIVE.\n\n${
          error.message || ""
        }`
      );

    }

  };


  /* =====================================================
     NETTOYAGE PAGE
  ===================================================== */

  useEffect(() => {

    return () => {

      if (
        previewStreamRef.current
      ) {

        previewStreamRef.current
          .getTracks()
          .forEach(
            (track) => {

              track.stop();

            }
          );

      }


      if (
        roomRef.current
      ) {

        roomRef.current
          .disconnect();

      }

    };

  }, []);


  /* =====================================================
     MODE LIVE
  ===================================================== */

  if (isLiveStarted) {

    return (

      <div className="umi-tiktok-live">

        <div className="umi-live-background">

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="umi-live-background-video"
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
                {machineName}
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

  <div className="umi-live-right-buttons">

    {/* ARRÊTER LE LIVE */}
    <button
      type="button"
      className="umi-live-power-button"
      onClick={stopLive}
      disabled={recordingStatus === "stopping"}
      title="Arrêter le LIVE"
      aria-label="Arrêter le LIVE"
    >
      <span
        className="umi-power-symbol"
        aria-hidden="true"
      ></span>
    </button>

    {/* RETOURNER LA CAMÉRA */}
    <button
      type="button"
      className="umi-live-power-button"
      onClick={switchCamera}
      title="Retourner la caméra"
      aria-label="Retourner la caméra"
    >
      🔄
    </button>

  </div>

</div>

        </div>


        <div className="umi-live-comments">

          {questions
            .slice(-8)
            .map(
              (item) => {

                const isPresenter =
                  item.senderRole ===
                  "presenter";


                return (

                  <button
                    type="button"
                    key={item.id}
                    className={
                      selectedMessage?.id ===
                      item.id
                        ? "umi-live-comment selected"
                        : "umi-live-comment"
                    }
                    onClick={() =>
                      selectMessageToReply(
                        item
                      )
                    }
                  >

                    <div className="umi-live-comment-avatar">

                      {isPresenter
                        ? "U"
                        : (
                            item.userName?.[0] ||
                            "S"
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

              }
            )}


          <div ref={chatEndRef} />

        </div>


        {questionsError && (

          <div className="umi-live-chat-error">
            {questionsError}
          </div>

        )}


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
                onClick={
                  cancelReply
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
              onChange={
                (event) =>
                  setMessage(
                    event.target.value
                  )
              }
              onKeyDown={
                handleMessageKeyDown
              }
              placeholder={
                selectedMessage
                  ? "Écris ta réponse..."
                  : "Saisis ton message..."
              }
              maxLength={300}
              disabled={
                sendingMessage
              }
              autoComplete="off"
            />


            <button
              type="button"
              className="umi-live-send-button"
              onClick={
                sendMessage
              }
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

      </div>

    );

  }


  /* =====================================================
     PAGE AVANT LIVE
  ===================================================== */

  return (

    <div className="create-live-page">

      <header className="create-live-header">

        <button
          type="button"
          className="create-live-back"
          onClick={
            onBack
          }
        >
          ←
        </button>


        <div className="create-live-brand">

          <div className="create-live-header-title">
            CRÉER UN UMI LIVE
          </div>


          <div className="create-live-header-subtitle">
            Diffusez vos machines en direct
          </div>

        </div>


        <img
          src={logoUmi}
          alt="UMI"
          className="create-live-logo"
        />

      </header>


      <main className="create-live-content">

        <div className="create-live-intro">

          <h1>
            Nouveau direct
          </h1>

          <p>
            Présentez une machine en direct.
          </p>

        </div>


        <section className="create-live-card camera-card">

          <div className="create-live-section-title">

            <div className="create-live-section-icon">
              📹
            </div>


            <div>

              <h2>
                Caméra UMI LIVE
              </h2>

              <p>
                Vérifiez votre caméra avant de démarrer.
              </p>

            </div>

          </div>


          <div
            className="live-camera-preview"
            style={{
              position:
                "relative",
            }}
          >

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
            />


            {!isCameraStarted && (

              <div className="camera-placeholder">

                <div className="camera-placeholder-icon">
                  📹
                </div>

                <strong>
                  Caméra désactivée
                </strong>

                <span>
                  Activez la caméra pour afficher l'aperçu.
                </span>

              </div>

            )}

          </div>


          <button
            type="button"
            className="activate-camera-button"
            onClick={
              startCamera
            }
          >

            📹{" "}

            {isCameraStarted
              ? "Réactiver la caméra"
              : "Activer la caméra"}

          </button>


          <div
            className={
              isCameraStarted
                ? "camera-status ready"
                : "camera-status"
            }
          >

            <span className="camera-status-dot" />

            {isCameraStarted
              ? "Caméra prête"
              : "En attente de la caméra"}

          </div>

        </section>


        <form
          onSubmit={
            startLive
          }
        >

          <section className="create-live-card">

            <div className="create-live-section-title">

              <div className="create-live-section-icon">
                ⚙️
              </div>


              <div>

                <h2>
                  Informations du LIVE
                </h2>

                <p>
                  Indiquez le titre et la machine.
                </p>

              </div>

            </div>


            <div className="create-live-field">

              <label htmlFor="live-title">
                Titre du LIVE *
              </label>


              <input
                id="live-title"
                type="text"
                placeholder="Présentation machine d'emballage"
                value={title}
                onChange={
                  (event) =>
                    setTitle(
                      event.target.value
                    )
                }
              />

            </div>


            <div className="create-live-field">

              <label htmlFor="live-machine">
                Machine présentée *
              </label>


              <input
                id="live-machine"
                type="text"
                placeholder="Nom de la machine"
                value={
                  machineName
                }
                onChange={
                  (event) =>
                    setMachineName(
                      event.target.value
                    )
                }
              />

            </div>

          </section>


          <button
            type="submit"
            className="start-live-button"
            disabled={
              isStarting
            }
          >

            <span className="start-live-dot" />

            {isStarting
              ? "Démarrage..."
              : "Démarrer le LIVE"}

          </button>


          <button
            type="button"
            className="create-live-cancel"
            onClick={
              onBack
            }
          >
            Annuler
          </button>

        </form>

      </main>

    </div>

  );

}


export default CreateLive;