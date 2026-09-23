import { useEffect, useRef, useState } from "react";
import { Room } from "livekit-client";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";

import "./CreateClientLive.css";
import "./UmiLive.css";


const API_URL =
  "https://anniversary-tub-command-squad.trycloudflare.com";


function CreateClientLive({ onBack }) {

  /* =====================================================
     INFORMATIONS PRODUIT
  ===================================================== */

  const [sellerName, setSellerName] = useState("");
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");


  /* =====================================================
     ÉTAT DU LIVE
  ===================================================== */

  const [isCameraStarted, setIsCameraStarted] =
    useState(false);

  const [isLiveStarted, setIsLiveStarted] =
    useState(false);

  const [isStarting, setIsStarting] =
    useState(false);

  const [viewerCount, setViewerCount] =
    useState(0);

  const [error, setError] =
    useState("");

  const [adminStoppedMessage, setAdminStoppedMessage] =
    useState("");


  /* =====================================================
     CHAT
  ===================================================== */

  const [activeLiveId, setActiveLiveId] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [selectedMessage, setSelectedMessage] =
    useState(null);

  const [sendingMessage, setSendingMessage] =
    useState(false);

  const [chatError, setChatError] =
    useState("");


  /* =====================================================
     REFERENCES
  ===================================================== */

  const roomRef = useRef(null);

  const liveIdRef = useRef(null);

  const roomNameRef = useRef(null);

  const egressIdRef = useRef(null);

  const recordingFilePathRef =
    useRef(null);

  const previewStreamRef =
    useRef(null);

  const videoRef =
    useRef(null);

  const adminStopHandledRef =
    useRef(false);

  const normalStopRef =
    useRef(false);

  const messageInputRef =
    useRef(null);

  const chatEndRef =
    useRef(null);


  /* =====================================================
     UTILISATEUR CONNECTÉ
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

    } catch (err) {

      console.error(
        "Erreur lecture utilisateur :",
        err
      );

      return null;

    }

  };


  /* =====================================================
     CHAT TEMPS RÉEL
  ===================================================== */

  useEffect(() => {

    if (!activeLiveId) {

      setMessages([]);
      setChatError("");

      return;

    }

    const messagesRef =
      collection(
        db,
        "live",
        activeLiveId,
        "questions"
      );

    const unsubscribe =
      onSnapshot(

        messagesRef,

        (snapshot) => {

          const list =
            snapshot.docs.map(
              (messageDoc) => ({
                id: messageDoc.id,
                ...messageDoc.data(),
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

          setMessages(list);

          setChatError("");

        },

        (err) => {

          console.error(
            "Erreur chat LIVE Client :",
            err
          );

          setChatError(
            "Impossible de charger les commentaires."
          );

        }

      );

    return () => {

      unsubscribe();

    };

  }, [activeLiveId]);


  /* =====================================================
     SCROLL COMMENTAIRES
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
    messages,
    isLiveStarted,
    selectedMessage,
  ]);


  /* =====================================================
     RÉATTACHER LA VIDÉO APRÈS PASSAGE PLEIN ÉCRAN

     IMPORTANT :
     Quand isLiveStarted devient true,
     React crée un nouveau <video>.

     On rattache donc la piste LiveKit
     à ce nouveau <video>.
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


    const attachLocalVideo = () => {

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
              (playError) => {

                console.log(
                  "Lecture vidéo vendeur :",
                  playError
                );

              }
            );


          console.log(
            "✅ Vidéo vendeur attachée au plein écran."
          );

        } else {

          console.warn(
            "⚠️ Piste vidéo locale introuvable."
          );

        }

      } catch (err) {

        console.error(
          "Erreur attachement vidéo plein écran :",
          err
        );

      }

    };


    /*
      On laisse React terminer le rendu
      du nouvel élément <video>.
    */

    requestAnimationFrame(() => {

      requestAnimationFrame(() => {

        attachLocalVideo();

      });

    });


    /*
      Deuxième tentative de sécurité
      pour certains téléphones.
    */

    const timer =
      setTimeout(
        attachLocalVideo,
        500
      );


    return () => {

      clearTimeout(timer);

    };

  }, [isLiveStarted]);


  /* =====================================================
     SÉLECTIONNER UN COMMENTAIRE
  ===================================================== */

  const selectMessageToReply = (
    item
  ) => {

    setSelectedMessage(item);


    /*
      Focus immédiat important sur téléphone.
    */

    try {

      messageInputRef.current?.focus({
        preventScroll: true,
      });

    } catch {

      messageInputRef.current?.focus();

    }

  };


  /* =====================================================
     ENVOYER COMMENTAIRE VENDEUR
  ===================================================== */

  const sendMessage =
    async () => {

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

        setChatError("");


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
              sellerName.trim() ||
              "Vendeur",

            senderRole:
              "presenter",

            liveId:
              activeLiveId,

            liveType:
              "client",

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
                ? selectedMessage.userName ||
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


      } catch (err) {

        console.error(
          "Erreur envoi commentaire vendeur :",
          err
        );


        setChatError(
          "Impossible d'envoyer le commentaire."
        );


      } finally {

        setSendingMessage(false);

      }

    };


  /* =====================================================
     TOUCHE ENTRÉE
  ===================================================== */

  const handleMessageKeyDown =
    (event) => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();

      }

    };


  /* =====================================================
     ATTENDRE LE TEMPS FORT
  ===================================================== */

  const waitForHighlight =
    async (liveId) => {

      if (!liveId) {
        return;
      }


      console.log(
        "⏳ Attente du Temps fort Client...",
        liveId
      );


      const maxAttempts =
        60;


      for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt += 1
      ) {

        try {

          const response =
            await fetch(
              `${API_URL}/highlight-status/${encodeURIComponent(
                liveId
              )}`
            );


          if (!response.ok) {

            throw new Error(
              `Erreur HTTP ${response.status}`
            );

          }


          const data =
            await response.json();


          console.log(
            `🎬 Vérification Temps fort Client ${attempt}/${maxAttempts} :`,
            data
          );


          if (
            data.status === "ready" &&
            data.highlightFilePath
          ) {

            const r2PublicUrl =
              import.meta.env
                .VITE_R2_PUBLIC_URL;


            if (!r2PublicUrl) {

              console.error(
                "VITE_R2_PUBLIC_URL est manquant."
              );


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


              return;

            }


            const highlightUrl =
              `${r2PublicUrl.replace(
                /\/$/,
                ""
              )}/${data.highlightFilePath}`;


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


            console.log(
              "✅ Temps fort Client enregistré :",
              highlightUrl
            );


            return;

          }


          if (
            data.status === "error"
          ) {

            console.error(
              "Erreur création Temps fort Client :",
              data.error
            );


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


            return;

          }


        } catch (err) {

          console.error(
            "Erreur vérification Temps fort Client :",
            err
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


      console.warn(
        "⚠️ Temps fort toujours en préparation."
      );

    };


  /* =====================================================
     NETTOYER CAMÉRA / LIVEKIT
  ===================================================== */

  const cleanupClientMedia =
    async () => {

      try {

        if (roomRef.current) {

          await roomRef.current
            .disconnect();

          roomRef.current =
            null;

        }

      } catch (err) {

        console.error(
          "Erreur déconnexion LiveKit :",
          err
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


      if (videoRef.current) {

        videoRef.current.srcObject =
          null;

      }

    };


  /* =====================================================
     LIVE ARRÊTÉ PAR ADMIN
  ===================================================== */

  const handleAdminStop =
    async () => {

      if (
        adminStopHandledRef.current
      ) {
        return;
      }


      adminStopHandledRef.current =
        true;


      console.log(
        "🛑 LIVE arrêté par l'administration."
      );


      await cleanupClientMedia();


      const currentLiveId =
        liveIdRef.current;


      const currentRecordingFilePath =
        recordingFilePathRef.current;


      const r2PublicUrl =
        import.meta.env
          .VITE_R2_PUBLIC_URL;


      const recordingUrl =
        currentRecordingFilePath &&
        r2PublicUrl
          ? `${r2PublicUrl.replace(
              /\/$/,
              ""
            )}/${currentRecordingFilePath}`
          : null;


      if (currentLiveId) {

        try {

          await setDoc(
            doc(
              db,
              "live",
              currentLiveId
            ),
            {

              isLive:
                false,

              recordingStatus:
                "stopped",

              recordingFilePath:
                currentRecordingFilePath ||
                null,

              recordingUrl,

              hasReplay:
                Boolean(
                  recordingUrl
                ),

              replayPublished:
                Boolean(
                  recordingUrl
                ),

              highlightStatus:
                currentRecordingFilePath
                  ? "processing"
                  : "unavailable",

              highlightPublished:
                false,

              stoppedBy:
                "admin",

              stoppedAt:
                serverTimestamp(),

            },
            {
              merge: true,
            }
          );


          if (
            currentRecordingFilePath
          ) {

            waitForHighlight(
              currentLiveId
            );

          }


        } catch (err) {

          console.error(
            "Erreur mise à jour arrêt administrateur :",
            err
          );

        }

      }


      egressIdRef.current =
        null;

      recordingFilePathRef.current =
        null;

      roomNameRef.current =
        null;

      liveIdRef.current =
        null;


      setActiveLiveId(null);

      setMessages([]);

      setMessage("");

      setSelectedMessage(null);

      setViewerCount(0);

      setIsLiveStarted(false);

      setIsCameraStarted(false);

      setIsStarting(false);

      setError("");


      setAdminStoppedMessage(
        "Ce LIVE a été arrêté par l'administration UMI."
      );

    };


  /* =====================================================
     ACTIVER CAMÉRA
  ===================================================== */

  const startCamera =
    async () => {

      try {

        setError("");

        setAdminStoppedMessage("");


        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices
            .getUserMedia
        ) {

          throw new Error(
            "La caméra nécessite une connexion HTTPS."
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

            await videoRef.current
              .play();

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


      } catch (err) {

        console.error(
          "❌ Erreur caméra :",
          err
        );


        setIsCameraStarted(false);


        if (
          err?.name ===
          "NotAllowedError"
        ) {

          setError(
            "L'accès à la caméra ou au microphone a été refusé. Autorisez la caméra et le microphone dans votre navigateur."
          );

        } else if (
          err?.name ===
          "NotReadableError"
        ) {

          setError(
            "La caméra ou le microphone est déjà utilisé par une autre application."
          );

        } else if (
          err?.name ===
          "NotFoundError"
        ) {

          setError(
            "Aucune caméra ou aucun microphone n'a été trouvé."
          );

        } else {

          setError(
            `Impossible d'accéder à la caméra ou au microphone. ${
              err?.message || ""
            }`
          );

        }

      }

    };


  /* =====================================================
     COMPTEUR SPECTATEURS
  ===================================================== */

  const loadViewerCount =
    async () => {

      const roomName =
        roomNameRef.current;


      if (!roomName) {

        setViewerCount(0);

        return;

      }


      try {

        const response =
          await fetch(
            `${API_URL}/live-viewers/${encodeURIComponent(
              roomName
            )}`
          );


        if (!response.ok) {

          throw new Error(
            "Erreur compteur spectateurs"
          );

        }


        const data =
          await response.json();


        setViewerCount(
          Number(
            data.viewers
          ) || 0
        );


      } catch (err) {

        console.error(
          "Erreur compteur spectateurs :",
          err
        );

      }

    };


  useEffect(() => {

    if (!isLiveStarted) {

      setViewerCount(0);

      return;

    }


    loadViewerCount();


    const interval =
      setInterval(
        loadViewerCount,
        3000
      );


    return () => {

      clearInterval(
        interval
      );

    };

  }, [isLiveStarted]);


  /* =====================================================
     SURVEILLER ARRÊT ADMIN
  ===================================================== */

  useEffect(() => {

    if (
      !isLiveStarted ||
      !liveIdRef.current
    ) {
      return;
    }


    const currentLiveId =
      liveIdRef.current;


    const unsubscribe =
      onSnapshot(
        doc(
          db,
          "live",
          currentLiveId
        ),

        (snapshot) => {

          if (
            !snapshot.exists()
          ) {
            return;
          }


          const liveData =
            snapshot.data();


          if (
            normalStopRef.current
          ) {
            return;
          }


          if (
            liveData.isLive ===
              false &&
            isLiveStarted &&
            !adminStopHandledRef.current
          ) {

            handleAdminStop();

          }

        },

        (err) => {

          console.error(
            "Erreur surveillance LIVE :",
            err
          );

        }
      );


    return () => {

      unsubscribe();

    };

  }, [isLiveStarted]);


  /* =====================================================
     RETOURNER LA CAMÉRA
  ===================================================== */

  const switchCamera = async () => {

    try {

      const room = roomRef.current;

      if (!room) {
        return;
      }

      const publications = Array.from(
        room.localParticipant.trackPublications.values()
      );

      const videoPublication = publications.find(
        (publication) => publication.track?.kind === "video"
      );

      const videoTrack = videoPublication?.track;

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

    } catch (err) {

      console.error(
        "Erreur changement caméra :",
        err
      );

      setError(
        "Impossible de changer de caméra."
      );
    }
  };


  /* =====================================================
     DÉMARRER LIVE CLIENT
  ===================================================== */

  const startLive =
    async () => {

      setError("");

      setAdminStoppedMessage("");

      adminStopHandledRef.current =
        false;

      normalStopRef.current =
        false;


      /* COMPTE */

      const savedCurrentUser =
        localStorage.getItem(
          "umiCurrentUser"
        );


      if (!savedCurrentUser) {

        setError(
          "Vous devez être connecté à votre compte UMI pour créer un LIVE."
        );

        return;

      }


      let currentUser;


      try {

        currentUser =
          JSON.parse(
            savedCurrentUser
          );


      } catch (userError) {

        console.error(
          "Erreur lecture utilisateur :",
          userError
        );


        setError(
          "Impossible de reconnaître votre compte UMI. Veuillez vous reconnecter."
        );

        return;

      }


      if (
        !currentUser.userId
      ) {

        setError(
          "Votre compte UMI n'a pas d'identifiant. Veuillez vous reconnecter."
        );

        return;

      }


      /* FORMULAIRE */

      if (
        !sellerName.trim()
      ) {

        setError(
          "Veuillez entrer le nom du vendeur."
        );

        return;

      }


      if (
        !productName.trim()
      ) {

        setError(
          "Veuillez entrer le nom du produit."
        );

        return;

      }


      if (
        !price.trim()
      ) {

        setError(
          "Veuillez entrer le prix du produit."
        );

        return;

      }


      if (
        !isCameraStarted
      ) {

        setError(
          "Activez d'abord la caméra et le microphone."
        );

        return;

      }


      try {

        setIsStarting(true);


        /* ============================================
           CRÉER DOCUMENT LIVE
        ============================================ */

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
          `client-live-${liveId}`;


        const identity =
          `vendeur-${liveId}`;


        liveIdRef.current =
          liveId;


        setActiveLiveId(
          liveId
        );


        roomNameRef.current =
          roomName;


        /* ============================================
           TOKEN LIVEKIT
        ============================================ */

        const response =
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
                    "client-broadcaster",

                  roomName,

                }),

            }
          );


        if (!response.ok) {

          throw new Error(
            "Impossible d'obtenir le token LiveKit."
          );

        }


        const data =
          await response.json();


        /* ============================================
           CONNEXION LIVEKIT
        ============================================ */

        const room =
          new Room();


        roomRef.current =
          room;


        await room.connect(
          data.url,
          data.token
        );


        /* ============================================
           LIBÉRER PROPREMENT L'APERÇU LOCAL

           Android / WebView peut garder la caméra occupée
           pendant un court instant après track.stop().
           On arrête donc l'aperçu, on détache la vidéo,
           puis on laisse un petit délai avant que LiveKit
           ouvre sa propre caméra et son microphone.
        ============================================ */

        if (previewStreamRef.current) {

          previewStreamRef.current
            .getTracks()
            .forEach((track) => {
              track.stop();
            });

          previewStreamRef.current = null;
        }

        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        }

        /*
           Important sur Android : attendre que la caméra
           soit réellement libérée avant de la rouvrir.
        */
        await new Promise((resolve) =>
          setTimeout(resolve, 700)
        );

        /* ============================================
           PUBLIER CAMÉRA + MICRO LIVEKIT
        ============================================ */

        try {
          await room.localParticipant
            .enableCameraAndMicrophone();
        } catch (mediaError) {
          console.error(
            "Erreur activation caméra/micro LiveKit :",
            mediaError
          );

          throw new Error(
            mediaError?.message ||
              "Impossible de démarrer la caméra ou le microphone pour le LIVE."
          );
        }


        /* ============================================
           ATTACHER LA CAMÉRA AVANT PLEIN ÉCRAN
        ============================================ */

        const publications =
          Array.from(
            room.localParticipant
              .trackPublications
              .values()
          );


        const cameraPublication =
          publications.find(
            (publication) =>
              publication.track?.kind ===
              "video"
          );


        if (
          cameraPublication?.track &&
          videoRef.current
        ) {

          cameraPublication.track.attach(
            videoRef.current
          );

        }


        /* ============================================
           ENREGISTREMENT
        ============================================ */

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
                    "client",

                }),

            }
          );


        if (
          !recordingResponse.ok
        ) {

          const recordingError =
            await recordingResponse
              .json()
              .catch(
                () => ({})
              );


          throw new Error(
            recordingError.error ||
            "Impossible de démarrer l'enregistrement."
          );

        }


        const recordingData =
          await recordingResponse
            .json();


        egressIdRef.current =
          recordingData.egressId;


        recordingFilePathRef.current =
          recordingData.filePath;


        /* ============================================
           FIREBASE
        ============================================ */

        await setDoc(
          liveRef,
          {

            isLive:
              true,

            liveType:
              "client",

            ownerId:
              currentUser.userId,

            ownerEmail:
              currentUser.email ||
              "",

            title:
              productName.trim(),

            sellerName:
              sellerName.trim(),

            productName:
              productName.trim(),

            price:
              price.trim(),

            description:
              description.trim(),

            roomName,

            broadcasterIdentity:
              identity,

            egressId:
              recordingData.egressId,

            recordingFilePath:
              recordingData.filePath,

            recordingStatus:
              "recording",

            hasReplay:
              false,

            replayPublished:
              false,

            highlightStatus:
              "waiting",

            highlightPublished:
              false,

            stoppedBy:
              null,

            startedAt:
              serverTimestamp(),

          }
        );


        /*
          IMPORTANT :
          Le passage à true crée le nouveau
          <video> plein écran.

          Le useEffect plus haut rattache
          automatiquement la piste caméra.
        */

        setViewerCount(0);

        setIsLiveStarted(true);

        setIsCameraStarted(true);

        setError("");


      } catch (err) {

        console.error(
          "Erreur démarrage LIVE client :",
          err
        );


        if (
          egressIdRef.current
        ) {

          try {

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

                    egressId:
                      egressIdRef.current,

                  }),

              }
            );


          } catch (
            recordingStopError
          ) {

            console.error(
              "Erreur arrêt enregistrement après échec :",
              recordingStopError
            );

          }

        }


        await cleanupClientMedia();


        egressIdRef.current =
          null;

        recordingFilePathRef.current =
          null;

        liveIdRef.current =
          null;

        roomNameRef.current =
          null;


        setActiveLiveId(null);

        setViewerCount(0);

        setIsLiveStarted(false);


        setError(
          `Impossible de démarrer votre LIVE. ${
            err.message || ""
          }`
        );


      } finally {

        setIsStarting(false);

      }

    };


  /* =====================================================
     ARRÊTER LE LIVE
  ===================================================== */

  const stopLive =
    async () => {

      try {

        normalStopRef.current =
          true;


        const currentLiveId =
          liveIdRef.current;


        const currentEgressId =
          egressIdRef.current;


        const currentRecordingFilePath =
          recordingFilePathRef.current;


        /* ============================================
           ARRÊTER ENREGISTREMENT
        ============================================ */

        if (
          currentEgressId
        ) {

          const recordingResponse =
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

                    egressId:
                      currentEgressId,

                    recordingFilePath:
                      currentRecordingFilePath,

                    liveId:
                      currentLiveId,

                    liveType:
                      "client",

                  }),

              }
            );


          if (
            !recordingResponse.ok
          ) {

            const recordingError =
              await recordingResponse
                .json()
                .catch(
                  () => ({})
                );


            console.error(
              "Erreur arrêt enregistrement LIVE Client :",
              recordingError
            );

          }

        }


        /* ============================================
           DÉCONNECTER
        ============================================ */

        await cleanupClientMedia();


        /* ============================================
           URL REPLAY
        ============================================ */

        const r2PublicUrl =
          import.meta.env
            .VITE_R2_PUBLIC_URL;


        const recordingUrl =
          currentRecordingFilePath &&
          r2PublicUrl
            ? `${r2PublicUrl.replace(
                /\/$/,
                ""
              )}/${currentRecordingFilePath}`
            : null;


        /* ============================================
           FIREBASE
        ============================================ */

        if (
          currentLiveId
        ) {

          await setDoc(
            doc(
              db,
              "live",
              currentLiveId
            ),
            {

              isLive:
                false,

              recordingStatus:
                "stopped",

              recordingFilePath:
                currentRecordingFilePath ||
                null,

              recordingUrl,

              hasReplay:
                Boolean(
                  recordingUrl
                ),

              replayPublished:
                Boolean(
                  recordingUrl
                ),

              highlightStatus:
                currentRecordingFilePath
                  ? "processing"
                  : "unavailable",

              highlightPublished:
                false,

              stoppedBy:
                "client",

              stoppedAt:
                serverTimestamp(),

            },
            {
              merge: true,
            }
          );


          if (
            currentRecordingFilePath
          ) {

            waitForHighlight(
              currentLiveId
            );

          }

        }


        /* ============================================
           NETTOYAGE
        ============================================ */

        egressIdRef.current =
          null;

        recordingFilePathRef.current =
          null;

        liveIdRef.current =
          null;

        roomNameRef.current =
          null;


        setActiveLiveId(null);

        setMessages([]);

        setMessage("");

        setSelectedMessage(null);

        setViewerCount(0);

        setIsLiveStarted(false);

        setIsCameraStarted(false);

        setError("");


        alert(
          "⏹️ Votre LIVE est arrêté. Votre Replay a été enregistré et votre Temps fort est en préparation."
        );


      } catch (err) {

        console.error(
          "Erreur arrêt LIVE client :",
          err
        );


        setError(
          `Impossible d'arrêter correctement le LIVE. ${
            err.message || ""
          }`
        );


      } finally {

        normalStopRef.current =
          false;

      }

    };


  /* =====================================================
     RETOUR
  ===================================================== */

  const handleBack =
    async () => {

      if (
        isLiveStarted
      ) {

        await stopLive();

      } else {

        await cleanupClientMedia();

      }


      onBack();

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
     ÉCRAN PRÉSENTATEUR PENDANT LE LIVE
  ===================================================== */

  if (
    isLiveStarted
  ) {

    return (

      <div className="umi-tiktok-live">

        {/* ==========================================
            VIDÉO PLEIN ÉCRAN
        ========================================== */}

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


        {/* ==========================================
            HAUT
        ========================================== */}

        <div className="umi-live-overlay-top">

          <div className="umi-live-top-left">

            <div className="umi-live-profile-circle">

              {sellerName
                ?.charAt(0)
                ?.toUpperCase() ||
                "V"}

            </div>


            <div className="umi-live-profile-info">

              <strong>

                {sellerName ||
                  "Vendeur"}

              </strong>


              <span>

                {productName}

              </span>

            </div>


            <div className="umi-live-red-badge">

              ● EN DIRECT

            </div>

          </div>


          {/* COMPTEUR + ARRÊTER LE LIVE */}

          <div className="umi-live-top-right">

            <div className="umi-live-viewers">
              👁 {viewerCount}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >

              <button
                type="button"
                className="umi-live-power-button"
                onClick={stopLive}
                title="Arrêter le LIVE"
                aria-label="Arrêter le LIVE"
              >
                <span
                  className="umi-power-symbol"
                  aria-hidden="true"
                ></span>
              </button>

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


        {/* ==========================================
            COMMENTAIRES
        ========================================== */}

        <div className="umi-live-comments">

          {messages
            .slice(-8)
            .map(
              (item) => {

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

                      {(
                        item.userName?.[0] ||
                        "S"
                      ).toUpperCase()}

                    </div>


                    <div className="umi-live-comment-content">

                      <strong>

                        {item.userName ||
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


          <div
            ref={chatEndRef}
          />

        </div>


        {/* ==========================================
            ERREUR CHAT
        ========================================== */}

        {chatError && (

          <div className="umi-live-chat-error">

            {chatError}

          </div>

        )}


        {/* ==========================================
            BAS DU LIVE
        ========================================== */}

        <div className="umi-live-bottom">


          {/* RÉPONDRE À */}

          {selectedMessage && (

            <div className="umi-live-reply-preview">

              <div>

                <strong>

                  Répondre à{" "}

                  {selectedMessage.userName ||
                    "Spectateur"}

                </strong>


                <span>

                  {selectedMessage.text}

                </span>

              </div>


              <button
                type="button"
                onClick={() =>
                  setSelectedMessage(
                    null
                  )
                }
              >

                ×

              </button>

            </div>

          )}


          {/* CHAMP COMMENTAIRE */}

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
              autoComplete="off"
              disabled={
                sendingMessage
              }
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
     PAGE AVANT LE LIVE
  ===================================================== */

  return (

    <div className="create-client-page">

      <header className="create-client-header">

        <button
          type="button"
          className="create-client-back"
          onClick={
            handleBack
          }
        >

          ←

        </button>


        <div>

          <h1>

            CRÉER MON LIVE

          </h1>


          <p>

            Présentez et vendez votre produit en direct

          </p>

        </div>

      </header>


      <main className="create-client-content">


        {/* ==========================================
            MESSAGE ADMIN
        ========================================== */}

        {adminStoppedMessage && (

          <div
            style={{
              marginBottom:
                "16px",

              padding:
                "15px",

              borderRadius:
                "12px",

              background:
                "#fff1f1",

              border:
                "1px solid #efb4b4",

              color:
                "#c62828",

              fontSize:
                "14px",

              fontWeight:
                "700",

              lineHeight:
                "1.4",

              textAlign:
                "center",
            }}
          >

            🛑 {adminStoppedMessage}

          </div>

        )}


        {/* ==========================================
            CAMÉRA
        ========================================== */}

        <section className="client-camera-section">

          <div className="client-camera-preview">

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
            />


            {!isCameraStarted && (

              <div className="client-camera-empty">

                <div>

                  📹

                </div>


                <p>

                  Votre caméra apparaîtra ici

                </p>

              </div>

            )}


            {isCameraStarted && (

              <div className="client-camera-ready">

                ● CAMÉRA PRÊTE

              </div>

            )}

          </div>


          <button
            type="button"
            className="client-camera-button"
            onClick={
              startCamera
            }
          >

            📹{" "}

            {isCameraStarted
              ? "Réactiver caméra et microphone"
              : "Activer caméra et microphone"}

          </button>

        </section>


        {/* ==========================================
            PRODUIT
        ========================================== */}

        <section className="client-product-form">

          <div className="client-form-heading">

            <div className="client-form-icon">

              🛒

            </div>


            <div>

              <h2>

                Produit à vendre

              </h2>


              <p>

                Ces informations seront visibles par les spectateurs.

              </p>

            </div>

          </div>


          <div className="client-form-group">

            <label>

              Nom du vendeur

            </label>


            <input
              type="text"
              value={
                sellerName
              }
              onChange={
                (event) =>
                  setSellerName(
                    event.target.value
                  )
              }
              placeholder="Exemple : Boutique Sylla"
            />

          </div>


          <div className="client-form-group">

            <label>

              Nom du produit

            </label>


            <input
              type="text"
              value={
                productName
              }
              onChange={
                (event) =>
                  setProductName(
                    event.target.value
                  )
              }
              placeholder="Exemple : Machine d'emballage"
            />

          </div>


          <div className="client-form-group">

            <label>

              Prix

            </label>


            <input
              type="text"
              value={
                price
              }
              onChange={
                (event) =>
                  setPrice(
                    event.target.value
                  )
              }
              placeholder="Exemple : 2 500 000 FCFA"
            />

          </div>


          <div className="client-form-group">

            <label>

              Description

            </label>


            <textarea
              value={
                description
              }
              onChange={
                (event) =>
                  setDescription(
                    event.target.value
                  )
              }
              placeholder="Décrivez votre produit..."
            />

          </div>

        </section>


        {/* ==========================================
            ERREUR
        ========================================== */}

        {error && (

          <div className="client-live-error">

            ⚠️ {error}

          </div>

        )}


        {/* ==========================================
            DÉMARRER
        ========================================== */}

        <button
          type="button"
          className="start-client-live-button"
          onClick={
            startLive
          }
          disabled={
            isStarting
          }
        >

          <span>

            ●

          </span>


          {isStarting
            ? "Démarrage du LIVE..."
            : "Démarrer mon LIVE"}

        </button>


        <p className="client-live-help">

          Votre caméra et votre microphone seront utilisés pendant le direct.

        </p>

      </main>

    </div>

  );

}


export default CreateClientLive;