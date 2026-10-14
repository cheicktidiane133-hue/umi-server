import { LiveBackgroundProcessor } from "./liveBackgroundProcessor";
import LiveTextOverlay from "./LiveTextOverlay";
import { queueHighlight } from "./highlightUploads";
import LiveMachineSelector from "./LiveMachineSelector";
import UmiModal from "./UmiModal";
import { withProductModel } from "./productModel";
import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent, createLocalTracks, Track, requestAgoraToken } from "./umiAgora";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { cameraOptions, createCameraCapture, improveCameraCapture, attachCamera } from "./umiCamera";
import "./CreateLive.css";
import "./UmiLive.css";
import "./UmiCamera.css";
import logoUmi from "./assets/logo-umi.jpeg";
import useLivePresence from "./useLivePresence";
/* =====================================================
   SERVEUR UMI
===================================================== */
const API_URL =
  import.meta.env.VITE_UMI_API_URL || "https://umi-server.onrender.com";
function CreateLiveContent({
  onBack,
  machines: adminMachines = [],
  clientMode = false,
  onOpenSpectatorPreview,
  userPhoto = "",
}) {
  const [clientProducts, setClientProducts] = useState([]);
  const machines = (clientMode ? clientProducts : adminMachines).map(withProductModel);
  const [galleryTarget, setGalleryTarget] = useState("");
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryName, setGalleryName] = useState("");
  const [galleryPrice, setGalleryPrice] = useState("");
  const [galleryDescription, setGalleryDescription] = useState("");
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const galleryInput = useRef(null);
  const openGallery = (target) => {
    setGalleryTarget(target); setGalleryFiles([]); setGalleryItems([]); setGalleryName(""); setGalleryPrice(""); setGalleryDescription("");
    galleryInput.current?.click();
  };
  const saveGalleryProduct = async () => {
    if (galleryBusy) return;
    if (!galleryFiles.length) { await umiNotify("Choisissez une photo ou une vidéo dans votre galerie."); return; }
    const rawPrice = galleryPrice.replace(/\s/g, "").replace(",", ".");
    if (rawPrice && (!Number.isFinite(Number(rawPrice)) || Number(rawPrice) < 0)) { await umiNotify("Le prix doit être un nombre positif."); return; }
    setGalleryBusy(true);
    try {
      const images = [], videos = [];
      for (const file of galleryFiles) {
        const video = file.type.startsWith("video/");
        const url = await uploadLiveMedia(file, video ? "video" : "image");
        (video ? videos : images).push(url);
      }
      const uid = auth.currentUser?.uid || getCurrentUser()?.userId || "";
      const id = `client-${uid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const product = { id, ownerId: uid, sellerId: uid, sellerName: getCurrentUser()?.nom || "", liveType: "client", productType: "machine", name: galleryName.trim(), description: galleryDescription.trim(), price: rawPrice ? Number(rawPrice) : null, imageUrl: images[0] || "", images, videos, videoUrl: videos[0] || "", models: [] };
      // Each selected similar media represents a separate product.
      const uploaded = [...images.map((url) => ({ url, video: false })), ...videos.map((url) => ({ url, video: true }))];
      const added = galleryTarget === "similar" ? uploaded.map((media, index) => {
        const info = galleryItems[index] || {};
        const itemPrice = String(info.price || rawPrice).replace(/\s/g, "").replace(",", ".");
        if (itemPrice && (!Number.isFinite(Number(itemPrice)) || Number(itemPrice) < 0)) throw new Error("Vérifiez le prix de chaque machine.");
        return { ...product, id: `${id}-${index}`, name: (info.name || "").trim() || product.name, price: itemPrice ? Number(itemPrice) : null, description: (info.description || "").trim() || product.description, images: media.video ? [] : [media.url], imageUrl: media.video ? "" : media.url, videos: media.video ? [media.url] : [], videoUrl: media.video ? media.url : "" };
      }) : [product];
      const next = [...clientProducts, ...added];
      const changes = { clientProducts: next };
      if (galleryTarget === "similar") {
        const ids = [...new Set([...similarMachines, ...added.map((item) => item.id)])]; setSimilarMachines(ids); changes.similarMachineIds = ids;
      } else if (galleryTarget === "offer") {
        setLiveOfferMachineId(id); changes.liveOfferMachineId = id; changes.liveOfferPercent = Number(liveOfferPercent) || 10;
      } else {
        setPresentedMachineId(id); setMachineName(product.name);
        setLiveDescription(product.description);
        Object.assign(changes, { machineId: id, productId: id, productName: product.name, machineName: product.name, price: product.price, description: product.description });
      }
      if (liveIdRef.current) await setDoc(doc(db, "live", liveIdRef.current), changes, { merge: true });
      setClientProducts(next); setGalleryTarget("");
    } catch (error) { await umiNotify(error.message || "Impossible d’importer ce produit."); }
    finally { setGalleryBusy(false); }
  };
  const galleryWindow = galleryTarget ? <UmiModal title="Importer depuis votre galerie" onClose={() => { if (!galleryBusy) setGalleryTarget(""); }}>
    <div style={{ padding: "18px", color: "#163a5c", display: "grid", gap: "14px" }}>
      <p>Renseignez les informations de votre produit.</p>
      <button type="button" className="umi-presenter-save-button" disabled={galleryBusy} onClick={() => galleryInput.current?.click()}>Choisir photos ou vidéos</button>
      <small>{galleryFiles.length} fichier(s) sélectionné(s)</small>
      {galleryTarget === "similar" && galleryFiles.map((file, index) => <fieldset key={`${file.name}-${index}`} style={{ border: "1px solid #dce6ef", borderRadius: 12, padding: 12 }}><legend>Machine {index + 1} · {file.name}</legend>{["name", "price", "description"].map((field) => <label key={field} style={{ display: "block", marginBottom: 8 }}>{field === "name" ? "Nom (facultatif)" : field === "price" ? "Prix en FCFA" : "Description"}<input value={galleryItems[index]?.[field] || ""} disabled={galleryBusy} onChange={(event) => setGalleryItems((items) => items.map((item, i) => i === index ? { ...item, [field]: event.target.value } : item))} style={{ width: "100%", padding: 10 }} /></label>)}</fieldset>)}
      <label>Nom du produit (facultatif)<input style={{ width: "100%", padding: "12px" }} value={galleryName} onChange={(e) => setGalleryName(e.target.value)} disabled={galleryBusy} /></label>
      <label>Prix en FCFA<input style={{ width: "100%", padding: "12px" }} inputMode="decimal" value={galleryPrice} onChange={(e) => setGalleryPrice(e.target.value)} disabled={galleryBusy} /></label>
      <label>Description<textarea style={{ width: "100%", padding: "12px" }} rows={4} value={galleryDescription} onChange={(e) => setGalleryDescription(e.target.value)} disabled={galleryBusy} /></label>
      <button type="button" className="umi-presenter-save-button" disabled={galleryBusy} onClick={saveGalleryProduct}>{galleryBusy ? "Importation…" : "Utiliser ce produit"}</button>
    </div>
  </UmiModal> : null;
  const galleryPicker = <input ref={galleryInput} type="file" accept="image/*,video/*" multiple hidden onChange={(event) => {
    const files = Array.from(event.target.files || []);
    const selected = [...files.filter((file) => file.type.startsWith("image/")).slice(0, 6), ...files.filter((file) => file.type.startsWith("video/")).slice(0, 3)];
    setGalleryFiles(selected); setGalleryItems(selected.map(() => ({ name: "", price: "", description: "" })));
    event.target.value = "";
  }} />;
  /* =====================================================
     INFORMATIONS LIVE
  ===================================================== */
  const [title, setTitle] =
    useState("");
const [presentedMachineId, setPresentedMachineId] = useState("");
const [showPresentedMachines, setShowPresentedMachines] = useState(false);
  const [machineName, setMachineName] =
    useState("");
const [startupVideoFile, setStartupVideoFile] =
  useState(null);
const [startupVideoPreview, setStartupVideoPreview] =
  useState("");
const startupVideoInputRef = useRef(null);
useEffect(() => {
  if (!startupVideoFile) {
    setStartupVideoPreview("");
    return;
  }
  const url = URL.createObjectURL(startupVideoFile);
  setStartupVideoPreview(url);
  return () => {
    URL.revokeObjectURL(url);
  };
}, [startupVideoFile]);
const handleStartupVideoChange = (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (!file.type.startsWith("video/")) {
    umiNotify("Choisissez un fichier vidéo.");
    return;
  }
  setStartupVideoFile(file);
};
  /* =====================================================
     DETAILS / MEDIAS DU LIVE
  ===================================================== */
  const [
    liveDescription,
    setLiveDescription,
  ] = useState("");
  const [
    livePhotos,
    setLivePhotos,
  ] = useState([]);
  const [
    liveVideos,
    setLiveVideos,
  ] = useState([]);
  const [
    showLiveOfferMachines,
    setShowLiveOfferMachinesState,
  ] = useState(false);
  const [
    liveOfferMachineId,
    setLiveOfferMachineId,
  ] = useState("");
  const [
    liveOfferPercent,
    setLiveOfferPercent,
  ] = useState(10);
  const [
    similarMachines,
    setSimilarMachines,
  ] = useState([]);
  const [
    showSimilarMachines,
    setShowSimilarMachinesState,
  ] = useState(false);
  const [
    isUploadingMedia,
    setIsUploadingMedia,
  ] = useState(false);
  const mediaFiles = useMemo(() => [...livePhotos, ...liveVideos], [livePhotos, liveVideos]);
  const [mediaUrls, setMediaUrls] = useState(new Map());
  useEffect(() => {
    const urls = new Map(mediaFiles.filter((file) => typeof file !== "string").map((file) => [file, URL.createObjectURL(file)]));
    setMediaUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [mediaFiles]);
  const getMediaPreview = (file) => typeof file === "string" ? file : mediaUrls.get(file) || "";
  const setShowLiveOfferMachines = (value) => {
    if (clientMode && value) openGallery("offer"); else setShowLiveOfferMachinesState(value);
  };
  const setShowSimilarMachines = (value) => {
    if (clientMode && value) openGallery("similar"); else setShowSimilarMachinesState(value);
  };
  /* =====================================================
     OUTILS DU PRÉSENTATEUR LIVE
  ===================================================== */
  const [
    presenterTool,
    setPresenterTool,
  ] = useState(null);
  const [
    isPresenterCameraEnabled,
    setIsPresenterCameraEnabled,
  ] = useState(true);
  const [
    isPresenterMicrophoneEnabled,
    setIsPresenterMicrophoneEnabled,
  ] = useState(true);
  const [
    presenterFilter,
    setPresenterFilter,
  ] = useState("none");
  const [
    presenterEffect,
    setPresenterEffect,
  ] = useState("none");
  const [
    presenterMedia,
    setPresenterMedia,
  ] = useState(null);
  const [presenterText, setPresenterText] = useState(null);
  const [presenterTextDraft, setPresenterTextDraft] = useState("");
  const presenterBackgroundInput = useRef(null);
  const backgroundProcessorRef = useRef(null);

  /* =====================================================
     ETAT DU LIVE
  ===================================================== */
  const [
    isCameraStarted,
    setIsCameraStarted,
  ] = useState(false);
  const [
    isLiveStarted,
    setIsLiveStarted,
  ] = useState(false);
  const [
    isStarting,
    setIsStarting,
  ] = useState(false);
  const [
    recordingStatus,
    setRecordingStatus,
  ] = useState("not-started");
  /* =====================================================
     CHAT
  ===================================================== */
  const [
    questions,
    setQuestions,
  ] = useState([]);
  const [
    questionsError,
    setQuestionsError,
  ] = useState("");
  const [
    activeLiveId,
    setActiveLiveId,
  ] = useState(null);
  const [presenterLikeCount, setPresenterLikeCount] = useState(0);

useEffect(() => {
  setPresenterLikeCount(0);

  if (!activeLiveId) return;

  return onSnapshot(
    doc(db, "live", activeLiveId),
    (snapshot) => {
      setPresenterLikeCount(Number(snapshot.data()?.likeCount) || 0);
      setSpectatorCount(Number(snapshot.data()?.agoraViewerCount) || 0);
      if (snapshot.data()?.stoppedByAdmin && roomRef.current) {
        roomRef.current.disconnect().catch(console.error);
        roomRef.current = null;
        const session = localRecordingRef.current;
        if (session) {
          clearTimeout(session.timer);
          if (session.recorder.state !== "inactive") session.recorder.stop();
        }
        setIsLiveStarted(false);
        setIsCameraStarted(false);
        cameraTracksRef.current.forEach((track) => track.stop());
        cameraTracksRef.current = [];
      }
    },
    (error) => {
      console.error("Erreur compteur J’aime :", error);
    }
  );
}, [activeLiveId]);
  const [
    message,
    setMessage,
  ] = useState("");
  const [
    sendingMessage,
    setSendingMessage,
  ] = useState(false);
  const [
    selectedMessage,
    setSelectedMessage,
  ] = useState(null);
  /* =====================================================
     SPECTATEURS
  ===================================================== */
  const [
    spectatorCount,
    setSpectatorCount,
  ] = useState(0);
  /* =====================================================
     REFERENCES
  ===================================================== */
  const videoRef =
    useRef(null);
  const previewStreamRef =
    useRef(null);
  const cameraTracksRef = useRef([]);
  const cameraFacingRef = useRef("user");
  const cameraBusyRef = useRef(false);
  const bindCameraVideo = useCallback((element) => {
    const track = cameraTracksRef.current.find((item) => item.kind === "video");
    if (videoRef.current && track) track.detach(videoRef.current);
    videoRef.current = element;
    if (element && track) attachCamera(track, element, cameraFacingRef.current).catch(console.error);
  }, []);
  const roomRef =
    useRef(null);
  const liveIdRef =
    useRef(null);
  const roomNameRef =
    useRef(null);
  const identityRef =
    useRef(null);
  const egressIdRef =
    useRef(null);
  const recordingFilePathRef =
    useRef(null);
  const messageInputRef =
    useRef(null);
  const chatEndRef =
    useRef(null);
  /* =====================================================
     OUVRIR / FERMER UN MODULE PRÉSENTATEUR
  ===================================================== */
  const togglePresenterTool = (tool) => {
    if (clientMode && ["product", "similar", "offer"].includes(tool)) openGallery(tool);
    setPresenterTool(
      (current) =>
        current === tool
          ? null
          : tool
    );
  };
  /* =====================================================
     MODIFIER LE LIVE DANS FIREBASE
  ===================================================== */
  const updateCurrentLive =
    async (data) => {
      const liveId =
        liveIdRef.current;
      if (!liveId) {
        return false;
      }
      try {
        await setDoc(
          doc(
            db,
            "live",
            liveId
          ),
          { ...data, ...(clientMode ? { clientProducts } : {}) },
          {
            merge: true,
          }
        );
        return true;
      } catch (error) {
        console.error(
          "Erreur modification LIVE :",
          error
        );
        await umiNotify("Impossible d’enregistrer la modification du live.");
        return false;
      }
    };
  const savePresenterText = async () => {
    const text = presenterTextDraft.trim().slice(0, 300);
    const next = text ? { text, x: presenterText?.x ?? 0.1, y: presenterText?.y ?? 0.3 } : null;
    if (await updateCurrentLive({ presenterText: next })) {
      setPresenterText(next);
      setPresenterTool(null);
    }
  };
  const movePresenterText = async (next) => {
    setPresenterText(next);
    await updateCurrentLive({ presenterText: next });
  };
  /* =====================================================
     ACTIVER / DÉSACTIVER MICRO
  ===================================================== */
  const togglePresenterMicrophone =
    async () => {
      const room =
        roomRef.current;
      if (!room) {
        return;
      }
      try {
        const nextValue =
          !isPresenterMicrophoneEnabled;
        await room.localParticipant
          .setMicrophoneEnabled(
            nextValue
          );
        setIsPresenterMicrophoneEnabled(
          nextValue
        );
      } catch (error) {
        console.error(
          "Erreur microphone LIVE :",
          error
        );
      }
    };
  /* =====================================================
     ACTIVER / DÉSACTIVER CAMÉRA
  ===================================================== */
  const togglePresenterCamera =
    async () => {
      const room =
        roomRef.current;
      if (!room) {
        return;
      }
      try {
        const nextValue =
          !isPresenterCameraEnabled;
        await room.localParticipant
          .setCameraEnabled(
            nextValue
          );
        const camera = cameraTracksRef.current.find((track) => track.kind === "video");
        if (nextValue && camera && videoRef.current) {
          await improveCameraCapture(camera.mediaStreamTrack);
          await attachCamera(camera, videoRef.current, cameraFacingRef.current);
        }
        setIsPresenterCameraEnabled(nextValue);
      } catch (error) {
        console.error(
          "Erreur caméra LIVE :",
          error
        );
      }
    };
  /* =====================================================
     MODIFIER OFFRE LIVE
  ===================================================== */
  const savePresenterOffer =
    async () => {
      const saved = await updateCurrentLive({
        liveOfferMachineId:
          liveOfferMachineId || "",
        liveOfferPercent:
          liveOfferMachineId
            ? Number(
                liveOfferPercent
              ) || 0
            : 0,
      });
      if (saved) setPresenterTool(null);
    };
  /* =====================================================
     MODIFIER MACHINES SIMILAIRES
  ===================================================== */
  const savePresenterSimilarMachines =
    async () => {
      const saved = await updateCurrentLive({
        similarMachineIds:
          similarMachines,
      });
      if (saved) setPresenterTool(null);
    };
  /* =====================================================
     CHOISIR LE PRODUIT PRINCIPAL
  ===================================================== */
  const selectPresenterProduct = async (machine) => {
    if (!machine?.id) return;
    const saved = await updateCurrentLive({
      machineId: machine.id,
      productId: machine.id,
      machineName: machine.name || "",
      productName: machine.name || "",
    });
    if (!saved) return;
    setPresentedMachineId(machine.id);
    setMachineName(machine.name || "");
    setPresenterTool(null);
  };
  /* =====================================================
     FILTRE CAMÉRA
  ===================================================== */
  const selectPresenterFilter = async (filter) => {
  const saved = await updateCurrentLive({
    presenterFilter: filter,
  });

  if (!saved) return;

  setPresenterFilter(filter);
  setPresenterTool(null);
};
  /* =====================================================
     EFFET LIVE
  ===================================================== */
  const selectPresenterEffect = async (effect) => {
  const saved = await updateCurrentLive({
    presenterEffect: effect,
  });

  if (!saved) return;

  setPresenterEffect(effect);
  setPresenterTool(null);
};
  /* =====================================================
     PHOTO / VIDÉO SUR LE LIVE
  ===================================================== */
  const playPresenterMedia = async (source, type) => {
    if (!source || isUploadingMedia || !["image", "video"].includes(type)) return;
    setIsUploadingMedia(true);
    try {
      let url = source;
      if (typeof source !== "string") {
        url = await uploadLiveMedia(source, type);
      } else if (source.startsWith("blob:")) {
        const response = await fetch(source);
        if (!response.ok) throw new Error("Impossible de lire le média sélectionné.");
        url = await uploadLiveMedia(await response.blob(), type);
      }
      if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
        throw new Error("Le média n’a pas d’adresse publique accessible.");
      }
      const media = { url, type, startedAt: Date.now(), layer: "background", composited: true };
      const camera = cameraTracksRef.current.find((track) => track.kind === "video");
      if (!camera?.setProcessor) throw new Error("Réactivez la caméra pour appliquer le fond virtuel.");
      await camera.stopProcessor();
      backgroundProcessorRef.current = null;
      const processor = new LiveBackgroundProcessor(media, async () => {
        await camera.stopProcessor();
        backgroundProcessorRef.current = null;
        await updateCurrentLive({ presenterMedia: null });
        setPresenterMedia(null);
        await umiNotify("Le fond virtuel a été interrompu. La caméra normale reste active.");
      });
      backgroundProcessorRef.current = processor;
      await camera.setProcessor(processor, true);
      if (videoRef.current) await attachCamera(camera, videoRef.current, cameraFacingRef.current);
      const saved = await updateCurrentLive({ presenterMedia: media });
      if (!saved) { await camera.stopProcessor(); backgroundProcessorRef.current = null; return; }
      setPresenterMedia(media);
      setPresenterTool(null);
    } catch (error) {
      const camera = cameraTracksRef.current.find((track) => track.kind === "video");
      try { await camera?.stopProcessor?.(); } catch {}
      backgroundProcessorRef.current = null;
      setPresenterMedia(null);
      await updateCurrentLive({ presenterMedia: null });
      console.error("Erreur partage du fond LIVE :", error);
      await umiNotify(error?.message || "Impossible de partager le fond avec les spectateurs.");
    } finally {
      setIsUploadingMedia(false);
    }
  };
  /* Retour caméra partagé avec les spectateurs. */
  const stopPresenterMedia = async () => {
    const saved = await updateCurrentLive({ presenterMedia: null });
    if (saved) {
      const camera = cameraTracksRef.current.find((track) => track.kind === "video");
      await camera?.stopProcessor?.();
      backgroundProcessorRef.current = null;
      setPresenterMedia(null);
      if (camera && videoRef.current) await attachCamera(camera, videoRef.current, cameraFacingRef.current);
    }
  };
  /* =====================================================
     URL PUBLIQUE R2
  ===================================================== */
  const getR2PublicUrl = () => {
    const url =
      import.meta.env
        .VITE_R2_PUBLIC_URL;
    if (!url) {
      console.error(
        "VITE_R2_PUBLIC_URL manque dans .env"
      );
      return "";
    }
    return url.replace(
      /\/$/,
      ""
    );
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
      return JSON.parse(
        saved
      );
    } catch (error) {
      console.error(
        "Erreur lecture utilisateur :",
        error
      );
      return null;
    }
  };
  useLivePresence(activeLiveId, isLiveStarted, roomRef);

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
                id:
                  questionDoc.id,
                ...questionDoc.data(),
              })
            );
          list.sort(
            (a, b) => {
              const aTime =
                a.createdAt?.seconds ||
                0;
              const bTime =
                b.createdAt?.seconds ||
                0;
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
      chatEndRef.current
        .scrollIntoView({
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
  /* =====================================================
     COMPTER LES SPECTATEURS
  ===================================================== */
  const updateSpectatorCount = () => {}; // Compteur reçu depuis le document du live.
  /* =====================================================
     SÉLECTIONNER MESSAGE
  ===================================================== */
  const selectMessageToReply =
    (item) => {
      setSelectedMessage(
        item
      );
      try {
        messageInputRef.current
          ?.focus({
            preventScroll: true,
          });
      } catch {
        messageInputRef.current
          ?.focus();
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
  const sendMessage =
    async () => {
      console.log(
        "PHOTO ADMIN :",
        userPhoto
      );
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
          let commentPhoto =
  userPhoto ||
  currentUser?.photoURL ||
  auth.currentUser?.photoURL ||
  "";

const profileUserId =
  auth.currentUser?.uid ||
  currentUser?.userId;

if (profileUserId) {
  try {
    const profileSnapshot = await getDoc(
      doc(db, "users", profileUserId)
    );

    if (profileSnapshot.exists()) {
      commentPhoto =
        profileSnapshot.data()?.photoURL ||
        commentPhoto;
    }
  } catch (error) {
    console.error(
      "Erreur photo du commentaire :",
      error
    );
  }
}
        console.log(
          "PHOTO ADMIN COMMENTAIRE :",
          userPhoto
        );
        console.log(
          "UTILISATEUR ADMIN :",
          currentUser
        );
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
            userPhoto: commentPhoto,
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
                ? selectedMessage
                    .senderRole ===
                  "presenter"
                  ? "UMI"
                  : selectedMessage
                      .userName ||
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
     ATTENDRE TEMPS FORT
  ===================================================== */
  const waitForHighlight =
    async (
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
              .catch(
                () => ({})
              );
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
            return {
              success: false,
            };
          }
        } catch (error) {
          console.error(
            "Erreur attente Temps fort :",
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
    if (cameraBusyRef.current) return;
    cameraBusyRef.current = true;
    try {
      cameraTracksRef.current.forEach((track) => track.stop());
      cameraTracksRef.current = [];
      const tracks = await createCameraCapture(createLocalTracks, cameraFacingRef.current);
      cameraTracksRef.current = tracks;
      const camera = tracks.find((track) => track.kind === "video");
      await improveCameraCapture(camera.mediaStreamTrack);
      previewStreamRef.current = new MediaStream(tracks.map((track) => track.mediaStreamTrack));
      if (videoRef.current) await attachCamera(camera, videoRef.current, cameraFacingRef.current);
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
        await umiNotify(
          "L'accès à la caméra ou au microphone a été refusé. Vérifiez les autorisations de UMI dans les paramètres du téléphone."
        );
      } else if (
        error?.name ===
        "NotReadableError"
      ) {
        await umiNotify(
          "La caméra ou le microphone est déjà utilisé par une autre application."
        );
      } else if (
        error?.name ===
        "NotFoundError"
      ) {
        await umiNotify(
          "Aucune caméra ou aucun microphone n'a été trouvé."
        );
      } else {
        await umiNotify(
          `Impossible d'accéder à la caméra ou au microphone.\n\n${
            error?.message || ""
          }`
        );
      }
    } finally { cameraBusyRef.current = false; }
  };
  /* =====================================================
     RETOURNER LA CAMÉRA
  ===================================================== */
  const switchCamera = async () => {
    if (cameraBusyRef.current) return;
    const camera = cameraTracksRef.current.find((track) => track.kind === "video");
    if (!camera) return;
    cameraBusyRef.current = true;
    const previous = cameraFacingRef.current;
    const next = previous === "user" ? "environment" : "user";
    try {
      await camera.restartTrack(cameraOptions(next));
      const actual = camera.mediaStreamTrack.getSettings().facingMode;
      if (actual && actual !== next) throw new Error("Cette caméra n'est pas disponible sur cet appareil.");
      await improveCameraCapture(camera.mediaStreamTrack);
      cameraFacingRef.current = next;
      previewStreamRef.current = new MediaStream(cameraTracksRef.current.map((track) => track.mediaStreamTrack));
      if (videoRef.current) await attachCamera(camera, videoRef.current, cameraFacingRef.current);
    } catch (error) {
      try {
        await camera.restartTrack(cameraOptions(previous));
        cameraFacingRef.current = previous;
        await improveCameraCapture(camera.mediaStreamTrack);
        if (videoRef.current) await attachCamera(camera, videoRef.current, cameraFacingRef.current);
      } catch { setIsCameraStarted(false); }
      await umiNotify(error.message || "Impossible de changer de caméra.");
    } finally { cameraBusyRef.current = false; }
  };
  /* =====================================================
     UPLOAD CLOUDINARY - PHOTOS / VIDEOS DU LIVE
  ===================================================== */
  const uploadLiveMedia = async (
    file,
    resourceType = "image"
  ) => {
    const cloudName =
      import.meta.env
        .VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset =
      import.meta.env
        .VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName) {
      throw new Error(
        "VITE_CLOUDINARY_CLOUD_NAME est manquant dans le fichier .env"
      );
    }
    if (!uploadPreset) {
      throw new Error(
        "VITE_CLOUDINARY_UPLOAD_PRESET est manquant dans le fichier .env"
      );
    }
    const formData =
      new FormData();
    formData.append(
      "file",
      file
    );
    formData.append(
      "upload_preset",
      uploadPreset
    );
    const response =
      await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
    const data =
      await response.json();
    if (!response.ok) {
      console.error(
        "Erreur Cloudinary LIVE :",
        data
      );
      throw new Error(
        data?.error?.message ||
        "Impossible d'envoyer le fichier."
      );
    }
    if (!data.secure_url) {
      throw new Error(
        "Cloudinary n'a pas retourné l'adresse du fichier."
      );
    }
    return data.secure_url;
  };
  /* =====================================================
     DÉMARRER LIVE
  ===================================================== */
  const startLive = async (
    event
  ) => {
    event.preventDefault();
    if (clientMode && !auth.currentUser) { await umiNotify("Connectez-vous pour lancer un direct."); return; }
    if (!isCameraStarted) {
      await umiNotify(
        "Active d'abord la caméra et le microphone."
      );
      return;
    }
    if (localRecordingRef.current) {
      await umiNotify("Publiez d’abord le temps fort en attente avec le bouton Réessayer.");
      return;
    }
    let createdRoom =
      null;
    try {
      setIsStarting(true);
      if (!auth.currentUser) throw new Error("Reconnectez-vous pour lancer le direct.");
      const accountSnapshot = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (!accountSnapshot.exists() || accountSnapshot.data().blocked || accountSnapshot.data().deleting || (!clientMode && accountSnapshot.data().role !== "admin")) throw new Error("Ce compte n’est pas autorisé à lancer ce direct.");
      const presenterToken = await auth.currentUser.getIdToken();
      setRecordingStatus(
        "starting"
      );
      setQuestions([]);
      setQuestionsError("");
      setSelectedMessage(null);
      setMessage("");
      setPresenterMedia(null);
      setPresenterText(null);
      setPresenterTextDraft("");
setPresenterTool(null);
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
        `${clientMode ? "client" : "admin"}-${liveId}`;
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
      await setDoc(liveRef, {
        isLive: false, transport: "agora", ownerId: auth.currentUser.uid,
        presenterId: auth.currentUser.uid, liveType: clientMode ? "client" : "umi",
        roomName, recordingStatus: "starting", createdAt: serverTimestamp(),
      });
      const tokenData = await requestAgoraToken(API_URL, liveId, "host");
      /* =================================================
         3. CONNEXION AGORA
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
        (participant) => {
          updateSpectatorCount(room, participant?.identity || "");
        }
      );
      room.on(
        RoomEvent.Disconnected,
        () => {
          setSpectatorCount(0);
        }
      );
      await room.connect(tokenData);
      updateSpectatorCount(
        room
      );
      // Publier la capture déjà vérifiée sans fermer puis rouvrir la caméra.
      const camera = cameraTracksRef.current.find((track) => track.kind === "video");
      if (!camera || camera.mediaStreamTrack.readyState !== "live") {
        throw new Error("Réactivez la caméra et vérifiez l'aperçu avant de démarrer.");
      }
      for (const track of cameraTracksRef.current) {
        await room.localParticipant.publishTrack(track, {
          source: track.kind === "video" ? Track.Source.Camera : Track.Source.Microphone,
          ...(track.kind === "video" ? {
            simulcast: true,
            videoEncoding: { maxBitrate: 2500000, maxFramerate: 30 },
            degradationPreference: "maintain-resolution",
          } : {}),
        });
      }
      if (videoRef.current) await attachCamera(camera, videoRef.current, cameraFacingRef.current);
      /* =================================================
         7. ENREGISTREMENT DU LIVE
         Si Egress échoue, le LIVE continue
      ================================================= */
      startLocalRecording(room);
      const recordingData = { local: true };
      setRecordingStatus("recording");
      /* =================================================
         8. UPLOAD PHOTOS ET VIDEOS DU LIVE
      ================================================= */
      setIsUploadingMedia(
        true
      );
      const photoUrls = [];
      for (
        const photo of livePhotos
      ) {
        const photoUrl =
          await uploadLiveMedia(
            photo,
            "image"
          );
        photoUrls.push(
          photoUrl
        );
      }
      const videoUrls = [];
      for (
        const video of liveVideos
      ) {
        const videoUrl =
          await uploadLiveMedia(
            video,
            "video"
          );
        videoUrls.push(
          videoUrl
        );
      }
      setIsUploadingMedia(
        false
      );
      console.log(
        "PHOTO PRESENTATEUR AVANT LIVE :",
        userPhoto
      );
            /* =================================================
         9. FIREBASE
      ================================================= */
      const presenterAccount = getCurrentUser();

let presenterPhoto =
  userPhoto ||
  presenterAccount?.photoURL ||
  auth.currentUser?.photoURL ||
  "";

const presenterUserId =
  auth.currentUser?.uid ||
  presenterAccount?.userId;

if (presenterUserId) {
  try {
    const profileSnapshot = await getDoc(
      doc(db, "users", presenterUserId)
    );

    if (profileSnapshot.exists()) {
      presenterPhoto =
        profileSnapshot.data()?.photoURL ||
        presenterPhoto;
    }
  } catch (error) {
    console.error(
      "Erreur chargement photo du présentateur :",
      error
    );
  }
}
      await setDoc(
        liveRef,
        {
          isLive: true,
          transport: "agora",
          ownerId: auth.currentUser.uid,
          presenterId: auth.currentUser.uid,
          presenterFilter, presenterEffect,
          liveType: clientMode ? "client" : "umi",
          ...(clientMode ? {
            ownerId: presenterUserId || "", ownerEmail: presenterAccount?.email || "",
            sellerName: presenterAccount?.nom || "", presenterId: presenterUserId || "",
            clientProducts,
            price: machines.find((m) => m.id === presentedMachineId)?.price ?? null,
          } : {}),
          title:
            title.trim(),
          machineName:
            machineName.trim(),
          machineId: presentedMachineId,
          productId: presentedMachineId,
          productName: machineName.trim(),
          similarMachineIds:
            similarMachines,
          liveOfferMachineId:
            liveOfferMachineId ||
            "",
          liveOfferPercent:
            liveOfferMachineId
              ? Number(
                  liveOfferPercent
                ) || 0
              : 0,
          description:
            liveDescription.trim() || (clientMode ? machines.find((m) => m.id === presentedMachineId)?.description || "" : ""),
          photos:
            photoUrls,
          videos:
            videoUrls,
          roomName,
          broadcasterIdentity:
            identity,
          presenterPhoto,
          egressId:
            recordingData?.egressId ||
            null,
          recordingFilePath:
            recordingData?.filePath ||
            null,
          recordingStatus:
            recordingData
              ? "recording"
              : "not-recording",
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
        },
        { merge: true }
      );
      setIsCameraStarted(
        true
      );
      setIsLiveStarted(
        true
      );
    } catch (error) {
      console.error(
        "Erreur démarrage LIVE :",
        error
      );
      setRecordingStatus(
        "error"
      );
      const session = localRecordingRef.current;
      if (session) {
        clearTimeout(session.timer);
        if (session.recorder.state !== "inactive") session.recorder.stop();
        localRecordingRef.current = null;
      }
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
      cameraTracksRef.current.forEach((track) => track.stop());
      cameraTracksRef.current = [];
      if (videoRef.current) videoRef.current.srcObject = null;
      if (liveIdRef.current) {
        await setDoc(doc(db, "live", liveIdRef.current), {
          isLive: false, stoppedAt: serverTimestamp(), recordingStatus: "error",
        }, { merge: true }).catch(console.error);
      }
      liveIdRef.current =
        null;
      setActiveLiveId(
        null
      );
      roomNameRef.current =
        null;
      identityRef.current =
        null;
      egressIdRef.current =
        null;
      recordingFilePathRef.current =
        null;
      setSpectatorCount(
        0
      );
      setIsLiveStarted(
        false
      );
      setIsCameraStarted(false);
      await umiNotify(
        `Impossible de démarrer le LIVE.\n\n${
          error.message ||
          "Erreur inconnue"
        }`
      );
    } finally {
      setIsStarting(false);
      setIsUploadingMedia(false);
    }
  };
  /* =====================================================
     ARRÊTER LIVE
  ===================================================== */
  const localRecordingRef = useRef(null);
  const stoppingLocalRef = useRef(false);
  const startLocalRecording = (room) => {
    if (!window.MediaRecorder) throw new Error("Ce navigateur ne permet pas l’enregistrement. Essayez Chrome sur Android ou Safari sur iPhone.");
    const tracks = Array.from(room.localParticipant.trackPublications.values())
      .map((publication) => publication.track?.mediaStreamTrack)
      .filter((track) => track && track.readyState === "live");
    if (!tracks.some((track) => track.kind === "video") || !tracks.some((track) => track.kind === "audio")) {
      throw new Error("Caméra et micro requis pour le temps fort.");
    }
    const mimeType = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      .find((type) => MediaRecorder.isTypeSupported(type));
    // Une piste canvas stable permet de retourner la caméra sans couper le temps fort.
    const camera = cameraTracksRef.current.find((track) => track.kind === "video");
    const recordingVideo = document.createElement("video");
    recordingVideo.muted = true;
    recordingVideo.playsInline = true;
    camera.attach(recordingVideo);
    recordingVideo.play().catch(console.error);
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const context = canvas.getContext("2d");
    let frameTimer;
    let recordingStream;
    const drawFrame = () => {
      context.fillStyle = "#000";
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (recordingVideo.readyState >= 2 && recordingVideo.videoWidth) {
        const scale = Math.min(canvas.width / recordingVideo.videoWidth, canvas.height / recordingVideo.videoHeight);
        const width = recordingVideo.videoWidth * scale;
        const height = recordingVideo.videoHeight * scale;
        context.save();
        if (cameraFacingRef.current !== "environment") {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        context.drawImage(recordingVideo, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        context.restore();
      }
    };
    const cleanupRecordingVideo = () => {
      clearInterval(frameTimer);
      camera.detach(recordingVideo);
      recordingVideo.srcObject = null;
      recordingStream?.getVideoTracks().forEach((track) => track.stop());
    };
    try {
      drawFrame();
      recordingStream = canvas.captureStream(30);
      tracks.filter((track) => track.kind === "audio").forEach((track) => recordingStream.addTrack(track));
      frameTimer = setInterval(drawFrame, 1000 / 30);
    } catch (error) { cleanupRecordingVideo(); throw error; }
    let recorder;
    try { recorder = new MediaRecorder(recordingStream, {
      ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 1500000,
      audioBitsPerSecond: 64000,
    }); } catch (error) { cleanupRecordingVideo(); throw error; }
    const session = { recorder, chunks: [], blob: null, error: null, timer: null };
    session.done = new Promise((resolve) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size) session.chunks.push(event.data);
      };
      recorder.onerror = () => { session.error = new Error("L’enregistrement local a échoué."); };
      recorder.onstop = () => {
        cleanupRecordingVideo();
        clearTimeout(session.timer);
        session.blob = new Blob(session.chunks, { type: recorder.mimeType || mimeType || "video/webm" });
        session.chunks = [];
        resolve(session.blob);
      };
    });
    localRecordingRef.current = session;
    try { recorder.start(1000); } catch (error) { cleanupRecordingVideo(); throw error; }
    session.timer = setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, 60000);
  };
  const stopLive = async () => {
  if (stoppingLocalRef.current) return;

  const liveId = liveIdRef.current;

  if (!liveId) {
    await umiNotify("Identifiant du LIVE manquant.");
    return;
  }

  stoppingLocalRef.current = true;

  try {
    setRecordingStatus("stopping");

    // Terminer le direct avant de préparer le temps fort.
    await setDoc(
      doc(db, "live", liveId),
      {
        isLive: false,
        stoppedAt: serverTimestamp(),
        recordingStatus: "stopped",
        hasReplay: false,
        replayPublished: false,
        highlightStatus: "processing",
        highlightPublished: false,
      },
      { merge: true }
    );

    const camera = cameraTracksRef.current.find((track) => track.kind === "video");
    await camera?.stopProcessor?.();
    backgroundProcessorRef.current = null;
    await roomRef.current?.disconnect();
    roomRef.current = null;
    cameraTracksRef.current.forEach((track) => track.stop());
    cameraTracksRef.current = [];

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsLiveStarted(false);
    setIsCameraStarted(false);
    setSpectatorCount(0);

    const session = localRecordingRef.current;

    if (!session) {
      throw new Error(
        "Aucun enregistrement local disponible."
      );
    }

    clearTimeout(session.timer);

    if (session.recorder.state !== "inactive") {
      session.recorder.stop();
    }

    const blob = session.blob || await session.done;

    if (session.error) throw session.error;

    if (!blob?.size) {
      throw new Error("La vidéo enregistrée est vide.");
    }

    if (blob.size > 32 * 1024 * 1024) {
      throw new Error("L’extrait dépasse 32 Mo.");
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error(
        "Reconnectez-vous au compte administrateur."
      );
    }

    await queueHighlight({
      id: liveId, blob, uid: currentUser.uid,
      url: `${API_URL}/upload-local-highlight/${encodeURIComponent(liveId)}`,
    });
    localRecordingRef.current = null;
    liveIdRef.current = null;
    setActiveLiveId(null);

    roomNameRef.current = null;
    identityRef.current = null;
    egressIdRef.current = null;
    recordingFilePathRef.current = null;

    setQuestions([]);
    setSelectedMessage(null);
    setMessage("");
    setPresenterTool(null);
    setPresenterMedia(null);
    setRecordingStatus("stopped");

    setRecordingStatus("stopped");
    onBack?.();
  } catch (error) {
    console.error("Erreur temps fort local :", error);

    setRecordingStatus("error");

    await umiNotify(
      `Temps fort non publié : ${error.message}\n` +
      "Gardez cette page ouverte et cliquez de nouveau " +
      "sur Arrêter le live pour réessayer."
    );
  } finally {
    stoppingLocalRef.current = false;
  }
};
  /* =====================================================
     NETTOYAGE PAGE
  ===================================================== */
  useEffect(() => {
    return () => {
      const processor = backgroundProcessorRef.current;
      backgroundProcessorRef.current = null;
      processor?.destroy().catch(console.error);
      cameraTracksRef.current.forEach((track) => track.stop());
      cameraTracksRef.current = [];
      const session = localRecordingRef.current;
      if (session) {
        clearTimeout(session.timer);
        if (session.recorder.state !== "inactive") session.recorder.stop();
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
      if (
        roomRef.current
      ) {
        roomRef.current
          .disconnect();
      }
    };
  }, []);
  /* =====================================================
     PAGE DE SELECTION DE LA MACHINE POUR L'OFFRE LIVE
  ===================================================== */
  if (showPresentedMachines && !clientMode) {
    return <LiveMachineSelector machines={machines} onBack={() => setShowPresentedMachines(false)} onSelect={(machine) => { setPresentedMachineId(machine.id); setMachineName(machine.name || ""); setShowPresentedMachines(false); }} />;
  }
  if (showSimilarMachines && !clientMode) {
    return <LiveMachineSelector multiple machines={machines} selectedIds={similarMachines} onBack={() => setShowSimilarMachines(false)} onSelect={(ids) => { setSimilarMachines(ids); setShowSimilarMachines(false); }} />;
  }
  if (showLiveOfferMachines) {
    return (
      <div className="create-live-machine-selector">
        <header className="create-live-machine-selector-header">
          <button
            type="button"
            className="create-live-machine-selector-back"
            onClick={() =>
              setShowLiveOfferMachines(
                false
              )
            }
          >
            ←
          </button>
          <div>
            <strong>
              Offre Live
            </strong>
            <span>
              Sélectionnez la machine en promotion
            </span>
          </div>
        </header>
        <div className="create-live-machine-selector-count">
          {!liveOfferMachineId
            ? "Aucune machine sélectionnée"
            : "1 machine sélectionnée"}
        </div>
        <div className="create-live-machine-selector-list">
          {machines.length === 0 ? (
            <div className="create-live-similar-empty">
              Aucune machine disponible.
            </div>
          ) : (
            machines.map(
              (machine) => {
                const selected =
                  liveOfferMachineId ===
                  machine.id;
                return (
                  <button
                    type="button"
                    key={machine.id}
                    className={
                      selected
                        ? "create-live-machine-select-card selected"
                        : "create-live-machine-select-card"
                    }
                    onClick={() => {
                      setLiveOfferMachineId(
                        selected
                          ? ""
                          : machine.id
                      );
                    }}
                  >
                    <div className="create-live-machine-select-image">
                      {machine.imageUrl ? (
                        <img
                          src={
                            machine.imageUrl
                          }
                          alt={
                            machine.name ||
                            "Machine UMI"
                          }
                        />
                      ) : (
                        <span>
                          🏭
                        </span>
                      )}
                    </div>
                    <div className="create-live-machine-select-info">
                      <strong>
                        {machine.name ||
                          "Machine UMI"}
                      </strong>
                      <span>
  {machine.price || "Prix non renseigné"} FCFA
</span>
                    </div>
                    <div
                      className={
                        selected
                          ? "create-live-machine-select-circle selected"
                          : "create-live-machine-select-circle"
                      }
                    >
                      {selected
                        ? "✓"
                        : ""}
                    </div>
                  </button>
                );
              }
            )
          )}
        </div>
        <div className="create-live-machine-selector-bottom">
          <button
            type="button"
            onClick={() =>
              setShowLiveOfferMachines(
                false
              )
            }
          >
            {liveOfferMachineId
              ? "Valider la machine"
              : "Retour"}
          </button>
        </div>
      </div>
    );
  }
  /* =====================================================
   PAGE DE SELECTION DES MACHINES SIMILAIRES
===================================================== */
if (showSimilarMachines) {
  return (
    <div className="create-live-machine-selector">
      <header className="create-live-machine-selector-header">
        <button
          type="button"
          className="create-live-machine-selector-back"
          onClick={() =>
            setShowSimilarMachines(false)
          }
        >
          ←
        </button>
        <div>
          <strong>
            Machines similaires
          </strong>
          <span>
            Sélectionnez les machines du LIVE
          </span>
        </div>
      </header>
      <div className="create-live-machine-selector-count">
        {similarMachines.length === 0
          ? "Aucune machine sélectionnée"
          : `${similarMachines.length} machine${
              similarMachines.length > 1
                ? "s"
                : ""
            } sélectionnée${
              similarMachines.length > 1
                ? "s"
                : ""
            }`}
      </div>
      <div className="create-live-machine-selector-list">
        {machines.length === 0 ? (
          <div className="create-live-similar-empty">
            Aucune machine disponible.
          </div>
        ) : (
          machines.map((machine) => {
            const selected =
              similarMachines.includes(
                machine.id
              );
            /* ===============================
               PRIX RÉEL DE LA MACHINE
            =============================== */
            const machinePrice =
              machine.price ??
              machine.prix ??
              machine.priceFCFA ??
              machine.prixFCFA ??
              machine.salePrice ??
              "";
            return (
              <button
                type="button"
                key={machine.id}
                className={
                  selected
                    ? "create-live-machine-select-card selected"
                    : "create-live-machine-select-card"
                }
                onClick={() => {
                  setSimilarMachines(
                    (current) => {
                      if (
                        current.includes(
                          machine.id
                        )
                      ) {
                        return current.filter(
                          (id) =>
                            id !==
                            machine.id
                        );
                      }
                      return [
                        ...current,
                        machine.id,
                      ];
                    }
                  );
                }}
              >
                {/* IMAGE */}
                <div className="create-live-machine-select-image">
                  {machine.imageUrl ? (
                    <img
                      src={machine.imageUrl}
                      alt={
                        machine.name ||
                        "Machine UMI"
                      }
                    />
                  ) : (
                    <span>
                      🏭
                    </span>
                  )}
                </div>
                {/* INFORMATIONS */}
                <div className="create-live-machine-select-info">
                  <strong>
                    {machine.name ||
                      "Machine UMI"}
                  </strong>
                  <span>
                    {machinePrice !== "" &&
                    machinePrice !== null &&
                    machinePrice !== undefined
                      ? `${machinePrice} FCFA`
                      : "Prix non renseigné"}
                  </span>
                </div>
                {/* SÉLECTION */}
                <div
                  className={
                    selected
                      ? "create-live-machine-select-circle selected"
                      : "create-live-machine-select-circle"
                  }
                >
                  {selected
                    ? "✓"
                    : ""}
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className="create-live-machine-selector-bottom">
        <button
          type="button"
          onClick={() =>
            setShowSimilarMachines(false)
          }
        >
          Valider la sélection
          {similarMachines.length > 0 &&
            ` (${similarMachines.length})`}
        </button>
      </div>
    </div>
  );
}
/* =====================================================
   MODE LIVE
===================================================== */
  if (isLiveStarted) {
    return (
      <div className="umi-tiktok-live umi-presenter-live">
      {galleryPicker}{galleryWindow}
        {/* =====================================================
            CORRECTION CLICS / COUCHES DU MODE LIVE
        ===================================================== */}
        <style>{`
          .umi-tiktok-live {
            position: relative !important;
            isolation: isolate !important;
          }
          .umi-live-background,
          .umi-live-background-video,
          .umi-presenter-background-media,
          .umi-presenter-effect-layer,
          .umi-live-dark-gradient {
            pointer-events: none !important;
          }
          .umi-live-background {
            z-index: 0 !important;
          }
          .umi-live-dark-gradient {
            z-index: 1 !important;
          }
          .umi-presenter-effect-layer {
            z-index: 2 !important;
          }
          .umi-presenter-featured-machine,
          .umi-live-offer,
          .umi-live-comments {
            position: relative !important;
            z-index: 20 !important;
          }
          .umi-presenter-tools,
          .umi-presenter-tools-left,
          .umi-presenter-tools-right {
            z-index: 100 !important;
            pointer-events: auto !important;
          }
          .umi-presenter-tool,
          .umi-presenter-tools button {
            position: relative !important;
            z-index: 101 !important;
            pointer-events: auto !important;
            touch-action: manipulation !important;
            cursor: pointer !important;
          }
          .umi-live-overlay-top,
          .umi-live-top-right,
          .umi-live-right-buttons {
            z-index: 110 !important;
            pointer-events: auto !important;
          }
          .umi-live-overlay-top button,
          .umi-live-right-buttons button,
          .umi-live-power-button {
            position: relative !important;
            z-index: 111 !important;
            pointer-events: auto !important;
            touch-action: manipulation !important;
            cursor: pointer !important;
          }
          .umi-live-bottom,
          .umi-live-input-row,
          .umi-live-reply-preview {
            z-index: 120 !important;
            pointer-events: auto !important;
          }
          .umi-live-bottom button,
          .umi-live-bottom input,
          .umi-live-bottom textarea,
          .umi-live-send-button {
            position: relative !important;
            z-index: 121 !important;
            pointer-events: auto !important;
            touch-action: manipulation !important;
          }
          .umi-presenter-tool-panel {
            z-index: 1000 !important;
            pointer-events: auto !important;
          }
          .umi-presenter-tool-panel *,
          .umi-presenter-tool-panel button,
          .umi-presenter-tool-panel input,
          .umi-presenter-tool-panel textarea,
          .umi-presenter-tool-panel select,
          .umi-presenter-tool-panel label {
            pointer-events: auto !important;
          }
          .umi-presenter-return-camera-floating {
            z-index: 1200 !important;
            pointer-events: auto !important;
            touch-action: manipulation !important;
          }
        `}</style>
        {/* =========================================
            FOND DU LIVE : CAMÉRA / PHOTO / VIDÉO
        ========================================= */}
        <div
          className={`umi-live-background presenter-filter-${presenterFilter}`}
        >
          <video
            ref={bindCameraVideo}
            autoPlay
            playsInline
            muted
            style={{
    transform: "var(--umi-camera-transform, scaleX(-1))",
  }}
            className={
              presenterMedia && presenterMedia.layer !== "background"
                ? "umi-live-background-video presenter-media-hidden"
                : "umi-live-background-video"
            }
          />
          {presenterMedia?.type ===
            "image" && !presenterMedia.composited && (
            <img
              src={
                presenterMedia.url
              }
              alt="Média du Live"
              className={`umi-presenter-background-media${presenterMedia?.layer === "background" ? " umi-live-gallery-background" : ""}`}
            />
          )}
          {presenterMedia?.type ===
            "video" && !presenterMedia.composited && (
            <video
              src={
                presenterMedia.url
              }
              autoPlay
              playsInline
              controls={false}
              className={`umi-presenter-background-media${presenterMedia?.layer === "background" ? " umi-live-gallery-background" : ""}`}
              onEnded={
                stopPresenterMedia
              }
            />
          )}
          {presenterEffect ===
            "hearts" && (
            <div className="umi-presenter-effect-layer">
              <span>❤️</span>
              <span>❤️</span>
              <span>❤️</span>
              <span>❤️</span>
              <span>❤️</span>
            </div>
          )}
          {presenterEffect ===
            "stars" && (
            <div className="umi-presenter-effect-layer">
              <span>✨</span>
              <span>⭐</span>
              <span>✨</span>
              <span>⭐</span>
              <span>✨</span>
            </div>
          )}
        </div>
        <LiveTextOverlay value={presenterText} editable onCommit={movePresenterText} />
        <input ref={presenterBackgroundInput} type="file" accept="image/*,video/*" hidden onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) playPresenterMedia(file, file.type.startsWith("video/") ? "video" : "image");
        }} />
        <div className="umi-live-dark-gradient" />
        {/* =====================================================
            PANNEAU DES OUTILS
        ===================================================== */}
        {presenterTool && (
          <div
  className={`umi-presenter-tool-panel ${
    presenterTool === "similar"
      ? "umi-similar-half-panel"
      : ""
  }`}
>
            <div className="umi-presenter-tool-panel-header">
              <strong>
                {presenterTool === "text" && "Texte sur le live"}
                {presenterTool ===
                  "offer" &&
                  "Modifier l'offre"}
                {presenterTool ===
                  "product" &&
                  "Produit à acheter"}
                {presenterTool ===
                  "similar" &&
                  "Machines similaires"}
                {presenterTool ===
                  "filter" &&
                  "Filtres"}
                {presenterTool ===
                  "effect" &&
                  "Effets"}
                {presenterTool ===
                  "media" &&
                  "Photos et vidéos"}
                {presenterTool ===
                  "details" &&
                  "Modifier le Live"}
              </strong>
              <button
                type="button"
                onClick={() =>
                  setPresenterTool(
                    null
                  )
                }
              >
                ×
              </button>
            </div>
            {/* =========================
                OFFRE
            ========================= */}
            {presenterTool === "text" && (
              <div className="umi-presenter-tool-content umi-live-text-editor">
                <label htmlFor="umi-live-text">Texte visible par les spectateurs</label>
                <textarea id="umi-live-text" maxLength={300} rows={4} value={presenterTextDraft} onChange={(event) => setPresenterTextDraft(event.target.value)} placeholder="Écris ton texte…" />
                <button type="button" className="umi-live-text-save" onClick={savePresenterText}>Afficher le texte</button>
                {presenterText && <button type="button" className="umi-live-text-remove" onClick={async () => {
                  if (await updateCurrentLive({ presenterText: null })) { setPresenterText(null); setPresenterTextDraft(""); setPresenterTool(null); }
                }}>Supprimer le texte</button>}
              </div>
            )}
            {presenterTool === "offer" && (
              <div className="umi-presenter-tool-content">
                <label>Machine de l’offre</label>
                <button type="button" className="umi-presenter-save-button"
                  onClick={() => { setLiveOfferMachineId(""); setLiveOfferPercent(0); }}>
                  Sans offre
                </button>
                <div className="umi-presenter-machine-list">
                  {machines.length === 0 ? (
                    <div className="create-live-similar-empty">
                      Aucune machine disponible.
                    </div>
                  ) : (
                    machines.map(
                      (machine) => {
                        const selected =
                          liveOfferMachineId ===
                          machine.id;
                        return (
                          <button
                            type="button"
                            key={machine.id}
                            className={
                              selected
                                ? "umi-presenter-machine selected"
                                : "umi-presenter-machine"
                            }
                            onClick={() => {
                              setLiveOfferMachineId(
                                machine.id
                              );
                            }}
                          >
                            <div className="umi-presenter-machine-image">
                              {machine.imageUrl ? (
                                <img
                                  src={
                                    machine.imageUrl
                                  }
                                  alt={
                                    machine.name ||
                                    "Machine UMI"
                                  }
                                />
                              ) : (
                                <span>
                                  🏭
                                </span>
                              )}
                            </div>
                            <div className="umi-presenter-machine-info">
                              <strong>
                                {machine.name ||
                                  "Machine UMI"}
                              </strong>
                              <span>
                                {machine.price || "Prix non renseigné"} FCFA
                              </span>
                            </div>
                            {selected && (
                              <div className="umi-presenter-machine-check">
                                ✓
                              </div>
                            )}
                          </button>
                        );
                      }
                    )
                  )}
                </div>
                <label>
                  Réduction
                </label>
                <div className="umi-presenter-percent-row">
                  {[
                    5,
                    10,
                    15,
                    20,
                    25,
                    30,
                    40,
                    50,
                  ].map(
                    (percent) => (
                      <button
                        type="button"
                        key={percent}
                        className={
                          Number(
                            liveOfferPercent
                          ) === percent
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          setLiveOfferPercent(
                            percent
                          )
                        }
                      >
                        -{percent}%
                      </button>
                    )
                  )}
                </div>
                <button
                  type="button"
                  className="umi-presenter-save-button"
                  onClick={
                    savePresenterOffer
                  }

                >
                  Enregistrer l'offre
                </button>
              </div>
            )}
            {/* =========================
                PRODUIT
            ========================= */}
            {presenterTool ===
              "product" && (
              <div className="umi-presenter-machine-list">
                {machines.map(
                  (machine) => (
                    <button
                      type="button"
                      key={
                        machine.id
                      }
                      className={
                        presentedMachineId ===
                        machine.id
                          ? "umi-presenter-machine selected"
                          : "umi-presenter-machine"
                      }
                      onClick={() =>
                        selectPresenterProduct(
                          machine
                        )
                      }
                    >
                      <div className="umi-presenter-machine-image">
                        {machine.imageUrl ? (
                          <img
                            src={
                              machine.imageUrl
                            }
                            alt={
                              machine.name ||
                              "Machine UMI"
                            }
                          />
                        ) : (
                          <span>
                            🏭
                          </span>
                        )}
                      </div>
                      <div className="umi-presenter-machine-info">
                        <strong>
                          {machine.name ||
                            "Machine UMI"}
                        </strong>
                        <span>
                          {new Intl.NumberFormat(
                            "fr-FR"
                          ).format(
                            Number(
                              machine.price
                            ) || 0
                          )} FCFA
                        </span>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
            {/* =========================
                MACHINES SIMILAIRES
            ========================= */}
            {presenterTool ===
              "similar" && (
              <div className="umi-presenter-tool-content">
                <div className="umi-presenter-machine-list">
                  {machines.map(
                    (machine) => {
                      const selected =
                        similarMachines
                          .includes(
                            machine.id
                          );
                      return (
                        <button
                          type="button"
                          key={
                            machine.id
                          }
                          className={
                            selected
                              ? "umi-presenter-machine selected"
                              : "umi-presenter-machine"
                          }
                          onClick={() => {
                            setSimilarMachines(
                              (current) => {
                                if (
                                  current.includes(
                                    machine.id
                                  )
                                ) {
                                  return current.filter(
                                    (id) =>
                                      id !==
                                      machine.id
                                  );
                                }
                                return [
                                  ...current,
                                  machine.id,
                                ];
                              }
                            );
                          }}
                        >
                          <div className="umi-presenter-machine-image">
                            {machine.imageUrl ? (
                              <img
                                src={
                                  machine.imageUrl
                                }
                                alt={
                                  machine.name ||
                                  "Machine UMI"
                                }
                              />
                            ) : (
                              <span>
                                🏭
                              </span>
                            )}
                          </div>
                          <div className="umi-presenter-machine-info">
                            <strong>
                              {machine.name ||
                                "Machine UMI"}
                            </strong>
                            <span>
                              {selected
                                ? "✓ Sélectionnée"
                                : "Ajouter"}
                            </span>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
                <button
                  type="button"
                  className="umi-presenter-save-button"
                  onClick={
                    savePresenterSimilarMachines
                  }
                >
                  Enregistrer
                </button>
              </div>
            )}
            {/* =========================
                FILTRES
            ========================= */}
            {presenterTool === "filter" && (
  <div className="umi-presenter-options-grid">
    {[
      ["none", "Normal", "📷"],
      ["warm", "Chaud", "☀️"],
      ["cold", "Froid", "❄️"],
      ["bw", "N&B", "⚫"],
      ["bright", "Clair", "💡"],
      ["contrast", "Contraste", "🔆"],
      ["cinema", "Cinéma", "🎬"],
      ["gold", "Doré", "✨"],
      ["vintage", "Vintage", "📼"],
      ["neon", "Néon", "🌈"],
      ["rose", "Rose", "🌸"],
      ["dramatic", "Dramatique", "🌑"],
      ["sunset", "Coucher de soleil", "🌅"],
["ocean", "Océan", "🌊"],
["emerald", "Émeraude", "💚"],
["purple", "Violet", "💜"],
["retro", "Rétro", "📻"],
["vivid", "Éclatant", "🌈"],
    ].map(([value, label, icon]) => (
      <button
        type="button"
        key={value}
        className={presenterFilter === value ? "selected" : ""}
        onClick={() => selectPresenterFilter(value)}
      >
        <span>{icon}</span>
        {label}
      </button>
    ))}
  </div>
)}
            {/* =========================
                EFFETS
            ========================= */}
            {presenterTool ===
              "effect" && (
              <div className="umi-presenter-options-grid">
                <button
                  type="button"
                  className={
                    presenterEffect ===
                    "none"
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    selectPresenterEffect(
                      "none"
                    )
                  }
                >
                  <span>🚫</span>
                  Aucun
                </button>
                <button
                  type="button"
                  className={
                    presenterEffect ===
                    "hearts"
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    selectPresenterEffect(
                      "hearts"
                    )
                  }
                >
                  <span>❤️</span>
                  Cœurs
                </button>
                <button
                  type="button"
                  className={
                    presenterEffect ===
                    "stars"
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    selectPresenterEffect(
                      "stars"
                    )
                  }
                >
                  <span>✨</span>
                  Étoiles
                </button>
              </div>
            )}
            {/* =========================
                PHOTOS / VIDÉOS
            ========================= */}
            {presenterTool ===
              "media" && (
              <div className="umi-presenter-tool-content">
                {presenterMedia && (
                  <button
                    type="button"
                    className="umi-presenter-camera-return"
                    onClick={
                      stopPresenterMedia
                    }
                  >
                    📹 Retour caméra
                  </button>
                )}
                {livePhotos.length >
                  0 && (
                  <>
                    <h4>
                      Photos
                    </h4>
                    <div className="umi-presenter-media-grid">
                      {livePhotos.map(
                        (
                          photo,
                          index
                        ) => {
                          const photoUrl =
                            typeof photo ===
                            "string"
                              ? photo
                              : getMediaPreview(photo);
                          return (
                            <button
                              type="button"
                              key={`photo-${index}`}
                              onClick={() =>
                                playPresenterMedia(
                                  photo,
                                  "image"
                                )
                              }
                            >
                              <img
                                src={
                                  photoUrl
                                }
                                alt={`Photo ${
                                  index +
                                  1
                                }`}
                              />
                            </button>
                          );
                        }
                      )}
                    </div>
                  </>
                )}
                {liveVideos.length >
                  0 && (
                  <>
                    <h4>
                      Vidéos
                    </h4>
                    <div className="umi-presenter-media-grid">
                      {liveVideos.map(
                        (
                          video,
                          index
                        ) => {
                          const videoUrl =
                            typeof video ===
                            "string"
                              ? video
                              : getMediaPreview(video);
                          return (
                            <button
                              type="button"
                              key={`video-${index}`}
                              onClick={() =>
                                playPresenterMedia(
                                  video,
                                  "video"
                                )
                              }
                            >
                              <video
                                src={
                                  videoUrl
                                }
                                muted
                              />
                              <span className="umi-presenter-media-play">
                                ▶
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </>
                )}
                {livePhotos.length ===
                  0 &&
                  liveVideos.length ===
                    0 && (
                    <div className="umi-presenter-empty">
                      Aucune photo ou vidéo préparée pour ce Live.
                    </div>
                  )}
              </div>
            )}
            {/* =========================
                DÉTAILS DU LIVE
            ========================= */}
            {presenterTool ===
              "details" && (
              <div className="umi-presenter-tool-content">
                <label>
                  Titre du Live
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="Titre du Live"
                  className="umi-presenter-details-input"
                />
                <label>
                  Description
                </label>
                <textarea
                  value={
                    liveDescription
                  }
                  onChange={(event) =>
                    setLiveDescription(
                      event.target.value
                    )
                  }
                  placeholder="Description du Live"
                  className="umi-presenter-details-textarea"
                />
                <label>
                  Photos du Live
                </label>
                <div className="umi-presenter-details-media-grid">
                  {livePhotos.map(
                    (
                      photo,
                      index
                    ) => {
                      const photoUrl =
                        typeof photo ===
                        "string"
                          ? photo
                          : getMediaPreview(photo);
                      return (
                        <div
                          key={`detail-photo-${index}`}
                          className="umi-presenter-details-media-item"
                        >
                          <img
                            src={
                              photoUrl
                            }
                            alt={`Live ${
                              index +
                              1
                            }`}
                          />
                          <button
                            type="button"
                            className="umi-presenter-details-media-remove"
                            onClick={() => {
                              setLivePhotos(
                                (current) =>
                                  current.filter(
                                    (
                                      _,
                                      photoIndex
                                    ) =>
                                      photoIndex !==
                                      index
                                  )
                              );
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    }
                  )}
                  {livePhotos.length <
                    10 && (
                    <label className="umi-presenter-details-add-media">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="create-live-hidden-file"
                        onChange={(
                          event
                        ) => {
                          const files =
                            Array.from(
                              event
                                .target
                                .files ||
                                []
                            );
                          const remaining =
                            10 -
                            livePhotos.length;
                          const selected =
                            files.slice(
                              0,
                              remaining
                            );
                          setLivePhotos(
                            (
                              current
                            ) => [
                              ...current,
                              ...selected,
                            ]
                          );
                          if (
                            files.length >
                            remaining
                          ) {
                            umiNotify(
                              "Maximum 10 photos pour un LIVE."
                            );
                          }
                          event.target.value =
                            "";
                        }}
                      />
                      <span>
                        ＋
                      </span>
                      <small>
                        Ajouter photo
                      </small>
                    </label>
                  )}
                </div>
                <label>
                  Vidéos du Live
                </label>
                <div className="umi-presenter-details-media-grid">
                  {liveVideos.map(
                    (
                      video,
                      index
                    ) => {
                      const videoUrl =
                        typeof video ===
                        "string"
                          ? video
                          : getMediaPreview(video);
                      return (
                        <div
                          key={`detail-video-${index}`}
                          className="umi-presenter-details-media-item umi-presenter-details-video-item"
                        >
                          <video
                            src={
                              videoUrl
                            }
                            controls
                            playsInline
                          />
                          <button
                            type="button"
                            className="umi-presenter-details-media-remove"
                            onClick={() => {
                              setLiveVideos(
                                (current) =>
                                  current.filter(
                                    (
                                      _,
                                      videoIndex
                                    ) =>
                                      videoIndex !==
                                      index
                                  )
                              );
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    }
                  )}
                  {liveVideos.length <
                    3 && (
                    <label className="umi-presenter-details-add-media">
                      <input
                        type="file"
                        accept="video/*"
                        multiple
                        className="create-live-hidden-file"
                        onChange={(
                          event
                        ) => {
                          const files =
                            Array.from(
                              event
                                .target
                                .files ||
                                []
                            );
                          const remaining =
                            3 -
                            liveVideos.length;
                          const selected =
                            files.slice(
                              0,
                              remaining
                            );
                          setLiveVideos(
                            (
                              current
                            ) => [
                              ...current,
                              ...selected,
                            ]
                          );
                          if (
                            files.length >
                            remaining
                          ) {
                            umiNotify(
                              "Maximum 3 vidéos pour un LIVE."
                            );
                          }
                          event.target.value =
                            "";
                        }}
                      />
                      <span>
                        ＋
                      </span>
                      <small>
                        Ajouter vidéo
                      </small>
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  className="umi-presenter-save-button"
                  disabled={
                    isUploadingMedia
                  }
                  onClick={async () => {
                    try {
                      setIsUploadingMedia(
                        true
                      );
                      const photoUrls =
                        [];
                      for (
                        const photo of
                        livePhotos
                      ) {
                        if (
                          typeof photo ===
                          "string"
                        ) {
                          photoUrls.push(
                            photo
                          );
                        } else {
                          const uploadedUrl =
                            await uploadLiveMedia(
                              photo,
                              "image"
                            );
                          if (
                            uploadedUrl
                          ) {
                            photoUrls.push(
                              uploadedUrl
                            );
                          }
                        }
                      }
                      const videoUrls =
                        [];
                      for (
                        const video of
                        liveVideos
                      ) {
                        if (
                          typeof video ===
                          "string"
                        ) {
                          videoUrls.push(
                            video
                          );
                        } else {
                          const uploadedUrl =
                            await uploadLiveMedia(
                              video,
                              "video"
                            );
                          if (
                            uploadedUrl
                          ) {
                            videoUrls.push(
                              uploadedUrl
                            );
                          }
                        }
                      }
                      await updateCurrentLive(
                        {
                          title:
                            title.trim(),
                          description:
                            liveDescription
                              .trim(),
                          photos:
                            photoUrls,
                          videos:
                            videoUrls,
                        }
                      );
                      setLivePhotos(
                        photoUrls
                      );
                      setLiveVideos(
                        videoUrls
                      );
                      setPresenterTool(
                        null
                      );
                    } catch (error) {
                      console.error(
                        "Erreur modification des détails du LIVE :",
                        error
                      );
                      await umiNotify(
                        "Impossible d'enregistrer les modifications."
                      );
                    } finally {
                      setIsUploadingMedia(
                        false
                      );
                    }
                  }}
                >
                  {isUploadingMedia
                    ? "Enregistrement..."
                    : "Enregistrer les modifications"}
                </button>
              </div>
            )}
          </div>
        )}
        {/* =====================================================
            PRODUIT À ACHETER - BARRE BLANCHE
        ===================================================== */}
        
        {/* =====================================================
            LA PARTIE 3 COMMENCE ICI :
            OUTILS PRÉSENTATEUR - CÔTÉ GAUCHE
        ===================================================== */}
                <div className="umi-presenter-tools umi-presenter-tools-left">
          <button type="button" className="umi-presenter-tool" onClick={() => { setPresenterTextDraft(presenterText?.text || ""); togglePresenterTool("text"); }}>
            <span className="umi-presenter-tool-icon">✍️</span><small>Texte</small>
          </button>
          {presenterMedia?.layer === "background" && <button type="button" className="umi-presenter-tool" onClick={stopPresenterMedia}>
            <span className="umi-presenter-tool-icon">×</span><small>Retirer fond</small>
          </button>}

          <button
  type="button"
  className={
    presenterTool === "similar"
      ? "umi-presenter-tool active"
      : "umi-presenter-tool"
  }
  onClick={() =>
    togglePresenterTool("similar")
  }
  title="Modifier les machines similaires"
  aria-label="Modifier les machines similaires"
>
  <span className="umi-presenter-tool-icon">
    ⚙️
  </span>

  <small>Similaires</small>
</button>
          <button
            type="button"
            className={
              presenterTool === "offer"
                ? "umi-presenter-tool active"
                : "umi-presenter-tool"
            }
            onClick={() =>
              togglePresenterTool(
                "offer"
              )
            }
          >
            <span className="umi-presenter-tool-icon">
              ✏️
            </span>
            <small>
              Offre
            </small>
          </button>
          <button
            type="button"
            className={
              presenterTool === "product"
                ? "umi-presenter-tool active"
                : "umi-presenter-tool"
            }
            onClick={() =>
              togglePresenterTool(
                "product"
              )
            }
          >
            <span className="umi-presenter-tool-icon">
              🛍️
            </span>
            <small>
              Produit
            </small>
          </button>
        
        </div>
        {/* =====================================================
            OUTILS PRÉSENTATEUR - CÔTÉ DROIT
        ===================================================== */}
        <div className="umi-presenter-tools umi-presenter-tools-right">
          <button
            type="button"
            className={
              presenterTool === "filter"
                ? "umi-presenter-tool active"
                : "umi-presenter-tool"
            }
            onClick={() =>
              togglePresenterTool(
                "filter"
              )
            }
          >
            <span className="umi-presenter-tool-icon">
              🎨
            </span>
            <small>
              Filtre
            </small>
          </button>
          <button
            type="button"
            className={
              presenterTool === "effect"
                ? "umi-presenter-tool active"
                : "umi-presenter-tool"
            }
            onClick={() =>
              togglePresenterTool(
                "effect"
              )
            }
          >
            <span className="umi-presenter-tool-icon">
              ✨
            </span>
            <small>
              Effets
            </small>
          </button>
          <button
            type="button"
            className={
              presenterTool === "media"
                ? "umi-presenter-tool active"
                : "umi-presenter-tool"
            }
            disabled={isUploadingMedia}
            onClick={() => presenterBackgroundInput.current?.click()}
          >
            <span className="umi-presenter-tool-icon">
              ▶️
            </span>
            <small>
              Média
            </small>
          </button>
          <button
            type="button"
            className="umi-presenter-tool"
            onClick={
              switchCamera
            }
          >
            <span className="umi-presenter-tool-icon">
              🔄
            </span>
            <small>
              Caméra
            </small>
          </button>
          <button
            type="button"
            className={
              isPresenterMicrophoneEnabled
                ? "umi-presenter-tool"
                : "umi-presenter-tool disabled"
            }
            onClick={
              togglePresenterMicrophone
            }
          >
            <span className="umi-presenter-tool-icon">
              {isPresenterMicrophoneEnabled
                ? "🎙️"
                : "🔇"}
            </span>
            <small>
              Micro
            </small>
          </button>
        </div>
        {/* =====================================================
            EN-TÊTE DU LIVE
        ===================================================== */}
        <div className="umi-live-overlay-top">
          <div className="umi-live-top-left">
            <div className="umi-live-presenter-identity">
  <div className="umi-live-profile-circle">
    <img
      src={
        userPhoto ||
        getCurrentUser()?.photoURL ||
        auth.currentUser?.photoURL ||
        logoUmi
      }
      alt="Profil du présentateur"
      className="umi-live-presenter-photo"
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = logoUmi;
      }}
    />
  </div>

  <span className="umi-live-presenter-name">
    UMI LIVE
  </span>
</div>
            <div className="umi-live-profile-info">
              <strong>
                {machineName}
              </strong>
              <div className="umi-live-red-badge">
                ● EN DIRECT
              </div>
        
            </div>
          </div>
          <div className="umi-live-top-right">
                  <div className="umi-presenter-like-counter">
  <span>♥</span>
  <strong>{presenterLikeCount}</strong>
  <span>J’aime</span>
</div>
           <div className="umi-presenter-viewer-counter">
  👁 {spectatorCount}
</div>
           <button type="button" className="umi-live-close umi-presenter-close" onClick={async () => { if (await umiAsk("Terminer ce direct ?")) { await stopLive(); } }} aria-label="Terminer le direct">×</button>

          </div>
        </div>
        {/* =====================================================
            OFFRE LIVE
        ===================================================== */}
      
        {/* =====================================================
            COMMENTAIRES
        ===================================================== */}
       <div
  className="umi-live-comments"
  ref={(element) => {
    if (!element) return;

    element.style.setProperty(
      "position", "absolute", "important"
    );
    element.style.setProperty(
      "top", "auto", "important"
    );
    element.style.setProperty(
      "bottom", "100px", "important"
    );
    element.style.setProperty(
      "transform", "none", "important"
    );
    element.style.setProperty(
      "max-height", "180px", "important"
    );
    element.style.setProperty(
      "overflow-y", "auto", "important"
    );
  }}
>

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
                      {item.userPhoto ? (
                        <img
                          src={
                            item.userPhoto
                          }
                          alt={
                            item.userName ||
                            "Profil"
                          }
                          className="umi-live-comment-avatar-img"
                        />
                      ) : (
                        <span>
                          {isPresenter
                            ? "U"
                            : (
                                item.userName?.[0] ||
                                "S"
                              ).toUpperCase()}
                        </span>
                      )}
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
        {/* =====================================================
            BAS DU LIVE / MESSAGE
        ===================================================== */}
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
      {galleryPicker}{galleryWindow}
      {localRecordingRef.current && !isLiveStarted && (
        <div style={{ padding: 16, background: "#fff3cd" }}>
          <p>Temps fort non sauvegardé. Réessayez avant de quitter cette page.</p>
          <button type="button" onClick={stopLive} disabled={recordingStatus === "stopping"}>
            {recordingStatus === "stopping" ? "Publication en cours…" : "Réessayer la publication du temps fort"}
          </button>
        </div>
      )}
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
        {/* =====================================================
            CAMÉRA
        ===================================================== */}
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
              ref={bindCameraVideo}
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
          {isCameraStarted && <button type="button" className="activate-camera-button" onClick={switchCamera}>🔄 Caméra avant / arrière</button>}
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
        {/* =====================================================
            FORMULAIRE LIVE
        ===================================================== */}
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
                Titre du LIVE (facultatif)
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
                Machine présentée (facultatif)
              </label>
              <button id="live-machine" type="button" className="create-live-open-machines" onClick={() => clientMode ? openGallery("product") : setShowPresentedMachines(true)}>
                <div className="create-live-open-machines-icon">🏭</div>
                <div className="create-live-open-machines-text">
                  <strong>Machine présentée</strong>
                  <span>{presentedMachineId ? (machines.find((item) => item.id === presentedMachineId)?.name || "Machine ajoutée") : "Aucune machine sélectionnée"}</span>
                </div>
                <div className="create-live-open-machines-arrow">›</div>
              </button>
              {presentedMachineId && <button type="button" onClick={() => { setPresentedMachineId(""); setMachineName(""); }}>Retirer la machine</button>}
            </div>
            <div className="create-live-field"><label htmlFor="live-description">Description du LIVE</label><textarea id="live-description" rows={4} value={liveDescription} onChange={(event) => setLiveDescription(event.target.value)} placeholder="Présentez votre direct et vos produits" /></div>
            {/* MACHINES SIMILAIRES */}
            <div className="create-live-field">
              <label>
                Machines similaires
              </label>
              <p className="create-live-media-help">
                Choisissez les machines à afficher pendant ce LIVE.
              </p>
              <button
                type="button"
                className="create-live-open-machines"
                onClick={() =>
                  setShowSimilarMachines(
                    true
                  )
                }
              >
                <div className="create-live-open-machines-icon">
                  🏭
                </div>
                <div className="create-live-open-machines-text">
                  <strong>
                    Sélectionner les machines
                  </strong>
                  <span>
                    {similarMachines.length ===
                    0
                      ? "Aucune machine sélectionnée"
                      : `${similarMachines.length} machine${
                          similarMachines.length >
                          1
                            ? "s"
                            : ""
                        } sélectionnée${
                          similarMachines.length >
                          1
                            ? "s"
                            : ""
                        }`}
                  </span>
                </div>
                <div className="create-live-open-machines-arrow">
                  ›
                </div>
              </button>
            </div>
            {/* OFFRE LIVE */}
            <div className="create-live-field">
              <label>
                Offre Live
              </label>
              <p className="create-live-media-help">
                Choisissez une machine et indiquez la réduction du LIVE.
              </p>
              <button
                type="button"
                className="create-live-open-machines"
                onClick={() =>
                  setShowLiveOfferMachines(
                    true
                  )
                }
              >
                <div className="create-live-open-machines-icon">
                  🔥
                </div>
                <div className="create-live-open-machines-text">
                  <strong>
                    Sélectionner la machine en offre
                  </strong>
                  <span>
                    {!liveOfferMachineId
                      ? "Aucune machine sélectionnée"
                      : (
                          machines.find(
                            (machine) =>
                              machine.id ===
                              liveOfferMachineId
                          )?.name ||
                          "1 machine sélectionnée"
                        )}
                  </span>
                </div>
                <div className="create-live-open-machines-arrow">
                  ›
                </div>
              </button>
              {liveOfferMachineId && (
                <div
                  style={{
                    marginTop:
                      "14px",
                  }}
                >
                  <label
                    htmlFor="live-offer-percent"
                    style={{
                      display:
                        "block",
                      marginBottom:
                        "7px",
                      fontWeight:
                        "700",
                    }}
                  >
                    Réduction (%)
                  </label>
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap:
                        "10px",
                    }}
                  >
                    <input
                      id="live-offer-percent"
                      type="number"
                      min="1"
                      max="99"
                      value={
                        liveOfferPercent
                      }
                      onChange={
                        (event) => {
                          const value =
                            event.target.value;
                          setLiveOfferPercent(
                            value
                          );
                        }
                      }
                      placeholder="10"
                      style={{
                        width:
                          "100%",
                      }}
                    />
                    <strong
                      style={{
                        fontSize:
                          "18px",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      -{liveOfferPercent ||
                        0}%
                    </strong>
                  </div>
                </div>
              )}
            </div>
        
          </section>
          <button
            type="submit"
            className="start-live-button"
            disabled={
              isStarting ||
              isUploadingMedia
            }
          >
            <span className="start-live-dot" />
            {isUploadingMedia
              ? "Envoi des médias..."
              : isStarting
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
function CreateLive(props) { return <CreateLiveContent {...props} />; }
export default CreateLive;
