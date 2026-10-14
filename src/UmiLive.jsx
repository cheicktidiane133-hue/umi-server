import LiveTextOverlay from "./LiveTextOverlay";
import "./UmiVerificationFixes.css";
import { getLiveProducts, getSimilarProducts } from "./liveProducts";
import { withProductModel, getProductNumericPrice } from "./productModel";
import { useEffect, useMemo, useRef, useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { getProductPrice } from "./productPrice";
import { Room, RoomEvent, VideoQuality, requestAgoraToken } from "./umiAgora";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import ClientChat from "./ClientChat";
import "./UmiLive.css";
import "./RealLive.css";
import ProductDetail from "./ProductDetail";
import ProductReviews from "./ProductReviews";
import { createPortal } from "react-dom";
import logoUmi from "./assets/logo-umi.jpeg";
/* ========================================
   SERVEUR BACKEND UMI
======================================== */
const API_URL = import.meta.env.VITE_UMI_API_URL || "https://umi-server.onrender.com";
/* ========================================
   LIVE EN DIRECT
======================================== */
const liveInteractionStyles = `.umi-replay-full .umi-replay-video { z-index: 0; }
.umi-replay-full .umi-replay-bottom { z-index: 9; pointer-events: none; }
.umi-replay-full .umi-replay-bottom button,
.umi-replay-full .umi-replay-bottom input,
.umi-replay-full .umi-replay-comments,
.umi-replay-full .umi-replay-panel,
.umi-replay-full .umi-replay-header button,
.umi-real-live .umi-real-featured-bar,
.umi-real-live .umi-real-machine-actions,
.umi-real-live .umi-replay-product-link { pointer-events: auto; }
.umi-replay-full .umi-replay-panel { z-index: 20; }
.umi-replay-full button,
.umi-real-live .umi-real-featured-bar button { touch-action: manipulation; }
.umi-real-live .umi-live-background { pointer-events: none; }
.umi-real-live .umi-live-overlay-top .umi-live-top-right { position: static !important; display: flex !important; align-items: center; gap: 6px; }
.umi-real-live .umi-live-viewers { width: auto !important; min-width: 42px !important; height: 30px !important; padding: 0 8px !important; font-size: 12px !important; }
.umi-real-live .umi-live-close { display: flex !important; visibility: visible !important; width: 32px !important; height: 32px !important; z-index: 30; }
`;

function LiveLoginGate({ user, children }) {
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const loginLock = useRef(false);
  const submitLogin = async (event) => {
    event.preventDefault();
    if (loginLock.current) return;
    loginLock.current = true;
    setBusy(true); setLoginMessage("");
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const snapshot = await getDoc(doc(db, "users", firebaseUser.uid));
      if (!snapshot.exists()) {
        await signOut(auth);
        setLoginMessage("Votre profil UMI est introuvable.");
        return;
      }
      const profile = snapshot.data();
      if (profile.blocked || profile.deleting) {
        await signOut(auth);
        setLoginMessage("Ce compte est bloqué. Contactez UMI.");
        return;
      }

      localStorage.setItem("umiCurrentUser", JSON.stringify({
        userId: firebaseUser.uid, nom: profile.nom || "", email: firebaseUser.email || "",
        telephone: profile.telephone || "", role: profile.role || "client",
        photoURL: profile.photoURL || firebaseUser.photoURL || "",
      }));
      window.dispatchEvent(new Event("storage"));
      setShowLogin(false); setLoginForm(false); setPassword("");
    } catch (error) {
      setLoginMessage(["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(error.code)
        ? "Adresse e-mail ou mot de passe incorrect."
        : error.code === "auth/too-many-requests" ? "Trop de tentatives. Réessayez plus tard."
        : "Impossible de vous connecter. Vérifiez votre connexion et réessayez.");
    } finally { loginLock.current = false; setBusy(false); }
  };
  const resetPassword = async () => {
    if (!email.trim()) { setLoginMessage("Entrez d’abord votre adresse e-mail."); return; }
    if (loginLock.current) return;
    loginLock.current = true; setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setLoginMessage("Un e-mail de réinitialisation a été envoyé. Vérifiez votre boîte e-mail.");
    } catch { setLoginMessage("Impossible d’envoyer l’e-mail. Vérifiez l’adresse et réessayez."); }
    finally { loginLock.current = false; setBusy(false); }
  };
  const closeRef = useRef(null);
  useEffect(() => {
    if (!showLogin) return;
    const previous = document.activeElement;
    closeRef.current?.focus();
    const escape = (event) => {
      if (event.key === "Escape") setShowLogin(false);
      if (event.key === "Tab") {
        const buttons = closeRef.current?.closest('[role="dialog"]')?.querySelectorAll("button:not(:disabled), input:not(:disabled)");
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("keydown", escape); previous?.focus?.(); };
  }, [showLogin, loginForm]);
  const connected = () => {
    if (auth.currentUser || user?.uid || user?.userId || user?.id) return true;
    try {
      const account = JSON.parse(localStorage.getItem("umiCurrentUser") || "null");
      return Boolean(account?.uid || account?.userId || account?.id);
    } catch { return false; }
  };
  const block = (event) => {
    if (connected() || event.target.closest("[data-live-login-dialog]")) return;
    const button = event.target.closest("button");
    const label = button ? `${button.textContent} ${button.getAttribute("aria-label") || ""} ${button.title || ""}` : "";
    const needsAccount = event.type === "submit" ||
      /acheter|commander|commande|panier|favori|j’aime|j'aime|envoyer|devis/i.test(label) ||
      button?.matches(".umi-replay-send, .umi-live-send, .umi-real-offer-add");
    if (!needsAccount) return;
    event.preventDefault();
    event.stopPropagation();
    setLoginForm(false); setLoginMessage(""); setShowLogin(true);
  };
  return (
    <div style={{ display: "contents" }} onClickCapture={block} onSubmitCapture={block}>
      {children}
      {showLogin && (
        <div data-live-login-dialog style={{ position: "fixed", inset: 0, zIndex: 2147483647, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={(event) => { if (event.target === event.currentTarget) setShowLogin(false); }}>
          <div role="dialog" aria-modal="true" aria-label="Connexion nécessaire" style={{ width: "100%", maxWidth: "340px", boxSizing: "border-box", padding: "24px", maxHeight: "85dvh", overflowY: "auto", borderRadius: "20px", background: "#fff", color: "#163a5c", textAlign: "center", boxShadow: "0 12px 50px #0005" }}>
            <button ref={closeRef} type="button" disabled={busy} onClick={() => { setShowLogin(false); setPassword(""); }} aria-label="Fermer la connexion" style={{ float: "right", border: 0, background: "#edf2f7", borderRadius: "50%", width: "32px", height: "32px", color: "#163a5c", fontSize: "23px", cursor: "pointer" }}>×</button>
            <h2 style={{ margin: "0 0 12px", fontSize: "21px" }}>{loginForm ? "Se connecter à UMI" : "Connexion nécessaire"}</h2>
            {!loginForm ? <>
              <p style={{ margin: "0 0 22px", lineHeight: 1.5 }}>Connectez-vous pour continuer.</p>
              <button type="button" onClick={() => setLoginForm(true)} style={{ width: "100%", padding: "13px", border: 0, borderRadius: "10px", background: "#163a5c", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Se connecter</button>
            </> : <form onSubmit={submitLogin} style={{ textAlign: "left", clear: "both" }}>
              <label htmlFor="umi-live-login-email" style={{ display: "block", marginTop: "18px" }}>Adresse e-mail</label>
              <input id="umi-live-login-email" type="email" required autoComplete="email" value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "13px", marginTop: "7px", border: "1px solid #d5e4f2", borderRadius: "10px", fontSize: "16px", background: "#f8fbff", color: "#163a5c" }} />
              <label htmlFor="umi-live-login-password" style={{ display: "block", marginTop: "16px" }}>Mot de passe</label>
              <input id="umi-live-login-password" type="password" required autoComplete="current-password" value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "13px", marginTop: "7px", border: "1px solid #d5e4f2", borderRadius: "10px", fontSize: "16px", background: "#f8fbff", color: "#163a5c" }} />
              <button type="button" disabled={busy} onClick={resetPassword} style={{ border: 0, background: "transparent", color: "#0758c7", padding: "12px 0", cursor: "pointer" }}>Mot de passe oublié ?</button>
              {loginMessage && <p role="status" style={{ padding: "10px", background: "#edf2f7", borderRadius: "8px", lineHeight: 1.4 }}>{loginMessage}</p>}
              <button type="submit" disabled={busy} style={{ width: "100%", padding: "14px", marginTop: "10px", border: 0, borderRadius: "10px", background: "#163a5c", color: "#fff", fontWeight: 700, fontSize: "16px", cursor: "pointer", opacity: busy ? .6 : 1 }}>{busy ? "Connexion…" : "Se connecter"}</button>
            </form>}
          </div>
        </div>
      )}
    </div>
  );
}

function LiveReviewsWindow({ product, onClose }) {
  const windowRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    windowRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const controls = windowRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]');
        if (!controls?.length) { event.preventDefault(); return; }
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [onClose]);
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 2147483646, background: "rgba(0,0,0,.65)", padding: "12px", display: "flex", justifyContent: "center", alignItems: "center" }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={windowRef} role="dialog" aria-modal="true" aria-label="Avis sur la machine" tabIndex={-1} style={{ position: "relative", width: "100%", maxWidth: "600px", height: "85dvh", overflowY: "auto", borderRadius: "20px", background: "#fff", color: "#163a5c" }}>
        <button type="button" onClick={onClose} aria-label="Fermer les avis" style={{ position: "sticky", top: "10px", marginLeft: "calc(100% - 46px)", zIndex: 2147483647, width: "34px", height: "34px", border: 0, borderRadius: "50%", background: "#163a5c", color: "#fff", fontSize: "24px", cursor: "pointer" }}>×</button>
        <ProductReviews product={product} onBack={onClose} />
      </div>
    </div>, document.body
  );
}

function isMachineFavorite(favorites, machine) {
  if (!Array.isArray(favorites) || !machine?.id) return false;
  const id = String(machine.originalId || machine.id);
  return favorites.some((favorite) => {
    if (favorite.favoriteKey) return favorite.favoriteKey === `machine_${id}`;
    if (favorite.productType && favorite.productType !== "machine") return false;
    return String(favorite.originalId || favorite.machine_ID || favorite.id || "") === id;
  });
}
function LiveCard({
  live: initialLive,
  machines: catalogMachines = [],
  onAddToCart,
  onBuyNow,
  /* FAVORIS */
  favorites = [],
  onToggleFavorite,
  onOpen,
  focused = false,
  onClose,
  user,
  userPhoto = "",
  onCart,
  onOpenChat,
}) {
  const [live, setLive] = useState(initialLive);
  const machines = useMemo(() => getLiveProducts(live, catalogMachines), [live, catalogMachines]);
  const [liveEnded, setLiveEnded] = useState(false);
  const closeLiveRef = useRef(onClose);
  closeLiveRef.current = onClose;
  useEffect(() => {
    if (!focused || !liveEnded) return;
    const timer = setTimeout(() => closeLiveRef.current?.(), 3000);
    return () => clearTimeout(timer);
  }, [focused, liveEnded, initialLive.id]);
  useEffect(() => { setLive(initialLive); }, [initialLive]);
  const [shopMachine, setShopMachine] = useState(null);
  const [reviewMachine, setReviewMachine] = useState(null);
  const [cartNotice, setCartNotice] = useState("");
  const [cartBusy, setCartBusy] = useState(false);
  const cartLock = useRef(false);
  const [offerQuantity, setOfferQuantity] = useState(1);
  useEffect(() => { setOfferQuantity(1); }, [live.liveOfferMachineId]);
  useEffect(() => {
    if (!cartNotice) return;
    const timer = setTimeout(() => setCartNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [cartNotice]);
  const addLiveMachine = async (machine) => {
    machine = withProductModel(machine);
    if (!machine || cartLock.current) return;
    cartLock.current = true;
    setCartBusy(true);
    setCartNotice("");
    try {
      const added = await onAddToCart?.(machine);
      setCartNotice(added === true ? "✓ Produit ajouté au panier." : "Connectez-vous pour ajouter ce produit au panier.");
    } catch (error) {
      console.error("Panier live :", error);
      setCartNotice("Impossible d’ajouter le produit au panier.");
    } finally {
      cartLock.current = false;
      setCartBusy(false);
    }
  };
  const renderLiveMachine = (machine) => (
    <div className="umi-replay-featured umi-real-machine-row" key={machine.id}>
      <button type="button" className="umi-replay-product-link" onClick={() => {
        setShopMachine(machine); setLivePanelTab("details"); setShowLivePanel(true);
      }}>
        {machine.imageUrl || machine.image ? <img src={machine.imageUrl || machine.image} alt="" /> : <span>🏭</span>}
        <span>{machine.name?.trim() && <strong>{machine.name}</strong>}<b>{getProductPrice(machine)}</b></span>
      </button>
      <div className="umi-real-machine-actions">
        <button type="button" className="umi-real-favorite" aria-label="Mettre la machine en favoris" aria-pressed={isMachineFavorite(favorites, machine)}
          onClick={() => onToggleFavorite?.(machine, "machine")}>
          {isMachineFavorite(favorites, machine) ? "♥" : "♡"}
        </button>
        <button type="button" className="umi-replay-buy umi-real-cart" aria-label="Ajouter au panier" disabled={cartBusy} onClick={() => addLiveMachine(machine)}>🛒</button>
        <button type="button" className="umi-replay-buy" onClick={() => onBuyNow?.(machine)}>Acheter</button>
      </div>
    </div>
  );
  const videoRef = useRef(null);
  const [showSimilar, setShowSimilar] = useState(false);
const similarMachines = getSimilarProducts(live, machines);
  const audioRef = useRef(null);
  const roomRef = useRef(null);
  const messageInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const videoCommentsEndRef = useRef(null);
  const videoCommentsRef = useRef(null);
  const [isConnecting, setIsConnecting] =
    useState(false);
  const [isConnected, setIsConnected] =
    useState(false);
  const [error, setError] =
    useState("");
  const [spectatorCount, setSpectatorCount] =
    useState(0);
  const [messages, setMessages] =
    useState([]);
  const [message, setMessage] =
    useState("");
  const [
    sendingMessage,
    setSendingMessage,
  ] = useState(false);
  const [chatError, setChatError] =
    useState("");
  const [
    selectedMessage,
    setSelectedMessage,
  ] = useState(null);
const [previewMode, setPreviewMode] = useState(false);
const [showLivePanel, setShowLivePanel] = useState(false);
const [livePanelTab, setLivePanelTab] = useState("products");
const [showLiveOffer, setShowLiveOffer] = useState(false);
const [presenterMedia, setPresenterMedia] =
  useState(null);
const [floatingHearts, setFloatingHearts] =
  useState([]);
  const [likeCount, setLikeCount] =
  useState(Number(live?.likeCount) || 0);
  const liveMachine =
  machines.find(
    (machine) =>
      String(machine.id) === String(live?.machineId || live?.productId || "")
  ) || null;
  /* ========================================
   J'AIME EN TEMPS RÉEL
======================================== */
useEffect(() => {
  if (!live?.id) {
    return;
  }
  const liveRef =
    doc(db, "live", live.id);
  const unsubscribe =
    onSnapshot(
      liveRef,
      (snapshot) => {
        if (!snapshot.exists()) {
  setLiveEnded(true);
  return;
}

const data = snapshot.data();

if (data.isLive === false || data.stoppedAt) {
  setLiveEnded(true);
}
setLive((current) => ({ ...current, ...data, id: initialLive.id }));
setSpectatorCount(Number(data.agoraViewerCount) || 0);
setLikeCount(
  Number(data.likeCount) || 0
);
/* PHOTO / VIDÉO DU PRÉSENTATEUR */
setPresenterMedia(
  data.presenterMedia || null
);
      },
      (error) => {
        console.error(
          "Erreur compteur J'aime :",
          error
        );
      }
    );
  return () => {
    unsubscribe();
  };
}, [live?.id]);
  /* ========================================
     COMMENTAIRES FIRESTORE
  ======================================== */
  useEffect(() => {
    if (!live.id) {
      return;
    }
    const messagesRef =
      collection(
        db,
        "live",
        live.id,
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
    return () =>
      unsubscribe();
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
  }, [
    messages,
    focused,
    selectedMessage,
  ]);
useEffect(() => {
  if (
    !focused ||
    !videoCommentsRef.current
  ) {
    return;
  }
  const timer = setTimeout(() => {
    const commentsBox =
      videoCommentsRef.current;
    if (!commentsBox) {
      return;
    }
    commentsBox.scrollTop =
      commentsBox.scrollHeight;
  }, 100);
  return () => {
    clearTimeout(timer);
  };
}, [messages.length, focused]);
  /* ========================================
     UTILISATEUR
  ======================================== */
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
    } catch {
      return null;
    }
  };
  /* ========================================
     RÉPONDRE À UN COMMENTAIRE
  ======================================== */
  const selectMessageToReply =
    (item) => {
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
  const sendMessage =
    async () => {
      const cleanMessage =
        message.trim();
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
        const currentUser =
  getCurrentUser();
const userId =
  currentUser?.userId || null;
let commentUserPhoto =
  userPhoto ||
  currentUser?.photoURL ||
  "";
if (userId && !userPhoto) {
  try {
    const userSnapshot =
      await getDoc(
        doc(
          db,
          "users",
          userId
        )
      );
    if (userSnapshot.exists()) {
      commentUserPhoto =
  userSnapshot.data()?.photoURL ||
  userPhoto ||
  "";
    }
  } catch (photoError) {
    console.error(
      "Erreur récupération photo profil :",
      photoError
    );
  }
}
await addDoc(
          collection(
            db,
            "live",
            live.id,
            "questions"
          ),
          {
            text:
              cleanMessage,
            userId:
              currentUser?.userId ||
              null,
            userName:
  currentUser?.nom ||
  currentUser?.name ||
  "Spectateur",
userPhoto:
  commentUserPhoto,
senderRole:
  "spectator",
            liveId:
              live.id,
            liveType:
              live.liveType ||
              "umi",
            roomName:
              live.roomName ||
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
              false,
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
  /* ========================================
     SPECTATEURS
  ======================================== */
  const updateSpectatorCount = () => {}; // Compteur reçu depuis Firestore.
  /* ========================================
     PISTES LIVEKIT
  ======================================== */
  const attachTrack =
    (track) => {
      if (!track) {
        return;
      }
      if (
        track.kind === "video" &&
        videoRef.current
      ) {
        track.attach(
          videoRef.current
        );
      }
      if (
        track.kind === "audio" &&
        audioRef.current
      ) {
        track.attach(
          audioRef.current
        );
      }
    };
  /* ========================================
     REJOINDRE LIVE
  ======================================== */
const isHighlight =
  Boolean(live.highlightPublished && live.highlightUrl);
  const spectatorActiveRef = useRef(false);
  const spectatorJoiningRef = useRef(false);
  const spectatorGenerationRef = useRef(0);
  const spectatorRequestRef = useRef(null);

  const disconnectSpectator = () => {
    spectatorActiveRef.current = false;
    spectatorGenerationRef.current += 1;
    spectatorRequestRef.current?.abort();
    spectatorRequestRef.current = null;
    spectatorJoiningRef.current = false;
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try { Promise.resolve(room.disconnect()).catch(() => {}); }
      catch (error) { console.error("Fermeture du live :", error); }
    }
  };

  const joinLive = async () => {
    if (!focused || !spectatorActiveRef.current) return;
    if (isHighlight) {
      setError(""); setIsConnecting(false); setIsConnected(true);
      try { await videoRef.current?.play(); } catch {}
      return;
    }
    if (spectatorJoiningRef.current || roomRef.current) return;
    if (!live.roomName) { setError("Salle LIVE introuvable."); return; }

    spectatorJoiningRef.current = true;
    const generation = ++spectatorGenerationRef.current;
    const controller = new AbortController();
    spectatorRequestRef.current = controller;
    let room = null;
    const stillActive = () => spectatorActiveRef.current &&
      spectatorGenerationRef.current === generation;
    try {
      setError(""); setIsConnecting(true);
      const data = await requestAgoraToken(API_URL, live.id, "audience", controller.signal);
      if (!stillActive()) return;

      room = new Room({ adaptiveStream: false, dynacast: true });
      roomRef.current = room;
      const ownsRoom = () => stillActive() && roomRef.current === room;
      room.on(RoomEvent.TrackSubscribed, (track, publication) => {
  if (!ownsRoom()) return;

  if (track.kind === "video") {
    publication.setVideoQuality(VideoQuality.HIGH);
  }

  attachTrack(track);
});
      room.on(RoomEvent.ParticipantConnected, () => {
        if (ownsRoom()) updateSpectatorCount(room);
      });
      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        if (ownsRoom()) updateSpectatorCount(room, participant?.identity || "");
      });
      room.on(RoomEvent.Disconnected, () => {
        if (!ownsRoom()) return;
        roomRef.current = null;
        setIsConnected(false); setSpectatorCount(0);
      });

      await room.connect(data);
      if (!ownsRoom()) {
        await room.disconnect();
        return;
      }
      setIsConnected(true);
      updateSpectatorCount(room);
     room.remoteParticipants.forEach((participant) => {
  participant.trackPublications.forEach((publication) => {
    if (publication.kind === "video") {
      publication.setVideoQuality(VideoQuality.HIGH);
    }

    if (publication.track) {
      attachTrack(publication.track);
    }
  });
});
    } catch (error) {
      if (room) {
        if (roomRef.current === room) roomRef.current = null;
        try { await room.disconnect(); } catch {}
      }
      if (!stillActive() || error?.name === "AbortError") return;
      console.error("Erreur connexion LIVE :", error);
      setError(error?.message || "Impossible de rejoindre le LIVE.");
      setIsConnected(false); setSpectatorCount(0);
    } finally {
      if (stillActive()) {
        spectatorJoiningRef.current = false;
        if (spectatorRequestRef.current === controller) spectatorRequestRef.current = null;
        setIsConnecting(false);
      }
    }
  };
  /* ========================================
     OUVRIR CARTE
  ======================================== */
  const handleVideoClick =
    () => {
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
  useEffect(() => {
  spectatorActiveRef.current =
    focused && !liveEnded;

  if (liveEnded) {
    disconnectSpectator();
    setIsConnected(false);
    setIsConnecting(false);
    setSpectatorCount(0);
    return;
  }

  if (focused) joinLive();

  return disconnectSpectator;
}, [focused, live.id, live.roomName, liveEnded]);
  const handlePlayClick =
    (event) => {
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
    if (focused && liveEnded) {
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#080b10",
        color: "#fff",
        fontSize: "28px",
        fontWeight: 800,
        textAlign: "center",
      }}
    >
      Live terminé
    </div>
  );
}
  /* ========================================
     LIVE PLEIN ÉCRAN
  ======================================== */
  if (focused) {
    return (
      <div
  className={
    showLivePanel
      ? "umi-tiktok-live umi-real-live umi-live-panel-open"
      : "umi-tiktok-live umi-real-live"
  }
>
        <style>{liveInteractionStyles}</style>
        <LiveTextOverlay value={live.presenterText} />
        {reviewMachine && <LiveReviewsWindow product={reviewMachine} onClose={() => setReviewMachine(null)} />}
        <div className="umi-live-background">
      
  {/* CAMÉRA LIVEKIT AVEC FILTRE DU PRÉSENTATEUR */}
<video
  ref={videoRef}
  autoPlay
  playsInline
  muted={false}
  className="umi-live-background-video"
  style={{
    filter: ({
      none: "none",
      warm: "sepia(.22) saturate(1.2) brightness(1.05)",
      cold: "hue-rotate(15deg) saturate(.85) contrast(1.08)",
      bw: "grayscale(1) contrast(1.15)",
      bright: "brightness(1.18) saturate(1.08)",
      contrast: "contrast(1.25) saturate(1.15)",
      cinema: "contrast(1.18) saturate(.75) sepia(.12)",
      gold: "sepia(.4) saturate(1.4) brightness(1.08)",
      vintage: "sepia(.5) contrast(.9) saturate(.75)",
      neon: "saturate(2) contrast(1.2) hue-rotate(20deg)",
      rose: "sepia(.25) hue-rotate(310deg) saturate(1.3)",
      dramatic: "grayscale(1) contrast(1.5) brightness(.85)",
      sunset: "sepia(.35) saturate(1.5) hue-rotate(345deg)",
ocean: "sepia(.3) hue-rotate(155deg) saturate(1.3)",
emerald: "sepia(.35) hue-rotate(75deg) saturate(1.2)",
purple: "sepia(.35) hue-rotate(235deg) saturate(1.4)",
retro: "sepia(.45) saturate(.65) contrast(1.15)",
vivid: "saturate(1.6) contrast(1.12) brightness(1.05)",
    })[live.presenterFilter] || "none",
  }}
/>

{/* CŒURS ET ÉTOILES DU PRÉSENTATEUR */}
{["hearts", "stars"].includes(live.presenterEffect) && (
  <div className="umi-spectator-effects">
    {[0, 1, 2, 3, 4].map((index) => (
      <span
        key={`${live.presenterEffect}-${index}`}
        style={{
          left: `${10 + index * 18}%`,
          animationDelay: `${index * 0.6}s`,
        }}
      >
        {live.presenterEffect === "hearts" ? "❤️" : "✨"}
      </span>
    ))}
  </div>
)}

<style>{`
  .umi-spectator-effects {
    position: absolute;
    inset: 0;
    z-index: 5;
    overflow: hidden;
    pointer-events: none;
  }

  .umi-spectator-effects span {
    position: absolute;
    bottom: -60px;
    font-size: 36px;
    animation: umi-spectator-float 4s linear infinite;
  }

  @keyframes umi-spectator-float {
    from {
      transform: translateY(0);
      opacity: 0;
    }
    15% {
      opacity: 1;
    }
    to {
      transform: translateY(-100vh) rotate(20deg);
      opacity: 0;
    }
  }
`}</style>
  {/* AUDIO LIVEKIT
      On garde le son du présentateur
      même pendant l'affichage d'une photo
  */}
  <audio
    ref={audioRef}
    autoPlay
  />
{/* PHOTO DU PRÉSENTATEUR CHEZ LE SPECTATEUR */}
{presenterMedia?.type === "image" && !presenterMedia.composited &&
  presenterMedia?.url && (
  <img
    src={presenterMedia.url}
    alt="Média du Live"
    className={`umi-spectator-live-media${presenterMedia?.layer === "background" ? " umi-live-gallery-background" : ""}`}
  />
)}
{presenterMedia?.type === "video" && !presenterMedia.composited && presenterMedia.url && (
  <video
    key={`${presenterMedia.url}-${presenterMedia.startedAt || ""}`}
    src={presenterMedia.url}
    autoPlay
    playsInline
    muted
    preload="auto"
    className={`umi-spectator-live-media${presenterMedia?.layer === "background" ? " umi-live-gallery-background" : ""}`}
    onLoadedMetadata={(event) => {
      const video = event.currentTarget;
      const startedAt = Number(presenterMedia.startedAt);
      if (startedAt && Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.min(
          Math.max(0, (Date.now() - startedAt) / 1000),
          Math.max(0, video.duration - 0.1)
        );
      }
      video.play().catch(() => {});
    }}
  />
)}
</div>
        {showLivePanel && (
  <div className="umi-live-shop-panel">
{/* FERMER LE PANNEAU */}
<button
  type="button"
  className="umi-live-shop-close"
  onClick={() => setShowLivePanel(false)}
  aria-label="Fermer"
>
  ×
</button>
    <div className="umi-live-shop-tabs">
      <button
        type="button"
        className={
          livePanelTab === "products"
            ? "active"
            : ""
        }
        onClick={() =>
          setLivePanelTab("products")
        }
      >
        Produits
      </button>
      <button
  type="button"
  className={
    livePanelTab === "chat"
      ? "active"
      : ""
  }
  onClick={() =>
    setLivePanelTab("chat")
  }
>
  Chat
</button>
      <button
        type="button"
        className={
          livePanelTab === "details"
            ? "active"
            : ""
        }
        onClick={() => { setShopMachine(null); setLivePanelTab("details"); }}
      >
        Détails live
      </button>
    </div>
{livePanelTab === "products" && (
  <div className="umi-real-panel-scroll">
    <h3>Machines similaires</h3>
    {cartNotice && <div className="umi-real-cart-notice" role="status">{cartNotice}</div>}
    {similarMachines.length ? similarMachines.map(renderLiveMachine) : <p>Aucune machine similaire associée à ce live.</p>}
  </div>
)}
{livePanelTab === "offer" && (() => {
  const offerMachine =
    machines.find(
      (machine) =>
        String(machine.id) ===
        String(live?.liveOfferMachineId)
    );
  if (!offerMachine) {
    return (
      <div className="umi-live-products-empty">
        Machine de l'offre introuvable.
      </div>
    );
  }
  const normalPrice = getProductNumericPrice(offerMachine);
  if (normalPrice === null) return <p>Prix non renseigné pour cette offre.</p>;
  const percent =
    Number(live?.liveOfferPercent) || 0;
  const offerPrice =
    Math.round(
      normalPrice -
      (normalPrice * percent) / 100
    );
  return (
    <div className="umi-live-products-panel">
      <div className="umi-live-products-title">
        Offre Live -{percent}%
      </div>
      <div className="umi-live-product-item">
        {offerMachine.imageUrl && (
          <img
            src={offerMachine.imageUrl}
            alt={
              offerMachine.name ||
              "Machine UMI"
            }
            className="umi-live-product-image"
          />
        )}
        <div className="umi-live-product-info">
          {offerMachine.name?.trim() && <div className="umi-live-product-name">
            {offerMachine.name}
          </div>}
          {/* ANCIEN PRIX */}
          <div
            style={{
              textDecoration: "line-through",
              opacity: 0.65,
              fontSize: "13px",
            }}
          >
            {new Intl.NumberFormat(
              "fr-FR"
            ).format(normalPrice)} FCFA
          </div>
          {/* NOUVEAU PRIX */}
          <div
            className="umi-live-product-price"
            style={{
              fontSize: "18px",
              fontWeight: "900",
            }}
          >
            {new Intl.NumberFormat(
              "fr-FR"
            ).format(offerPrice)} FCFA
          </div>
          <strong>
            -{percent}% Offre live
          </strong>
        </div>
        <button
          type="button"
          className="umi-live-product-cart"
          onClick={() => {
            if (onAddToCart) {
              onAddToCart({
                ...offerMachine,
                originalPrice:
                  normalPrice,
                price:
                  offerPrice,
                liveOfferPercent:
                  percent,
                isLiveOffer:
                  true,
              });
            }
          }}
        >
          🛒 Ajouter au panier
        </button>
      </div>
    </div>
  );
})()}
{livePanelTab === "chat" && (
  <div className="umi-live-panel-chat">
    <ClientChat
      user={user}
      userPhoto={userPhoto}
      embedded={true}
    />
  </div>
)}
{livePanelTab === "details" && (
  <div className="umi-real-panel-scroll umi-live-machine-sheet">
    {!shopMachine && <section className="umi-spectator-live-details">
      {live.title?.trim() && <h3>{live.title}</h3>}
      {live.description?.trim() && <p style={{ whiteSpace: "pre-wrap" }}>{live.description}</p>}
    </section>}

    {(shopMachine ? machines.find((machine) => machine.id === shopMachine.id) : liveMachine) ? (
      <ProductDetail
        key={(shopMachine || liveMachine).id}
        embedded
        product={shopMachine ? machines.find((machine) => machine.id === shopMachine.id) : liveMachine}
        onOpenReviews={() => setReviewMachine(shopMachine ? machines.find((machine) => machine.id === shopMachine.id) : liveMachine)}
        isFavorite={isMachineFavorite(favorites, shopMachine || liveMachine)}
        onToggleFavorite={() => onToggleFavorite?.(shopMachine || liveMachine, "machine")}
        onAddToCart={onAddToCart}
        onOpenCart={onCart}
        onOrder={onBuyNow}
      />
    ) : <p>{live.description || "Aucune machine présentée n’est associée à ce live."}</p>}
  </div>
)}
  </div>
)}
        <div className="umi-live-dark-gradient" />
        <div className="umi-live-overlay-top">
  {/* =========================================
      GAUCHE : PROFIL + TITRE + DIRECT
  ========================================= */}
  <div className="umi-live-top-left">
  <div className="umi-live-profile-main-row">
    {/* PHOTO */}
    
   <div className="umi-live-profile-circle">
  {(live?.presenterPhoto || userPhoto) ? (
  <img
    src={live?.presenterPhoto || userPhoto}
    alt="Présentateur UMI"
    className="umi-live-presenter-photo"
  />
) : (
  <span>U</span>
)}
</div>
    {/* UMI LIVE + EN DIRECT + J'AIME */}
    <div className="umi-live-profile-info">
      <strong>
        UMI LIVE
      </strong>
      <div className="umi-live-red-badge">
        ● EN DIRECT
      </div>
      <div className="umi-live-top-like-count">
        <span className="umi-live-top-like-heart">
          ♥
        </span>
        <span>
          {likeCount} J'aime
        </span>
      </div>
    </div>
  </div>
</div>
  {/* =========================================
      DROITE : SPECTATEURS + FERMER
  ========================================= */}
  <div className="umi-live-top-right">
    <div className="umi-live-viewers">
      👁 {spectatorCount}
    </div>
    {onClose && (
      <button
        type="button"
        className="umi-live-close"
        onClick={() => { disconnectSpectator(); onClose?.(); }}
      >
        ×
      </button>
    )}
  </div>
  {/* OFFRE LIVE */}
{live?.liveOfferMachineId &&
 Number(live?.liveOfferPercent) > 0 && (
  <button
    type="button"
    className="umi-live-offer-badge"
    onClick={() => {
  setShowLiveOffer(true);
}}
  >
    <strong>
      -{live.liveOfferPercent}%
    </strong>
    <span>
      Offre live
    </span>
  </button>
)}
{showLiveOffer && (() => {
  const offerMachine =
    machines.find(
      (machine) =>
        machine.id === live?.liveOfferMachineId
    );
  if (!offerMachine) {
    return null;
  }
  const normalPrice = getProductNumericPrice(offerMachine);
  if (normalPrice === null) return <p>Prix non renseigné pour cette offre.</p>;
  const percent =
    Number(live?.liveOfferPercent) || 0;
  const offerPrice =
    Math.round(
      normalPrice -
      (normalPrice * percent) / 100
    );
  return (
 <div
  className="umi-live-offer-popup"
  role="dialog"
  aria-label="Offre du live"
>
  <button
    type="button"
    className="umi-real-offer-close"
    aria-label="Fermer l’offre"
    onClick={() => setShowLiveOffer(false)}
  >
    ×
  </button>

  <h3>🔥 Offre −{percent}%</h3>

  {(offerMachine.imageUrl || offerMachine.image) && (
    <img
      className="umi-real-offer-image"
      src={offerMachine.imageUrl || offerMachine.image}
      alt={offerMachine.name || "Machine en offre"}
    />
  )}

  {offerMachine.name?.trim() && <strong className="umi-real-offer-name">
    {offerMachine.name}
  </strong>}

  <p className="umi-real-offer-original">
    <s>
      {new Intl.NumberFormat("fr-FR").format(normalPrice)} FCFA
    </s>
  </p>

  <p className="umi-real-offer-price">
    {new Intl.NumberFormat("fr-FR").format(offerPrice)} FCFA
  </p>

  <div className="umi-real-offer-controls">
    <div className="umi-real-offer-quantity">
      <span>Quantité</span>

      <div>
        <button
          type="button"
          aria-label="Diminuer la quantité"
          disabled={cartBusy || offerQuantity <= 1}
          onClick={() =>
            setOfferQuantity((value) => Math.max(1, value - 1))
          }
        >
          −
        </button>

        <strong aria-live="polite">{offerQuantity}</strong>

        <button
          type="button"
          aria-label="Augmenter la quantité"
          disabled={cartBusy}
          onClick={() => setOfferQuantity((value) => value + 1)}
        >
          +
        </button>
      </div>
    </div>

    <button
      type="button"
      className="umi-real-offer-add"
      disabled={cartBusy}
      onClick={() =>
        addLiveMachine({
          ...offerMachine,
          originalPrice: normalPrice,
          price: offerPrice,
          liveOfferPercent: percent,
          isLiveOffer: true,
          quantity: offerQuantity,
        })
      }
    >
      {cartBusy ? "Ajout…" : "🛒 Ajouter"}
    </button>
  </div>

  {cartNotice && (
    <div className="umi-real-cart-notice" role="status">
      {cartNotice}
    </div>
  )}
</div>
  );
})()}
</div>
        {error && (
          <div className="umi-live-overlay-error">
            {error}
          </div>
        )}
{!isConnected && !previewMode && (
  <div className="umi-live-center-play">
          </div>
        )}
{/* =================================
    ACTIONS À DROITE
================================= */}
{!showLivePanel && (
  <>
    <div className="umi-live-side-actions">
  <button
  type="button"
  className="umi-live-side-button"
  onClick={async () => {
  setLikeCount((current) =>
    current + 1
  );
  try {
    await updateDoc(
      doc(db, "live", live.id),
      {
        likeCount: increment(1),
      }
    );
  } catch (error) {
    console.error(
      "Erreur ajout J'aime :",
      error
    );
  }
  const now = Date.now();
    const newHearts =
      Array.from({ length: 5 }).map(
        (_, index) => ({
          id: `${now}-${index}`,
          delay: index * 80,
          offset:
            Math.random() * 50 - 25,
        })
      );
    setFloatingHearts((current) => [
      ...current,
      ...newHearts,
    ]);
    setTimeout(() => {
      setFloatingHearts((current) =>
        current.filter(
          (heart) =>
            !newHearts.some(
              (newHeart) =>
                newHeart.id === heart.id
            )
        )
      );
    }, 1800);
  }}
>
  <span className="umi-live-heart">
    ♥
  </span>
  <small>J'aime</small>
</button>
  <button
  type="button"
  className="umi-live-side-button"
  onClick={async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "UMI LIVE",
          text:
            live.machineName ||
            live.productName ||
            "UMI LIVE",
        });
      }
    } catch (error) {
      console.log(
        "Partage annulé",
        error
      );
    }
  }}
>
  <span>
    <svg
      width="33"
      height="33"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 8L9 3V6.5C5 7 3 9.5 3 14C4.5 11.5 6.5 10.5 9 10.5V14L15 8Z"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
  <small>Partager</small>
</button>
  <button
  type="button"
  className="umi-live-side-button"
  onClick={onCart}
>
  <span className="umi-live-cart-icon">
    🛒

  </span>
  <small>Panier</small>
</button>
</div>
{/* COEURS QUI MONTENT */}
<div className="umi-live-floating-hearts">
  {floatingHearts.map((heart) => (
    <span
      key={heart.id}
      className="umi-live-floating-heart"
      style={{
        "--heart-x": `${heart.offset}px`,
        animationDelay: `${heart.delay}ms`,
      }}
    >
      ♥
    </span>
  ))}
</div>
  </>
)}
        {(isConnected || previewMode) && (
          <div className="umi-live-comments">
            {messages
              .slice(-8)
              .map((item) => {
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
      src={item.userPhoto}
      alt={item.userName || "Profil"}
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
              })}
            <div ref={chatEndRef} />
          </div>
        )}
        {chatError && (
          <div className="umi-live-chat-error">
            {chatError}
          </div>
        )}
{/* =========================================
    COMMENTAIRES SUR LA VIDEO
========================================= */}
{/* =========================================
    MACHINE AFFICHÉE SUR LE LIVE
========================================= */}

{false &&
  (isConnected || previewMode) &&
  !showLivePanel &&
  messages.length > 0 && (
    <div
  className="umi-live-video-comments"
  ref={videoCommentsRef}
  style={{
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  }}
>
  {messages.map((item) => {
          const isPresenter =
            item.senderRole === "presenter";
          return (
           <div
  className={
    selectedMessage?.id === item.id
      ? "umi-live-video-comment selected"
      : "umi-live-video-comment"
  }
  key={item.id}
  onClick={() => {
    selectMessageToReply(item);
  }}
>
              <div className="umi-live-video-comment-avatar">
  {item.userPhoto ? (
    <img
      src={item.userPhoto}
      alt={item.userName || "Profil"}
      className="umi-live-video-comment-avatar-img"
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
              <div className="umi-live-video-comment-content">
                <strong>
                  {isPresenter
                    ? "UMI"
                    : item.userName ||
                      "Spectateur"}
                </strong>
                <span>
                  {item.text}
                </span>
              </div>
            </div>
          );
        })}
<div ref={videoCommentsEndRef} />
    </div>
)}
{(isConnected || previewMode) && (
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
                    setSelectedMessage(
                      null
                    )
                  }
                >
                  ×
                </button>
              </div>
            )}
{!showLivePanel && (
  <div className="umi-live-bottom-content">
{!showLivePanel && liveMachine && (
  <div className="umi-real-featured-bar">
    {renderLiveMachine(liveMachine)}
    {!showLiveOffer && cartNotice && <div className="umi-real-cart-notice" role="status">{cartNotice}</div>}
  </div>
)}
<div className="umi-live-input-row umi-spectator-comment-row">
  {/* BARRE COMMENTAIRE */}
  <div className="umi-live-comment-box">
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
          : "Écrire un commentaire..."
      }
      maxLength={300}
      disabled={sendingMessage}
      autoComplete="off"
    />
    <button
      type="button"
      className="umi-live-send-button"
      aria-label="Envoyer le commentaire"
      onClick={sendMessage}
      disabled={
        sendingMessage ||
        !message.trim()
      }
    >
      {sendingMessage ? "…" : (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 19 9-19 9 4-9-4-9Zm4 9h15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>)}
    </button>
  </div>
  {/* MACHINE SIMILAIRE */}
<button
  type="button"
  className="umi-live-similar-button"
  onClick={() => {
    setShowLivePanel(true);
  }}
>
  <span>Machines<br />similaires</span>
</button>
</div>
</div>
)}
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
        onClick={
          handleVideoClick
        }
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
      </div>
      <div className="live-card-content">
        {live.title?.trim() && <h2>{live.title.trim()}</h2>}
        {(live.machineName?.trim() || live.productName?.trim()) && <p className="live-machine-name">
          {live.machineName?.trim() || live.productName?.trim()}
        </p>}
        <div className="live-actions">
         <button
  type="button"
  onClick={() => onOpen?.(live)}
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
/* Temps forts et vidéos admin : interface commune à la carte et au plein écran. */
function ReplayCard({ live, onOpen, focused = false, onClose, machines: catalogMachines = [],
  onAddToCart,onBuyNow, favorites = [], onToggleFavorite, user, userPhoto = "", onCart, onOpenChat }) {
  const machines = useMemo(() => getLiveProducts(live, catalogMachines), [live, catalogMachines]);
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const inputRef = useRef(null);
  const commentsRef = useRef(null);
  const followCommentsRef = useRef(true);

  useEffect(() => {
    followCommentsRef.current = true;
  }, [live.id, focused]);
  const reactionLock = useRef(false);
  const sendLock = useRef(false);
  const timers = useRef(new Set());
  const [visible, setVisible] = useState(false);
  const [panel, setPanel] = useState("");
  const [tab, setTab] = useState("products");
  const [detailProduct, setDetailProduct] = useState(null);
  const [reviewMachine, setReviewMachine] = useState(null);
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    const element = commentsRef.current;
    if (element && followCommentsRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, focused]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [buying, setBuying] = useState(false);
const [offerQuantity, setOfferQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [likes, setLikes] = useState(Number(live.likeCount) || 0);
  const reactionKey = `umi-liked-${user?.userId || auth.currentUser?.uid || "guest"}-${live.id}`;
  const [liked, setLiked] = useState(false);
  useEffect(() => {
    try { setLiked(localStorage.getItem(reactionKey) === "true"); }
    catch { setLiked(false); }
  }, [reactionKey]);
  const [hearts, setHearts] = useState([]);
  const [presenterPhoto, setPresenterPhoto] = useState(live.presenterPhoto || "");
  const active = focused || visible;
  // Machine présentée dans la barre blanche
const productIds = [live.machineId, live.productId, live.liveOfferMachineId]
  .filter((id) => id !== null && id !== undefined && id !== "");
const product = productIds
  .map((id) => machines.find((item) => String(item.id) === String(id)))
  .find(Boolean);
const displayedProduct = detailProduct || product;
  const similarMachines = getSimilarProducts(live, machines);
  const isAddedVideo =
  live.contentType === "adminVideo";
const percentValue = Number(live.liveOfferPercent);
const percent =
  Number.isFinite(percentValue) &&
  percentValue > 0 &&
  percentValue <= 100
    ? percentValue
    : isAddedVideo
      ? 10
      : 0;
const offerMachine = machines.find(
  (item) =>
    item.id === (
      isAddedVideo
        ? live.liveOfferMachineId || live.machineId
        : live.liveOfferMachineId
    )
);

const offerModels = Array.isArray(offerMachine?.models)
  ? offerMachine.models
  : [];

const firstOfferModel = offerModels[0];
const firstOfferPrice = getProductNumericPrice(offerMachine);
const offerModel = firstOfferModel && firstOfferPrice !== null
  ? { model: firstOfferModel, price: firstOfferPrice } : null;

const offerProduct = offerModel
  ? {
      ...offerMachine,
      selectedModelId: offerModel.model.id,
      model: offerModel.model.name,
      capacity: offerModel.model.capacity ?? "",
      price: offerModel.price,
    }
  : offerMachine;
  const imageFor = (item) => {
    const image = item?.imageUrl || item?.images?.[0] || item?.models?.[0]?.images?.[0] || item?.productImage;
    return typeof image === "string" ? image : image?.url || image?.secure_url || "";
  };
  const numericPrice = (price) => {
    if (typeof price === "number") return Number.isFinite(price) ? price : null;
    if (typeof price !== "string" || !price.trim()) return null;
    const clean = price.replace(/FCFA/gi, "").replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
    const value = Number(clean);
    return Number.isFinite(value) ? value : null;
  };
  const formatPrice = (price) => {
  const value = numericPrice(price);

  if (value !== null) {
    return `${value.toLocaleString("fr-FR")} FCFA`;
  }

  return price ? String(price) : "Prix non renseigné";
};
  const basePrice = numericPrice(offerProduct?.price);
  const offerPrice = basePrice !== null ? Math.round(basePrice * (1 - percent / 100)) : null;
  const hasOffer = Boolean(offerProduct && percent && offerPrice !== null);
  const productName = product?.name?.trim() || live.productName?.trim() || live.machineName?.trim() || "";
  const profilePhoto = presenterPhoto || live.presenterPhoto || ((!live.liveType || live.liveType === "umi") ? logoUmi : "");
  const currentUser = () => {
    if (user) return user;
    try { return JSON.parse(localStorage.getItem("umiCurrentUser") || "null"); } catch { return null; }
  };
  useEffect(() => {
    if (focused || !cardRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [focused]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) video.play().catch(() => setPaused(true));
    else video.pause();
    return () => video.pause();
  }, [active, live.highlightUrl]);
  useEffect(() => {
    if (!active || !live.id) return;
    const stopMessages = onSnapshot(collection(db, "live", live.id, "questions"), (snapshot) => {
      setMessages(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
    }, () => setNotice("Impossible de charger les commentaires."));
    const stopLikes = onSnapshot(doc(db, "live", live.id), (snapshot) => {
      const data = snapshot.data();
      setLikes(Number(data?.likeCount) || 0);
      if (data?.presenterPhoto) setPresenterPhoto(data.presenterPhoto);
    }, () => setNotice("Impossible de charger les réactions."));
    return () => { stopMessages(); stopLikes(); };
  }, [active, live.id]);
  useEffect(() => {
    const presenterId = live.presenterId || live.sellerId || live.userId || live.createdBy;
    if (live.presenterPhoto || typeof presenterId !== "string" || !presenterId) return;
    let cancelled = false;
    getDoc(doc(db, "users", presenterId)).then((snapshot) => {
      if (!cancelled && snapshot.exists()) setPresenterPhoto(snapshot.data().photoURL || "");
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [live.presenterPhoto, live.presenterId, live.sellerId, live.userId, live.createdBy]);
  useEffect(() => {
    const close = (event) => {
      if (event.key !== "Escape") return;
      if (panel) setPanel(""); else if (focused) onClose?.();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [panel, focused, onClose]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const animateHeart = () => {
    const id = `${Date.now()}-${Math.random()}`;
    setHearts((current) => [...current.slice(-8), { id, left: 88 }]);
    const timer = setTimeout(() => {
      setHearts((current) => current.filter((heart) => heart.id !== id));
      timers.current.delete(timer);
    }, 1500);
    timers.current.add(timer);
  };
  const react = async () => {
    if (!auth.currentUser) { setNotice("Connectez-vous pour donner un J’aime."); return; }
    if (reactionLock.current) return;
    reactionLock.current = true;
    animateHeart();
    try {
      await updateDoc(doc(db, "live", live.id), { likeCount: increment(liked ? -1 : 1), heartCount: increment(liked ? -1 : 1) });
      setLiked(!liked);
      try { localStorage.setItem(reactionKey, String(!liked)); } catch {}
      setNotice("");
    } catch { setNotice("Impossible d’enregistrer le J’aime."); }
    finally { reactionLock.current = false; }
  };
  const shareVideo = async () => {
  if (typeof navigator.share !== "function") {
    setNotice(
      "Le partage du téléphone n’est pas disponible ici."
    );
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("umiLive", live.id);
  const link = url.href;
  let payload = {
    url: link,
  };
  // Si le navigateur refuse le lien comme URL,
  // on le transmet comme texte au menu de partage.
  if (
    typeof navigator.canShare === "function" &&
    !navigator.canShare(payload)
  ) {
    payload = {
      text: link,
    };
  }
  try {
    await navigator.share(payload);
    setNotice("");
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error("Erreur partage UMI :", error);
    setNotice(
      `Partage impossible : ${
        error?.message || error?.name || "erreur inconnue"
      }`
    );
  }
};
  const sendMessage = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || sendLock.current) return;
    const account = currentUser();
    if (!auth.currentUser) { setNotice("Connectez-vous pour commenter."); return; }
    sendLock.current = true; setSending(true);
    try {
      await addDoc(collection(db, "live", live.id, "questions"), {
        text, userId: auth.currentUser.uid,
        userName: account?.nom || account?.name || auth.currentUser.displayName || "Spectateur",
        userPhoto: userPhoto || account?.photoURL || auth.currentUser.photoURL || "",
        senderRole: "spectator", liveId: live.id, liveType: live.liveType || "umi",
        createdAt: serverTimestamp(), answered: false,
      });
      setMessage(""); setNotice("");
    } catch (error) { console.error("Commentaire UMI :", error); setNotice("Impossible d’envoyer le commentaire."); }
    finally { sendLock.current = false; setSending(false); }
  };
  const buy = async (machine, discounted = false) => {
  if (!machine || buying) return;
  if (!onAddToCart) {
    setNotice("Impossible d’accéder au panier.");
    return;
  }
  setBuying(true);
  setNotice("");
  try {
    const models = Array.isArray(machine.models)
  ? machine.models
  : [];

const selectedModel =
  models.find(
    (model) =>
      machine.selectedModelId &&
      model.id === machine.selectedModelId
  ) ||
  models[0] ||
  null;

const realPrice = numericPrice(
  selectedModel?.price ?? machine.price ?? machine.prix
);

if (realPrice === null) {
  setNotice("Le prix de cette machine n’est pas renseigné.");
  return;
}

const selectedMachine = {
  ...machine,
  ...(selectedModel
    ? {
        selectedModelId: selectedModel.id,
        model: selectedModel.name,
        capacity: selectedModel.capacity ?? "",
      }
    : {}),
  price: realPrice,
};

const item =
  discounted && hasOffer
    ? {
        ...selectedMachine,
        originalPrice: basePrice,
        price: offerPrice,
        liveOfferPercent: percent,
        isLiveOffer: true,
        quantity: offerQuantity,
      }
    : selectedMachine;
    const added = await onAddToCart(item);
   if (added === true) {
  const confirmation = "✓ Produit ajouté au panier.";
  setNotice(confirmation);
  const timer = setTimeout(() => {
    setNotice((current) =>
      current === confirmation ? "" : current
    );
    timers.current.delete(timer);
  }, 3000);
  timers.current.add(timer);
}else {
      setNotice(
        "Le produit n’a pas été ajouté. Vérifiez votre connexion au compte."
      );
    }
  } catch (error) {
    console.error("Erreur panier :", error);
    setNotice("Impossible d’ajouter le produit au panier.");
  } finally {
    setBuying(false);
  }
};
  const openPanel = (nextTab = "products") => { setDetailProduct(null); setTab(nextTab); setPanel("shop"); };
  const showMachine = (machine) => { setDetailProduct(machine); setTab("details"); setPanel("shop"); };
  const shareIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4l7 7-7 7v-5C8 13 5 15 3 19c0-8 4-11 11-11V4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  const featuredCard = (
  machine,
  discounted = false,
  directOrder = false
) => (
    <div className="umi-replay-featured" key={machine?.id || "featured"}>
      <button type="button" className="umi-replay-product-link" onClick={(event) => {
        event.stopPropagation();
        if (machine) showMachine(machine);
        else setNotice("Cette machine n’est plus disponible dans le catalogue.");
      }} aria-label="Voir la machine">
        {imageFor(machine) ? <img src={imageFor(machine)} alt="" /> : <span>🏭</span>}
        <span>
  {(machine?.name?.trim() || productName) && <strong>{machine?.name?.trim() || productName}</strong>}

  <b>
    {discounted && offerPrice !== null
      ? formatPrice(offerPrice)
      : machine || product
        ? getProductPrice(machine || product)
        : formatPrice(live.price)}
  </b>
</span>
      </button>
      {machine && (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      flexShrink: 0,
    }}
  >
    <button
      type="button"
      aria-label="Mettre ou retirer la machine des favoris"
      title="Favoris"
      aria-pressed={isMachineFavorite(favorites, machine)}
      onClick={(event) => {
        event.stopPropagation();
        onToggleFavorite?.(machine, "machine");
      }}
      style={{
        minWidth: "34px", height: "36px", padding: "4px",
        border: "none", borderRadius: "10px",
        background: "#fff0f3", color: "#e11d48",
        fontSize: "26px", lineHeight: 1, cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {isMachineFavorite(favorites, machine) ? "♥" : "♡"}
    </button>
    <button
      type="button"
      className="umi-replay-buy"
      disabled={buying}
      aria-label="Ajouter cette machine au panier"
      title="Ajouter au panier"
      onClick={(event) => {
        event.stopPropagation();
        buy(machine, discounted);
      }}
      style={{
  minWidth: "36px",
  padding: "8px",
  background: "#163a5c",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
}}
    >
      🛒
    </button>
    <button
      type="button"
      className="umi-replay-buy"
      disabled={buying}
      onClick={(event) => {
        event.stopPropagation();
        if (directOrder) {
  const models = Array.isArray(machine.models)
    ? machine.models
    : [];

  const selectedModel =
    models.find(
      (model) =>
        machine.selectedModelId &&
        model.id === machine.selectedModelId
    ) ||
    models[0] ||
    null;

  const price = numericPrice(
    selectedModel?.price ?? machine.price ?? machine.prix
  );

  if (price === null) {
    setNotice("Prix non renseigné pour cette machine.");
    return;
  }

  onBuyNow?.({
    ...machine,
    ...(selectedModel
      ? {
          selectedModelId: selectedModel.id,
          model: selectedModel.name,
          capacity: selectedModel.capacity ?? "",
        }
      : {}),
    price,
  });

  return;
}
        buy(machine, discounted);
      }}
    >
      Acheter
    </button>
  </div>
)}
    </div>
  );
  return (
    <article ref={cardRef} className={`umi-replay-surface ${focused ? "umi-replay-full" : "live-card umi-vertical-card umi-replay-preview"}`} aria-label={live.title || "Vidéo UMI"}>
      <style>{liveInteractionStyles}</style>
        {reviewMachine && <LiveReviewsWindow product={reviewMachine} onClose={() => setReviewMachine(null)} />}
      <video ref={videoRef} src={live.highlightUrl} autoPlay muted={muted} loop playsInline preload="metadata"
        className="umi-replay-video" onClick={() => { if (!focused) onOpen?.(live); else { const video = videoRef.current; if (video.paused) video.play().catch(() => setNotice("Touchez Lecture pour démarrer.")); else video.pause(); } }}
        onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onError={() => setNotice("La vidéo ne peut pas être chargée.")} />
      <div className="umi-replay-gradient" />
      <header className="umi-replay-header">
        <div className="umi-replay-avatar">{profilePhoto ? <img src={profilePhoto} alt="Profil du présentateur" /> : <span>U</span>}</div>
        <div className="umi-replay-brand"><strong>UMI LIVE</strong><span>● EN DIRECT</span></div>
        <span className="umi-replay-count">{likes.toLocaleString("fr-FR")} J’aime</span>
        {focused && <button type="button" className="umi-replay-close" onClick={onClose} aria-label="Fermer">×</button>}
      </header>
     <button
  type="button"
  className="umi-replay-offer"
  onClick={() => {
    if (hasOffer) {
      setPanel("offer");
    } else {
      setNotice(
        "Aucune machine avec un prix n’est associée à cette vidéo."
      );
    }
  }}
  aria-label="Voir l’offre de 10 %"
>
  <strong>−{percent}%</strong>
  <span>Offre live</span>
</button>
      <div className="umi-replay-side">
        <button type="button" onClick={react} aria-label="Donner ou retirer un J’aime" aria-pressed={liked}><span className="umi-replay-heart" style={{ color: liked ? "#ff2451" : "#fff" }}>{liked ? "♥" : "♡"}</span><small>J’aime</small></button>
        <button type="button" onClick={shareVideo} aria-label="Partager la vidéo">{shareIcon}<small>Partager</small></button>
        <button type="button" onClick={() => onCart ? onCart() : setNotice("Le panier doit être connecté dans App.jsx.")} aria-label="Ouvrir le panier"><span>🛒</span><small>Panier</small></button>
        <button
  type="button"
  className="umi-replay-sound"
  aria-label={muted ? "Activer le son" : "Couper le son"}
  aria-pressed={!muted}
  onClick={(event) => {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) {
      setNotice("La vidéo n’est pas encore prête.");
      return;
    }
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
    if (!nextMuted) {
      video.volume = 1;
    }
    if (video.paused) {
      video.play().catch(() => {
        setNotice("Impossible de démarrer la vidéo.");
      });
    }
  }}
>
  <span aria-hidden="true">
    {muted ? "🔇" : "🔊"}
  </span>
  <small>
    {muted ? "Activer le son" : "Couper le son"}
  </small>
</button>
      </div>
      <div className="umi-replay-hearts" aria-hidden="true">{hearts.map((heart) => <span key={heart.id} style={{ left: `${heart.left}%` }}>♥</span>)}</div>
      {paused && !panel && <button type="button" className="umi-replay-play" onClick={() => videoRef.current?.play().catch(() => setNotice("Impossible de lire la vidéo."))} aria-label="Lire la vidéo">▶</button>}
      <div className="umi-replay-bottom">
        {live.title?.trim() && <h2>{live.title.trim()}</h2>}
        <div
  ref={commentsRef}
  className="umi-replay-comments"
  aria-label="Commentaires"
  tabIndex={0}
  onScroll={(event) => {
    const element = event.currentTarget;
    followCommentsRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 32;
  }}
  style={{
    height: "130px",
    maxHeight: "130px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    touchAction: "pan-y",
    overscrollBehaviorY: "contain",
    pointerEvents: "auto",
  }}
  onTouchStart={(event) => event.stopPropagation()}
  onTouchMove={(event) => event.stopPropagation()}
  onTouchEnd={(event) => event.stopPropagation()}
  onWheel={(event) => event.stopPropagation()}
>
  {messages.map((item) => (
    <div
      key={item.id}
      className="umi-replay-comment"
      style={{ flexShrink: 0 }}
    >
      {item.userPhoto ? (
        <img src={item.userPhoto} alt="" />
      ) : (
        <span className="umi-replay-comment-avatar">
          {(item.userName || "S")[0]}
        </span>
      )}

      <div>
        <strong>
          {item.userName || "Spectateur"}
        </strong>
        <span>{item.text}</span>
      </div>
    </div>
  ))}
</div>

{(product || productName || live.price) && featuredCard(product, false, true)}

{notice && (
  <div className="umi-replay-notice" role="status">
    {notice}
  </div>
)}

<form
  className="umi-replay-form umi-spectator-comment-row"
  onSubmit={sendMessage}
>
  <div className="umi-replay-input-wrap">
    <input
      ref={inputRef}
      value={message}
      onChange={(event) => setMessage(event.target.value)}
      placeholder="Écrire un commentaire…"
      aria-label="Commentaire"
      maxLength={1000}
      disabled={sending}
    />

    <button
      type="submit"
      className="umi-replay-send"
      disabled={sending || !message.trim()}
      aria-label="Envoyer le commentaire"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m3 3 19 9-19 9 4-9-4-9Zm4 9h15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  </div>

  <button
    type="button"
    className="umi-replay-similar"
    onClick={() => openPanel()}
  >
    <span>Machines<br />similaires</span>
</button>
</form>
</div>

{panel && (
  <div
    className={`umi-replay-panel ${
      panel === "offer" ? "umi-replay-offer-window" : ""
    }`}
    role="dialog"
    aria-label={
      panel === "offer" ? "Offre live" : "Machines et messages"
    }
  >
    <button
      type="button"
      className="umi-replay-panel-close"
      onClick={() => setPanel("")}
      aria-label="Fermer le panneau"
    >
      ×
    </button>

    {panel === "offer" ? (
      <>
        <h3>🔥 Offre −{percent}%</h3>

        {hasOffer ? (
          <>
            {imageFor(offerProduct) && (
              <img
                className="umi-offer-machine-image"
                src={imageFor(offerProduct)}
                alt={offerProduct.name || "Machine en offre"}
              />
            )}

            {offerProduct.name?.trim() && <strong>
              {offerProduct.name}
            </strong>}

            <p>
              <s>{formatPrice(basePrice)}</s>
            </p>

            <p className="umi-offer-price">
              {formatPrice(offerPrice)}
            </p>

            <div className="umi-offer-cart-row">
              <div className="umi-offer-quantity">
                <span>Quantité</span>

                <div className="umi-offer-quantity-controls">
                  <button
                    type="button"
                    disabled={buying || offerQuantity <= 1}
                    onClick={() =>
                      setOfferQuantity((quantity) =>
                        Math.max(1, quantity - 1)
                      )
                    }
                    aria-label="Diminuer la quantité"
                  >
                    −
                  </button>

                  <strong aria-live="polite">
                    {offerQuantity}
                  </strong>

                  <button
                    type="button"
                    disabled={buying}
                    onClick={() =>
                      setOfferQuantity((quantity) => quantity + 1)
                    }
                    aria-label="Augmenter la quantité"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="umi-offer-add-cart"
                disabled={buying}
                onClick={() => buy(offerProduct, true)}
              >
                <span aria-hidden="true">🛒</span>
                {buying ? "Ajout…" : "Ajouter"}
              </button>
            </div>
          </>
        ) : (
          <p>Aucune machine disponible pour cette offre.</p>
        )}

        {notice && (
          <p
            className="umi-offer-confirmation"
            role="status"
          >
            {notice}
          </p>
        )}
      </>
) : <>
          <div className="umi-replay-tabs">{[["products", "Produits"], ["chat", "Message"], ["details", "Description"]].map(([value, label]) => <button type="button" key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label}</button>)}</div>
          {tab === "products" && <><h3>Machines similaires</h3>{notice && (
  <div
    role="status"
    style={{
      position: "sticky",
      top: 0,
      zIndex: 10,
      marginBottom: "12px",
      padding: "12px",
      borderRadius: "12px",
      background: "#e8f5e9",
      color: "#163a5c",
      fontWeight: 700,
      textAlign: "center",
    }}
  >
    {notice}
  </div>
)}{similarMachines.length ? similarMachines.map((machine) =>
  featuredCard(machine, false, true)
) : <p>Aucune machine similaire associée à cette vidéo.</p>}</>}
          {tab === "chat" && (currentUser() || auth.currentUser ? <ClientChat user={currentUser() || auth.currentUser} userPhoto={userPhoto || currentUser()?.photoURL || auth.currentUser?.photoURL || ""} embedded={true} /> : <p>Connectez-vous pour envoyer un message à UMI.</p>)}
          {tab === "details" && (
  displayedProduct ? (
    <div className="umi-live-machine-sheet">
      <ProductDetail
        key={displayedProduct.id}
        embedded
        product={displayedProduct}
        onOpenReviews={() => setReviewMachine(displayedProduct)}
        isFavorite={isMachineFavorite(favorites, displayedProduct)}
        onToggleFavorite={() => onToggleFavorite?.(displayedProduct, "machine")}
        onBack={() => setTab("products")}
        onOpenCart={onCart}
        onAddToCart={onAddToCart}
        onOrder={(selectedMachine) => {
          onBuyNow?.(selectedMachine);
        }}
      />
    </div>
  ) : (
    <p>
      Aucune machine présentée n’est associée à cette vidéo.
    </p>
  )
)}
        </>}
      </div>
      )}
    </article>
  );
}
function UpcomingLiveCard({
  live,
}) {
  const scheduledDate =
    live.scheduledAt?.toDate?.();
  if (!scheduledDate) {
    return null;
  }
  const isClient =
    live.liveType ===
    "client";
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
        {(isClient || live.machineName?.trim()) && <p className="live-machine-name">
          {isClient
            ? `Vendeur : ${
                live.sellerName ||
                "Vendeur UMI"
              }`
            : live.machineName}
        </p>}
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
  user,
  onBack,
  onCreateClientLive,
  onOpenMyLives,
  onOpenClientVideos,
  machines = [],
  onAddToCart,
onBuyNow,
  /* FAVORIS */
  favorites = [],
  onToggleFavorite,
  /* MODE APERÇU SPECTATEUR */
  previewMode = false,
  previewProduct = null,
  /* PHOTO DU COMPTE */
  userPhoto,
  /* BARRE DES TÂCHES */
  onHome,
  onMachines,
  onLive,
  onCart,
  onOpenChat,
  onAccount,
}) {
  /* =====================================================
   APERÇU SPECTATEUR SANS LIVEKIT
===================================================== */
const previewLive = previewMode
  ? {
      id: "preview-live",
      isLive: true,
      liveType: "client",
      title:
        previewProduct?.productName ||
        "Machine OMO",
      productName:
        previewProduct?.productName ||
        "Machine OMO",
      sellerName:
        previewProduct?.sellerName ||
        "Vendeur UMI",
      price:
        previewProduct?.price ||
        "2 500 000 FCFA",
      description:
        previewProduct?.description ||
        "Présentation de la machine en direct.",
      viewerCount: 24,
      isPreview: true,
    }
  : null;
  const [items, setItems] =
    useState([]);
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
   OUVRIR AUTOMATIQUEMENT
   L'APERÇU SPECTATEUR
======================================== */
useEffect(() => {
  if (previewMode && previewLive) {
    setSelectedLive(
      previewLive
    );
  }
}, [previewMode]);
  /* ========================================
     HORLOGE
  ======================================== */
  useEffect(() => {
    const interval =
      setInterval(() => {
        setNow(
          Date.now()
        );
      }, 15000);
    return () =>
      clearInterval(
        interval
      );
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
              .map(
                (liveDoc) => ({
                  id: liveDoc.id,
                  ...liveDoc.data(),
                })
              )
              .filter(
                (live) => {
                  if (
                    live.isScheduled ===
                      true &&
                    live.isLive ===
                      false &&
                    live.scheduledAt
                  ) {
                    return true;
                  }
                  if (
                    live.isLive ===
                      true &&
                    typeof live.roomName ===
                      "string" &&
                    live.roomName.trim() !==
                      ""
                  ) {
                    return true;
                  }
                  if (
                    live.isLive ===
                      false &&
                    live.highlightPublished ===
                      true &&
                    typeof live.highlightUrl ===
                      "string" &&
                    live.highlightUrl.trim() !==
                      ""
                  ) {
                    return true;
                  }
                  return false;
                }
              );
          itemList.sort(
            (a, b) => {
              const aTime =
                a.isLive
                  ? a.startedAt?.seconds ||
                    0
                  : a.stoppedAt?.seconds ||
                    a.startedAt?.seconds ||
                    0;
              const bTime =
                b.isLive
                  ? b.startedAt?.seconds ||
                    0
                  : b.stoppedAt?.seconds ||
                    b.startedAt?.seconds ||
                    0;
              return (
                bTime -
                aTime
              );
            }
          );
          setItems(
            itemList
          );
        },
        (firestoreError) => {
          console.error(
            "Erreur UMI LIVE :",
            firestoreError
          );
        }
      );
    return () =>
      unsubscribe();
  }, []);
/* ========================================
   ACTUALISER LIVE SÉLECTIONNÉ
======================================== */
const sharedVideoOpened = useRef(false);
useEffect(() => {
  if (sharedVideoOpened.current) return;
  const id = new URLSearchParams(window.location.search).get("umiLive");
  if (!id) return;
  const video = items.find((item) => item.id === id);
  if (video) { sharedVideoOpened.current = true; setSelectedLive(video); }
}, [items]);
const selectedLiveId = selectedLive?.id;
useEffect(() => {
  if (!selectedLiveId) {
    return;
  }
  const updated = items.find(
    (item) => item.id === selectedLiveId
  );
  if (!updated) {
    return;
  }
  setSelectedLive((current) => {
    if (!current || current.id !== selectedLiveId) {
      return current;
    }
    return {
      ...current,
      ...updated,
      isLive: current.isLive === true ? true : updated.isLive,
    };
  });
}, [items, selectedLiveId]);
  /* ========================================
     FILTRES
  ======================================== */
  const filteredItems =
    items.filter(
      (live) => {
        if (
          activeFilter ===
          "upcoming"
        ) {
          return (
            live.isScheduled ===
              true &&
            live.isLive ===
              false &&
            Boolean(
              live.scheduledAt
            ) &&
            typeof live.scheduledAt
              .toMillis ===
              "function" &&
            live.scheduledAt.toMillis() >
              now
          );
        }
        if (
          live.isScheduled ===
            true &&
          live.isLive ===
            false
        ) {
          return false;
        }
        if (
          activeFilter ===
          "all"
        ) {
          return true;
        }
        if (
          activeFilter ===
          "umi"
        ) {
          return (
            !live.liveType ||
            live.liveType ===
              "umi"
          );
        }
        if (
          activeFilter ===
          "clients"
        ) {
          return (
            live.liveType ===
            "client"
          );
        }
        return true;
      }
    );
  const displayedItems =
    activeFilter ===
    "upcoming"
      ? [...filteredItems].sort(
          (a, b) => {
            const aIsUmi =
              !a.liveType ||
              a.liveType ===
                "umi";
            const bIsUmi =
              !b.liveType ||
              b.liveType ===
                "umi";
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
                  ?.toMillis?.() ||
                0
              ) -
              (
                b.scheduledAt
                  ?.toMillis?.() ||
                0
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
      selectedLive.isLive ===
      true
    ) {
      return (
        <LiveLoginGate user={user} onAccount={onAccount}>
        <LiveCard
          live={selectedLive}
          machines={machines}
          onAddToCart={onAddToCart}
          onBuyNow={onBuyNow}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          user={user}
          userPhoto={userPhoto}
          onCart={onCart}
          onOpenChat={onOpenChat}
          focused={true}
          onClose={() => {
            setSelectedLive(null);
            setActiveFilter("all");
          }}
        />
        </LiveLoginGate>
      );
    }
    return (
      <LiveLoginGate user={user} onAccount={onAccount}>
      <ReplayCard live={selectedLive} focused={true}
        favorites={favorites} onToggleFavorite={onToggleFavorite}
        machines={machines} onAddToCart={onAddToCart} onBuyNow={onBuyNow} user={user} userPhoto={userPhoto} onCart={onCart} onOpenChat={onOpenChat}
        onClose={() => setSelectedLive(null)} />
      </LiveLoginGate>
    );
  }
  /* ========================================
     PAGE PRINCIPALE
  ======================================== */
  return (
    <LiveLoginGate user={user} onAccount={onAccount}>
    <div className="umi-live-page">
      {/* HEADER */}
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
      {/* FILTRES */}
      <div className="umi-live-filters">
        <button
          type="button"
          className={
            activeFilter === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveFilter(
              "all"
            )
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
            setActiveFilter(
              "umi"
            )
          }
        >
          LIVE UMI
        </button>
        <button
          type="button"
          className={
            activeFilter ===
            "clients"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveFilter(
              "clients"
            )
          }
        >
          LIVE Clients
        </button>
        <button
          type="button"
          className={
            activeFilter ===
            "upcoming"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveFilter(
              "upcoming"
            )
          }
        >
          À venir
        </button>
      </div>
      {/* CONTENU */}
      <main className="umi-live-content">
        {/* =====================================
            BOUTONS CLIENT
        ===================================== */}
        {activeFilter ===
          "clients" && (
          <div className="umi-live-client-buttons">
            <button type="button" className="create-client-live-button" onClick={onOpenClientVideos}>🎥 Vidéo live</button>
            <button
              type="button"
              className="create-client-live-button"
              onClick={
                onCreateClientLive
              }
            >
              <span>＋</span>
              Créer mon LIVE
            </button>
            <button
              type="button"
              className="create-client-live-button"
              onClick={
                onOpenMyLives
              }
            >
              <span>📹</span>
              Mes LIVE
            </button>
          </div>
        )}
        {/* AUCUN LIVE */}
        {displayedItems.length ===
        0 ? (
          <div className="no-live-message">
            <div className="no-live-icon">
              {activeFilter ===
              "upcoming"
                ? "📅"
                : "📹"}
            </div>
            <h2>
              {activeFilter ===
              "clients"
                ? "Aucun LIVE Client actuellement"
                : activeFilter ===
                  "upcoming"
                ? "Aucun LIVE à venir"
                : "Aucun LIVE ou Temps fort actuellement"}
            </h2>
            <p>
              {activeFilter ===
              "clients"
                ? "Soyez le premier vendeur à présenter un produit en direct."
                : activeFilter ===
                  "upcoming"
                ? "Les prochains directs UMI et Clients apparaîtront ici."
                : "Les directs et les temps forts apparaîtront ici."}
            </p>
          </div>
        ) : (
          <div className="umi-live-cards-grid">
            {displayedItems.map(
              (live) => {
                if (
                  live.isScheduled ===
                    true &&
                  live.isLive ===
                    false
                ) {
                  return (
                    <UpcomingLiveCard
                      key={live.id}
                      live={live}
                    />
                  );
                }
                if (
                  live.isLive ===
                  true
                ) {
                  return (
                    <LiveCard
                      key={live.id}
                      live={live}
                      machines={machines}
                      onAddToCart={onAddToCart}
                      onBuyNow={onBuyNow}
                      favorites={favorites}
                      onToggleFavorite={onToggleFavorite}
                      user={user}
                      userPhoto={userPhoto}
                      onCart={onCart}
                      onOpenChat={onOpenChat}
                      onOpen={
                        setSelectedLive
                      }
                    />
                  );
                }
                return (
                  <ReplayCard
  favorites={favorites}
  onToggleFavorite={onToggleFavorite}
  key={live.id}
  live={live}
  machines={machines}
  onAddToCart={onAddToCart}
  onBuyNow={onBuyNow}
  user={user}
  userPhoto={userPhoto}
  onCart={onCart}
  onOpenChat={onOpenChat}
  onOpen={setSelectedLive}
/>
                );
              }
            )}
          </div>
        )}
      </main>
      {/* =========================================
          BARRE DES TÂCHES CLIENT
      ========================================= */}
      <nav className="umi-client-bottom-nav">
        {/* ACCUEIL */}
        <button
          type="button"
          className="umi-client-bottom-nav-item"
          onClick={onHome}
        >
          <span className="umi-client-bottom-nav-icon">
            🏠
          </span>
          <span>
            Accueil
          </span>
        </button>
        {/* MACHINES */}
        <button
          type="button"
          className="umi-client-bottom-nav-item"
          onClick={onMachines}
        >
          <span className="umi-client-bottom-nav-icon">
            ⚙️
          </span>
          <span>
            Machines
          </span>
        </button>
        {/* UMI LIVE - ACTIF */}
        <button
          type="button"
          className="umi-client-bottom-nav-item active"
          onClick={onLive}
        >
          <span className="umi-client-live-icon">
            ▶
          </span>
          <span>
            UMI LIVE
          </span>
        </button>
        {/* PANIER */}
        <button
          type="button"
          className="umi-client-bottom-nav-item"
          onClick={onCart}
        >
          <span className="umi-client-bottom-nav-icon">
            🛒
          </span>
          <span>
            Panier
          </span>
        </button>
        {/* =====================================
            COMPTE AVEC PHOTO
        ===================================== */}
        <button
          type="button"
          className="umi-client-bottom-nav-item"
          onClick={onAccount}
        >
          <span className="umi-client-account-photo-wrapper">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt="Compte"
                className="umi-client-account-photo"
              />
            ) : (
              <span className="umi-client-bottom-nav-icon">
                👤
              </span>
            )}
          </span>
          <span>
            Compte
          </span>
        </button>
      </nav>
    </div>
    </LiveLoginGate>
  );
}
export default UmiLive;
