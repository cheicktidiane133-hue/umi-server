import AutoPlayingVideo from "./AutoPlayingVideo";
import ClientProductImport from "./ClientProductImport";
import { withProductModel } from "./productModel";
import { useEffect, useState } from "react";
import {
   addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  runTransaction,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import AdminLivePreview from "./AdminLivePreview";
import Machines from "./Machines";
import MachineCategory from "./MachineCategory";
const API_URL = import.meta.env.VITE_UMI_API_URL || "https://umi-server.onrender.com";
import { useUmiDialog } from "./UmiDialogProvider";
import "./AdminLive.css";
import logoUmi from "./assets/logo-umi.jpeg";
function isUmiLive(live) {
  return !live.liveType || live.liveType === "umi";
}
function getDateValue(live) {
  return (
    live.startedAt?.seconds ||
    live.createdAt?.seconds ||
    0
  );
}
function AdminLive({
  clientMode = false,
  onBack,
  onCreateLive,
  onScheduleLive,
  onOpenReplays,
  onHome,
  onOpenCart,
  onLogout,
}) {
  const { umiAlert, umiConfirm } = useUmiDialog();
/* AJOUTER UNE VIDÉO DANS UMI LIVE */
const [showVideoForm, setShowVideoForm] = useState(clientMode);
const [videoTitle, setVideoTitle] = useState("");
const [videoFile, setVideoFile] = useState(null);
const [publishingVideo, setPublishingVideo] = useState(false);
const [videoError, setVideoError] = useState("");
const [videoMachines, setVideoMachines] = useState([]);
const [videoMachineId, setVideoMachineId] = useState("");
const [videoOfferMachineId, setVideoOfferMachineId] =
  useState("");
const [videoOfferPercent, setVideoOfferPercent] =
  useState(10);
const [videoSimilarIds, setVideoSimilarIds] = useState([]);
const [videoSimilarCategory, setVideoSimilarCategory] = useState("");
const [addedVideos, setAddedVideos] = useState([]);
const [showVideoManager, setShowVideoManager] = useState(false);
const [editingVideoId, setEditingVideoId] = useState(null);
const [editTitle, setEditTitle] = useState("");
const [editMachineId, setEditMachineId] = useState("");
const [editOfferMachineId, setEditOfferMachineId] = useState("");
const [editOfferPercent, setEditOfferPercent] = useState(10);
const [showOfferCatalog, setShowOfferCatalogState] = useState(false);
const setShowOfferCatalog = setShowOfferCatalogState;
const [offerCatalogCategory, setOfferCatalogCategory] = useState(null);
const [offerCatalogTarget, setOfferCatalogTarget] = useState("edit");
const [editSimilarIds, setEditSimilarIds] = useState([]);
const [editSimilarCategory, setEditSimilarCategory] = useState("");
const [editVideoFile, setEditVideoFile] = useState(null);
const [videoActionId, setVideoActionId] = useState(null);
const [managerError, setManagerError] = useState("");
const uploadVideoFile = async (file) => {
  if (!file?.type.startsWith("video/")) {
    throw new Error("Sélectionnez un fichier vidéo.");
  }
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error("Les paramètres Cloudinary sont manquants.");
  }
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    { method: "POST", body }
  );
  const data = await response.json();
  if (!response.ok || !data.secure_url) {
    throw new Error(data?.error?.message || "Impossible d’envoyer la vidéo.");
  }
  return data;
};
const startEditingVideo = (video) => {
  if (videoActionId || publishingVideo) return;
  setEditingVideoId(video.id);
  setEditTitle(video.title || "");
  setEditMachineId(video.machineId || video.productId || "");
setEditOfferMachineId(video.liveOfferMachineId || "");
setEditOfferPercent(video.liveOfferPercent ?? 10);
  setEditSimilarIds(video.similarMachineIds || []);
  setEditSimilarCategory(video.similarMachineCategory || "");
  setEditVideoFile(null);
  setManagerError("");
};
const saveEditedVideo = async () => {
  if (!editingVideoId || videoActionId || publishingVideo) return;
  const title = editTitle.trim();
  const selectedMachine = videoMachines.find((item) => item.id === editMachineId);
  const selectedOffer = videoMachines.find((item) => item.id === editOfferMachineId);
  if ((editMachineId && !selectedMachine) || (editOfferMachineId && !selectedOffer)) {
    setManagerError("Une machine sélectionnée n’existe plus. Choisissez-en une autre.");
    return;
  }
  const id = editingVideoId;
  setVideoActionId(id);
  setManagerError("");
  try {
    const changes = {
      title,
      ...(clientMode ? { clientProducts: videoMachines } : {}),
      machineId: editMachineId,
      productId: editMachineId,
      machineName: selectedMachine?.name || "",
      productName: selectedMachine?.name || "",
      liveOfferMachineId: editOfferMachineId,
      liveOfferPercent: editOfferMachineId
  ? Math.min(100, Math.max(1, Number(editOfferPercent) || 10))
  : 0,
      similarMachineIds: editSimilarIds.filter((machineId) =>
        videoMachines.some((item) => item.id === machineId)
      ),
      similarMachineCategory: editSimilarCategory,
      updatedAt: serverTimestamp(),
    };
    if (editVideoFile) {
      const uploaded = await uploadVideoFile(editVideoFile);
      changes.highlightUrl = uploaded.secure_url;
      changes.cloudinaryPublicId = uploaded.public_id || "";
    }
    await runTransaction(db, async (transaction) => {
      const reference = doc(db, "live", id);
      const snapshot = await transaction.get(reference);
      const current = snapshot.data();
      if (!snapshot.exists() || current.contentType !== (clientMode ? "clientVideo" : "adminVideo") || (clientMode && current.ownerId !== auth.currentUser?.uid) || current.isLive === true) {
        throw new Error("Cette vidéo ne peut pas être modifiée ici.");
      }
      transaction.update(reference, changes);
    });
    setEditingVideoId(null);
    setEditVideoFile(null);
    await umiAlert("Vidéo modifiée avec succès.");
  } catch (error) {
    console.error("Erreur modification vidéo :", error);
    setManagerError(error?.message || "Impossible de modifier la vidéo.");
  } finally {
    setVideoActionId(null);
  }
};
const deleteAdminVideo = async (video) => {
  if (videoActionId || publishingVideo || video.contentType !== (clientMode ? "clientVideo" : "adminVideo")) return;
  setVideoActionId(video.id);
  setManagerError("");
  try {
    const confirmed = await umiConfirm(
      `Supprimer la vidéo « ${video.title || "Vidéo UMI"} » de l’application ?`,
      { title: "Supprimer la vidéo ?", confirmText: "Supprimer", cancelText: "Annuler", danger: true }
    );
    if (!confirmed) return;
    await runTransaction(db, async (transaction) => {
      const reference = doc(db, "live", video.id);
      const snapshot = await transaction.get(reference);
      const current = snapshot.data();
      if (!snapshot.exists() || current.contentType !== (clientMode ? "clientVideo" : "adminVideo") || (clientMode && current.ownerId !== auth.currentUser?.uid) || current.isLive === true) {
        throw new Error("Cette vidéo ne peut pas être supprimée ici.");
      }
      transaction.delete(reference);
    });
    if (editingVideoId === video.id) setEditingVideoId(null);
    await umiAlert("Vidéo supprimée de l’application.");
  } catch (error) {
    console.error("Erreur suppression vidéo :", error);
    setManagerError(error?.message || "Impossible de supprimer la vidéo.");
  } finally {
    setVideoActionId(null);
  }
};
useEffect(() => {
  return onSnapshot(
    clientMode ? query(collection(db, "live"), where("ownerId", "==", auth.currentUser?.uid || "signed-out")) : collection(db, "machines"),
    (snapshot) => {
      if (clientMode) { setVideoMachines((current) => [...new Map([...snapshot.docs.flatMap((item) => item.data().clientProducts || []), ...current].map((item) => [item.id, item])).values()]); return; }
      setVideoMachines(
        snapshot.docs.map((item) => withProductModel({
          ...item.data(),
          id: item.id,
        }))
      );
    },
    () => {
      setVideoError("Impossible de charger les machines.");
    }
  );
}, [clientMode]);
const publishAdminVideo = async (event) => {
  event.preventDefault();
  if (publishingVideo || videoActionId) return;
  const title = videoTitle.trim();

if (!videoFile) {
  setVideoError("Sélectionnez une vidéo.");
  return;
}
  if (!videoFile.type.startsWith("video/")) {
    setVideoError("Sélectionnez un fichier vidéo.");
    return;
  }
  setPublishingVideo(true);
  setVideoError("");
  try {
    let sellerProfile = {};
    if (clientMode) {
      if (!auth.currentUser) throw new Error("Reconnectez-vous avant de publier.");
      const profile = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (!profile.exists() || profile.data().blocked || profile.data().deleting) throw new Error("Ce compte ne peut pas publier de vidéo.");
      sellerProfile = profile.data();
    }
    const data = await uploadVideoFile(videoFile);
    const selectedMachine = videoMachines.find(
      (machine) => machine.id === videoMachineId
    );
    await addDoc(collection(db, "live"), {
      title,
      liveType: clientMode ? "client" : "umi",
      contentType: clientMode ? "clientVideo" : "adminVideo",
      ...(clientMode ? { ownerId: auth.currentUser.uid, presenterId: auth.currentUser.uid, sellerName: sellerProfile.nom || "", clientProducts: videoMachines } : {}),
      isLive: false,
      isScheduled: false,
      highlightPublished: true,
      highlightUrl: data.secure_url,
      highlightStatus: "published",
      cloudinaryPublicId: data.public_id || "",
      liveOfferMachineId: videoOfferMachineId,
liveOfferPercent: videoOfferMachineId
  ? Math.min(100, Math.max(1, Number(videoOfferPercent) || 10))
  : 0,
machineId: videoMachineId,
      machineName: selectedMachine?.name || "",
      productName: selectedMachine?.name || "",
      similarMachineIds: videoSimilarIds,
      similarMachineCategory: videoSimilarCategory,
      productId: videoMachineId,
      likeCount: 0,
      heartCount: 0,
      laughCount: 0,
      createdAt: serverTimestamp(),
      stoppedAt: serverTimestamp(),
    });
    setShowVideoForm(false);
    setVideoTitle("");
    setVideoFile(null);
    setVideoMachineId("");
   setVideoOfferMachineId("");
setVideoOfferPercent(10);
    setVideoSimilarIds([]);
    setVideoSimilarCategory("");
    await umiAlert(
      "Vidéo publiée ! Elle est disponible dans UMI LIVE → Tous."
    );
  } catch (error) {
    console.error("Erreur publication vidéo :", error);
    setVideoError(
      error?.message || "Impossible de publier la vidéo."
    );
  } finally {
    setPublishingVideo(false);
  }
};
  const [activeLives, setActiveLives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stoppingLiveId, setStoppingLiveId] =
    useState(null);
  /* CHARGER LES DIRECTS */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      clientMode ? query(collection(db, "live"), where("ownerId", "==", auth.currentUser?.uid || "signed-out")) : collection(db, "live"),
      (snapshot) => {
        const allLives = snapshot.docs.map(
          (document) => ({
            ...document.data(),
            id: document.id,
          })
        );
        const active = allLives
          .filter((live) => !clientMode && live.isLive === true)
          .sort(
            (a, b) =>
              getDateValue(b) - getDateValue(a)
          );
setAddedVideos(
  allLives
    .filter(
      (live) =>
        live.contentType === (clientMode ? "clientVideo" : "adminVideo") &&
        live.isLive !== true &&
        live.highlightPublished === true &&
        Boolean(live.highlightUrl)
    )
    .sort(
      (a, b) => getDateValue(b) - getDateValue(a)
    )
);
        setActiveLives(active);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Erreur chargement LIVE :",
          error
        );
        setActiveLives([]);
        setAddedVideos([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [clientMode]);
  const [serverPresence, setServerPresence] = useState({});
  const [presenceError, setPresenceError] = useState("");
  const activeIds = JSON.stringify(activeLives.map(live => live.id).sort());
  useEffect(() => {
    const ids = JSON.parse(activeIds);
    if (!ids.length) { setServerPresence({}); setPresenceError(""); return; }
    let disposed = false;
    let checking = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (checking || disposed) return;
      checking = true;
      try {
        if (!auth.currentUser) throw new Error("Reconnectez-vous au compte administrateur.");
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(`${API_URL}/admin/live-status`, {
          method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ liveIds: ids }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Vérification des directs impossible.");
        if (!disposed) { setServerPresence(data.statuses || {}); setPresenceError(""); }
      } catch (error) { if (!disposed && error.name !== "AbortError") setPresenceError(error.message); }
      finally { checking = false; }
    };
    refresh(); const timer = setInterval(refresh, 15000);
    return () => { disposed = true; controller.abort(); clearInterval(timer); };
  }, [activeIds]);
  const visibleLives = activeLives.filter(live => !live.stoppedAt && serverPresence[live.id]?.broadcasting !== false);
  const unconfirmedLives = activeLives.filter(live => live.stoppedAt || serverPresence[live.id]?.broadcasting === false);
  const markLiveEnded = async (live) => {
    if (stoppingLiveId) return;
    const confirmed = await umiConfirm(
      "Marquer cette session comme terminée ? Faites-le uniquement si le présentateur a déjà quitté le live.",
      { title: "Session terminée", confirmText: "Marquer terminée", cancelText: "Annuler" }
    );
    if (!confirmed) return;
    setStoppingLiveId(live.id);
    try {
      await updateDoc(doc(db, "live", live.id), { isLive: false, stoppedAt: serverTimestamp() });
    } catch (error) {
      await umiAlert(error?.message || "Impossible de mettre à jour la session.");
    } finally { setStoppingLiveId(null); }
  };
  const stopClientLive = async (live) => {
    if (stoppingLiveId || !live?.id) return;
    const confirmed = await umiConfirm("Arrêter ce live et déconnecter le présentateur et les spectateurs ?", {
      title: "Arrêter le live", confirmText: "Arrêter", cancelText: "Annuler", danger: true,
    });
    if (!confirmed) return;
    setStoppingLiveId(live.id);
    try {
      if (!auth.currentUser) throw new Error("Reconnectez-vous au compte administrateur.");
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_URL}/admin/stop-live`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ liveId: live.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Impossible d’arrêter le live.");
      await umiAlert("Live arrêté.");
    } catch (error) { await umiAlert(error.message || "Impossible d’arrêter le live.", { danger: true }); }
    finally { setStoppingLiveId(null); }
  };
  if (showOfferCatalog && clientMode) {
    const editing = offerCatalogTarget.startsWith("edit");
    const similar = offerCatalogTarget.toLowerCase().includes("similar");
    return <ClientProductImport multiple={similar} onClose={() => setShowOfferCatalog(false)} onSave={(products) => {
      setVideoMachines((current) => [...current, ...products]);
      if (similar) { if (editing) setEditSimilarIds((ids) => [...new Set([...ids, ...products.map((item) => item.id)])]); else setVideoSimilarIds((ids) => [...new Set([...ids, ...products.map((item) => item.id)])]); }
      else if (offerCatalogTarget === "presented") setVideoMachineId(products[0].id);
      else if (offerCatalogTarget === "editPresented") setEditMachineId(products[0].id);
      else if (editing) setEditOfferMachineId(products[0].id);
      else setVideoOfferMachineId(products[0].id);
      setShowOfferCatalog(false);
    }} />;
  }
  if (showOfferCatalog) {
  const closeCatalog = () => {
    setShowOfferCatalog(false);
    setOfferCatalogCategory(null);
  };
  if (
  offerCatalogTarget === "similarCategory" ||
  offerCatalogTarget === "editSimilarCategory"
) {
  const categories = [
    "Machine Agroalimentaire",
    "Emballage & Conditionnement",
    "Machine de fabrication plastique",
    "Machines pour l’eau & boissons",
    "Machine Produits chimiques & entretien",
    "Machine Cosmétiques",
    "Equipement Agriculture & élevage",
    "Machine Construction & BTP",
    "Machine à Bois & menuiserie",
    "Equipement Métallurgie & fabrication",
    "Machine Textile & habillement",
    "Machine Papier & impression",
    "Equipement Énergie & équipements",
    "Equipement Recyclage & environnement",
    "Autres Machines et accessoires",
  ];
  const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (
    <div className="admin-live-page">
      <header className="admin-live-header">
        <button
          type="button"
          className="admin-live-back"
          onClick={closeCatalog}
        >
          ←
        </button>
        <h2>Sélectionner une catégorie</h2>
      </header>
      <div
        style={{
          display: "grid",
          gap: "12px",
          padding: "20px",
        }}
      >
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => {
              const selectedCategory = normalize(category);

const ids = videoMachines
  .filter((machine) => {
    const machineCategory = normalize(
      machine?.category ||
      machine?.categorie ||
      machine?.categoryName ||
      machine?.categorieName ||
      ""
    );

    if (!machineCategory || !selectedCategory) {
      return false;
    }

    return (
      machineCategory === selectedCategory ||
      machineCategory.includes(selectedCategory) ||
      selectedCategory.includes(machineCategory)
    );
  })
  .map((machine) => machine.id);
              if (
                offerCatalogTarget === "editSimilarCategory"
              ) {
                setEditSimilarIds(ids);
                setEditSimilarCategory(category);
              } else {
                setVideoSimilarIds(ids);
                setVideoSimilarCategory(category);
              }
              closeCatalog();
            }}
            style={{
              padding: "18px",
              border: "1px solid #dce6ef",
              borderRadius: "12px",
              background: "#fff",
              color: "#163a5c",
              fontWeight: 700,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            📂 {category}
          </button>
        ))}
      </div>
    </div>
  );
}
const selectOfferMachine = (machine) => {
  if (!machine?.id) return;
  if (offerCatalogTarget === "presented") {
    setVideoMachineId(machine.id);
  } else if (offerCatalogTarget === "editPresented") {
    setEditMachineId(machine.id);
  } else if (offerCatalogTarget === "add") {
    setVideoOfferMachineId(machine.id);
  } else if (offerCatalogTarget === "edit") {
    setEditOfferMachineId(machine.id);
  } else {
    return;
  }
  closeCatalog();
};
  return (
    <div>
      <div
        style={{
          padding: "12px 16px",
          background: "#163a5c",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <strong>
          Sélectionner une machine
        </strong>
        <button
          type="button"
          onClick={closeCatalog}
          style={{
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Annuler
        </button>
      </div>
      {offerCatalogCategory ? (
        <MachineCategory
          category={offerCatalogCategory}
          machines={videoMachines}
          onBack={() => setOfferCatalogCategory(null)}
          onOpenProduct={selectOfferMachine}
        />
      ) : (
        <Machines
          machines={videoMachines}
          onBack={closeCatalog}
          onOpenCategory={setOfferCatalogCategory}
          onOpenProduct={selectOfferMachine}
          onHome={closeCatalog}
          onMachines={() => setOfferCatalogCategory(null)}
          onLive={closeCatalog}
          onCart={closeCatalog}
          onAccount={closeCatalog}
        />
      )}
    </div>
  );
}
return (
  <div className={clientMode ? "admin-live-page umi-client-video-page" : "admin-live-page"}>
    <style>{"\n.umi-video-form {font-family: Arial, Helvetica, sans-serif; padding:20px !important; gap:18px !important; border-radius:20px !important; box-shadow:0 8px 28px rgba(22,58,92,.08);}\n.umi-video-heading {grid-row:1; padding:4px 0 8px;}\n.umi-video-heading > span {font-size:11px;font-weight:800;letter-spacing:1.5px;color:#087fc1;}\n.umi-video-heading h2 {margin:8px 0;font-size:24px;color:#163a5c;}\n.umi-video-heading p,.umi-video-edit-heading p {margin:0;color:#64748b;font-size:14px;line-height:1.5;}\n.umi-video-fields {gap:14px !important;}\n.umi-video-field {padding:16px;border:1px solid #dce6ef;border-radius:14px;background:#f8fafc;min-width:0;}\n.umi-video-field > label,.umi-video-field > div {display:block;}\n.umi-video-field strong {font-size:15px;line-height:1.5;color:#163a5c;}\n.umi-video-field input {box-sizing:border-box;width:100%;min-height:46px;border:1px solid #ccd8e3;border-radius:10px;background:#fff;color:#163a5c;font:inherit;margin-top:10px !important;padding:12px !important;}\n.umi-video-field input:focus {outline:2px solid #087fc1;outline-offset:2px;}\n.umi-video-field input[type=file] {font-size:13px;}\n.umi-video-field button {box-sizing:border-box;max-width:100%;min-height:44px;font:inherit;font-size:14px;border-radius:10px;cursor:pointer;white-space:normal;}\n.umi-video-field button:not([style]) {padding:9px 12px;margin-top:6px;border:1px solid #ccd8e3;background:#fff;color:#163a5c;}\n.umi-video-field p:not(.umi-video-help) {padding:10px 12px;background:#eaf3f9;border-radius:10px;font-size:13px;line-height:1.6;overflow-wrap:anywhere;}\n.umi-video-help {margin:12px 0 0;color:#64748b;font-size:12px;line-height:1.5;}\n.umi-video-field small {display:block;margin-top:8px;color:#64748b;font-size:12px;overflow-wrap:anywhere;}\n.umi-video-edit-heading {margin:16px 0;}\n.umi-video-edit-heading h3 {margin:0 0 6px;font-size:20px;}\n.umi-video-actions > div {flex-wrap:wrap;}\n.umi-video-actions button {flex:1;min-height:46px;padding:12px;border-radius:10px;border:1px solid #ccd8e3;font-weight:700;cursor:pointer;}\n.umi-video-form > button {min-height:46px;border-radius:10px;padding:12px;border:1px solid #ccd8e3;font-weight:700;cursor:pointer;}\n.umi-video-form button:disabled {opacity:.6;cursor:wait;}\n@media(max-width:480px){.umi-video-form {padding:14px !important;}.umi-video-field {padding:13px;}.umi-video-heading h2 {font-size:21px;}.umi-video-actions button {flex-basis:100%;}}\n"}</style>
      <header className="admin-live-header">
        <button
          type="button"
          className="admin-live-back"
          onClick={onBack}
        >
          ←
        </button>
        <div className="admin-live-brand">
          <div className="admin-live-title">
            GÉRER <span>UMI LIVE</span>
          </div>
          <div className="admin-live-subtitle">
            {clientMode ? "Vos vidéos live" : "Gestion des directs en cours"}
          </div>
        </div>
        <img
          src={logoUmi}
          alt="UMI"
          className="admin-live-logo"
        />
      </header>
      <section
        style={{
          width: "calc(100% - 24px)",
          maxWidth: "626px",
          margin: "20px auto",
        }}
      >
        <div
          style={{
            marginBottom: "10px",
            color: "#163d59",
            fontSize: "14px",
            fontWeight: "800",
          }}
        >
          Actions UMI
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
          }}
        >
          <button
            type="button"
            className="create-live-button"
            onClick={onCreateLive}
          >
            ＋ Créer un LIVE
          </button>
          <button
            type="button"
            onClick={onScheduleLive}
            style={{
              width: "100%",
              minHeight: "52px",
              padding: "10px 8px",
              border: "1px solid #087fc1",
              borderRadius: "12px",
              background: "#ffffff",
              color: "#087fc1",
              fontFamily:
                "Arial, Helvetica, sans-serif",
              fontSize: "13px",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            📅 Programmer un LIVE
          </button>
          <button
  type="button"
  className="create-live-button"
  onClick={() => {
    setVideoError("");
    setShowVideoForm((current) => !current);
  }}
  disabled={publishingVideo || videoActionId !== null}
>
  🎥 Vidéo live
</button>
<button
  type="button"
  className="create-live-button"
  onClick={onOpenReplays}
>
  🎬 Rediffusions
</button>
{showVideoForm && (
  <form className="umi-video-form"
    onSubmit={publishAdminVideo}
    style={{
      gridColumn: "1 / -1",
      display: "grid",
      gap: "12px",
      padding: "16px",
      border: "1px solid #dce6ef",
      borderRadius: "16px",
      background: "#fff",
      color: "#163a5c",
      minWidth: 0,
    }}
  >
<button
  type="button"
  className="create-live-button"
  disabled={publishingVideo || videoActionId !== null}
  onClick={() => {
    setShowVideoManager((current) => !current);
    setManagerError("");
  }}
>
  {showVideoManager ? "Fermer la gestion des vidéos" : "⚙ Gérer les vidéos"}
</button>
<div className="umi-video-heading"><span>UMI LIVE</span><h2>{showVideoManager ? "Gérer les vidéos" : "Ajouter une vidéo"}</h2><p>{showVideoManager ? "Modifiez les informations, les machines et les offres de vos vidéos publiées." : "Préparez votre vidéo et choisissez les machines à présenter."}</p></div>
{showVideoManager && (
  <section aria-label="Gérer les vidéos publiées" style={{ display: "grid", gap: "12px", padding: "12px", border: "1px solid #dce6ef", borderRadius: "14px", background: "#f5faff" }}>
    <strong>Vidéos publiées · {addedVideos.length}</strong>
    {loading ? <p>Chargement…</p> : addedVideos.length === 0 ? <p>Aucune vidéo publiée.</p> : null}
    {addedVideos.map((video) => (
      <article key={video.id} style={{ padding: "12px", border: "1px solid #dce6ef", borderRadius: "12px", background: "#fff", minWidth: 0 }}>
        <strong>{video.title || "Vidéo UMI"}</strong>
        <AutoPlayingVideo src={video.highlightUrl} controls style={{ display: "block", width: "100%", maxHeight: "180px", margin: "10px 0", borderRadius: "10px", background: "#000" }} />
        {editingVideoId === video.id ? (
          <>
          <div className="umi-video-edit-heading"><h3>Modifier la vidéo</h3><p>Enregistrez vos changements lorsque vous avez terminé.</p></div><fieldset className="umi-video-fields" disabled={publishingVideo || videoActionId !== null} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: "12px", minWidth: 0 }}><section className="umi-video-field umi-video-title"><label>
              <strong>Titre de la vidéo (facultatif)</strong>
              <input type="text" value={editTitle} maxLength={150} onChange={(event) => setEditTitle(event.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", padding: "10px", marginTop: "6px" }} />
            </label><p className="umi-video-help">Donnez un titre clair pour reconnaître cette vidéo.</p></section>
<section className="umi-video-field umi-video-file"><label>
              <strong>Remplacer la vidéo (facultatif)</strong>
              {editVideoFile && <small>Nouvelle vidéo : {editVideoFile.name}</small>}
              <input key={video.id} type="file" accept="video/*" onChange={(event) => setEditVideoFile(event.target.files?.[0] || null)} style={{ display: "block", width: "100%", marginTop: "6px" }} />
              <small>Sans nouveau fichier, la vidéo actuelle est conservée.</small>
            </label><p className="umi-video-help">Choisissez un nouveau fichier seulement si vous souhaitez remplacer la vidéo.</p></section>
<section className="umi-video-field umi-video-machine"><div>
  <strong>Machine présentée</strong>
  <button
    type="button"
    onClick={() => {
      setOfferCatalogTarget("editPresented");
      setOfferCatalogCategory(null);
      setShowOfferCatalog(true);
    }}
    style={{
      display: "block",
      width: "100%",
      padding: "12px",
      marginTop: "10px",
      border: 0,
      borderRadius: "10px",
      background: "#163a5c",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    🔍 Sélectionner une machine
  </button>
  {editMachineId && (
    <>
      <p>
        Machine sélectionnée :{" "}
        <strong>
          {videoMachines.find(
            (machine) => machine.id === editMachineId
          )?.name || "Machine indisponible"}
        </strong>
      </p>
      <button
        type="button"
        onClick={() => setEditMachineId("")}
      >
        Retirer la machine présentée
      </button>
    </>
  )}
</div><p className="umi-video-help">Cette machine apparaîtra sur la barre blanche de la vidéo.</p></section>
<section className="umi-video-field umi-video-offer"><div>
            <strong>Accorder une réduction en %</strong>
<input
  type="number"
  min="1"
  max="100"
  step="1"
  value={editOfferPercent}
  onChange={(event) =>
    setEditOfferPercent(event.target.value)
  }
  aria-label="Réduction de l’offre en pourcentage"
  style={{
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "10px",
    margin: "6px 0",
  }}
/>
<span>Sélectionner une machine</span>
              <button
  type="button"
  onClick={() => {
  setOfferCatalogTarget("edit");
  setOfferCatalogCategory(null);
  setShowOfferCatalog(true);
}}
  style={{
    display: "block",
    width: "100%",
    padding: "12px",
    marginTop: "10px",
    border: 0,
    borderRadius: "10px",
    background: "#163a5c",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  }}
>
  🔍 Sélectionner une machine
</button>
{editOfferMachineId && (
  <>
    <p>
      Machine sélectionnée :{" "}
      <strong>
        {videoMachines.find(
          (machine) => machine.id === editOfferMachineId
        )?.name || "Machine indisponible"}
      </strong>
    </p>
    <button
      type="button"
      onClick={() => setEditOfferMachineId("")}
    >
      Retirer la machine de l’offre
    </button>
  </>
)}
            </div><p className="umi-video-help">Facultatif : choisissez la machine de l’offre et une réduction de 1 à 100 %.</p></section>
<section className="umi-video-field umi-video-similar"><div>
  <strong>Machines similaires</strong>
  <button
    type="button"
    onClick={() => {
      setOfferCatalogTarget("editSimilarCategory");
      setOfferCatalogCategory(null);
      setShowOfferCatalog(true);
    }}
    style={{
      display: "block",
      width: "100%",
      padding: "12px",
      marginTop: "10px",
      border: 0,
      borderRadius: "10px",
      background: "#163a5c",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    {clientMode ? "Ajouter depuis la galerie" : "Sélectionner une catégorie"}
  </button>
  {(editSimilarCategory || editSimilarIds.length > 0) && (
    <>
      <p>
        {editSimilarCategory && <>Catégorie : <strong>{editSimilarCategory}</strong></>}
        <br />
        {editSimilarIds.length} machine(s) sélectionnée(s)
        <span className="umi-video-selected-list">{editSimilarIds.map((id) => <span key={id}>{videoMachines.find((machine) => machine.id === id)?.name || "Machine ajoutée"}</span>)}</span>
      </p>
      <button
        type="button"
        onClick={() => {
          setEditSimilarCategory("");
          setEditSimilarIds([]);
        }}
      >
        {clientMode ? "Retirer les machines" : "Retirer la catégorie"}
      </button>
    </>
  )}
</div><p className="umi-video-help">{clientMode ? "Ajoutez vos machines depuis la galerie. Chaque média représente une machine." : "Choisissez une catégorie pour afficher toutes ses machines comme articles similaires."}</p></section><div className="umi-video-actions"><div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="create-live-button" onClick={saveEditedVideo}>Enregistrer les modifications</button>
              <button type="button" onClick={() => { setEditingVideoId(null); setEditVideoFile(null); setManagerError(""); }}>Annuler</button>
            </div></div></fieldset>
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button type="button" className="create-live-button" disabled={publishingVideo || videoActionId !== null} onClick={() => startEditingVideo(video)}>✏ Modifier</button>
            <button type="button" disabled={publishingVideo || videoActionId !== null} onClick={() => deleteAdminVideo(video)} style={{ padding: "10px", border: 0, borderRadius: "10px", background: "#ed1745", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              {videoActionId === video.id ? "Suppression…" : "🗑 Supprimer"}
            </button>
          </div>
        )}
      </article>
    ))}
    {managerError && <p role="alert" style={{ color: "#d32f2f", margin: 0 }}>{managerError}</p>}
  </section>
)}
{!showVideoManager && (<>
    <fieldset className="umi-video-fields"
      disabled={publishingVideo || videoActionId !== null}
      style={{
        display: "grid",
        gap: "12px",
        border: 0,
        padding: 0,
        margin: 0,
        minWidth: 0,
      }}
    ><section className="umi-video-field umi-video-title"><label>
        <strong>Titre de la vidéo</strong>
        <input
          type="text"
          value={videoTitle}
          onChange={(event) =>
            setVideoTitle(event.target.value)
          }
          maxLength={150}
placeholder="Titre facultatif"
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            marginTop: "6px",
            padding: "12px",
            border: "1px solid #ccd8e3",
            borderRadius: "10px",
          }}
        />
      </label><p className="umi-video-help">Donnez un titre clair pour reconnaître cette vidéo.</p></section>
<section className="umi-video-field umi-video-file"><label>
        <strong>Choisir une vidéo</strong>
        <input
          type="file"
          accept="video/*"
          onChange={(event) => {
            setVideoFile(
              event.target.files?.[0] || null
            );
            setVideoError("");
          }}
          style={{
            display: "block",
            width: "100%",
            marginTop: "6px",
          }}
        />
        {videoFile && <small>Vidéo sélectionnée : {videoFile.name}</small>}
      </label><p className="umi-video-help">Importez la vidéo depuis votre téléphone ou votre ordinateur.</p></section>
<section className="umi-video-field umi-video-machine"><div>
  <strong>Machine présentée</strong>
  <button
    type="button"
    onClick={() => {
      setOfferCatalogTarget("presented");
      setOfferCatalogCategory(null);
      setShowOfferCatalog(true);
    }}
    style={{
      display: "block",
      width: "100%",
      padding: "12px",
      marginTop: "10px",
      border: 0,
      borderRadius: "10px",
      background: "#163a5c",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    🔍 Sélectionner une machine
  </button>
  {videoMachineId && (
    <>
      <p>
        Machine sélectionnée :{" "}
        <strong>
          {videoMachines.find(
            (machine) => machine.id === videoMachineId
          )?.name || "Machine indisponible"}
        </strong>
      </p>
      <button
        type="button"
        onClick={() => setVideoMachineId("")}
      >
        Retirer la machine présentée
      </button>
    </>
  )}
</div><p className="umi-video-help">Cette machine apparaîtra sur la barre blanche de la vidéo.</p></section>
<section className="umi-video-field umi-video-offer"><div>
 <strong>Accorder une réduction en %</strong>
<input
  type="number"
  min="1"
  max="100"
  step="1"
  value={videoOfferPercent}
  onChange={(event) =>
    setVideoOfferPercent(event.target.value)
  }
  aria-label="Réduction de l’offre en pourcentage"
  style={{
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    margin: "6px 0",
    border: "1px solid #ccd8e3",
    borderRadius: "10px",
  }}
/>
<button
  type="button"
  onClick={() => {
    setOfferCatalogTarget("add");
    setOfferCatalogCategory(null);
    setShowOfferCatalog(true);
  }}
  style={{
    display: "block",
    width: "100%",
    padding: "12px",
    marginTop: "10px",
    border: 0,
    borderRadius: "10px",
    background: "#163a5c",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  }}
>
  🔍 Sélectionner une machine
</button>
{videoOfferMachineId && (
  <>
    <p>
      Machine sélectionnée :{" "}
      <strong>
        {videoMachines.find(
          (machine) => machine.id === videoOfferMachineId
        )?.name || "Machine indisponible"}
      </strong>
    </p>
    <button
      type="button"
      onClick={() => setVideoOfferMachineId("")}
    >
      Retirer la machine de l’offre
    </button>
  </>
)}
</div><p className="umi-video-help">Facultatif : choisissez la machine de l’offre et une réduction de 1 à 100 %.</p></section>
<section className="umi-video-field umi-video-similar"><div>
  <strong>Machines similaires</strong>
  <button
    type="button"
    onClick={() => {
      setOfferCatalogTarget("similarCategory");
      setOfferCatalogCategory(null);
      setShowOfferCatalog(true);
    }}
    style={{
      display: "block",
      width: "100%",
      padding: "12px",
      marginTop: "10px",
      border: 0,
      borderRadius: "10px",
      background: "#163a5c",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    {clientMode ? "Ajouter depuis la galerie" : "Sélectionner une catégorie"}
  </button>
  {(videoSimilarCategory || videoSimilarIds.length > 0) && (
    <>
      <p>
        {videoSimilarCategory && <>Catégorie : <strong>{videoSimilarCategory}</strong></>}
        <br />
        {videoSimilarIds.length} machine(s) sélectionnée(s)
        <span className="umi-video-selected-list">{videoSimilarIds.map((id) => <span key={id}>{videoMachines.find((machine) => machine.id === id)?.name || "Machine ajoutée"}</span>)}</span>
      </p>
      <button
        type="button"
        onClick={() => {
          setVideoSimilarCategory("");
          setVideoSimilarIds([]);
        }}
      >
        {clientMode ? "Retirer les machines" : "Retirer la catégorie"}
      </button>
    </>
  )}
</div><p className="umi-video-help">{clientMode ? "Ajoutez vos machines depuis la galerie. Chaque média représente une machine." : "Choisissez une catégorie pour afficher toutes ses machines comme articles similaires."}</p></section></fieldset>
    {videoError && (
      <p role="alert" style={{ color: "#d32f2f", margin: 0 }}>
        {videoError}
      </p>
    )}
    <button
      type="submit"
      className="create-live-button umi-video-publish"
      disabled={publishingVideo || videoActionId !== null}
    >
      {publishingVideo
        ? "Envoi et publication en cours…"
        : "Publier la vidéo"}
    </button>
    <button
      type="button"
      disabled={publishingVideo || videoActionId !== null}
      onClick={() => setShowVideoForm(false)}
    >
      Annuler
    </button>
</>)}
  </form>
)}
        </div>
      </section>
      {loading && (
        <div
          style={{
            width: "calc(100% - 32px)",
            maxWidth: "626px",
            margin: "35px auto",
            textAlign: "center",
            color: "#64748b",
            fontSize: "14px",
            fontWeight: "700",
          }}
        >
          Chargement des directs...
        </div>
      )}
      {!loading && visibleLives.length === 0 && (
        <div
          style={{
            width: "calc(100% - 32px)",
            maxWidth: "626px",
            margin: "45px auto",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <div
            style={{
              fontSize: "42px",
              marginBottom: "12px",
            }}
          >
            📡
          </div>
          <div
            style={{
              fontSize: "17px",
              fontWeight: "800",
              color: "#334155",
            }}
          >
            Aucun live en cours
          </div>
        </div>
      )}
      {presenceError && <p role="status" style={{ padding: "16px", color: "#b42318" }}>{presenceError}</p>}
      {!loading && visibleLives.length > 0 && (
        <section className="active-lives-section">
          <div className="active-lives-title">
            <h2>
              🔴 LIVE actuellement en cours
            </h2>
            <span className="active-live-count">
              {visibleLives.length}
            </span>
          </div>
          <div className="admin-live-list">
            {visibleLives.map((live) => {
              const umi = isUmiLive(live);
              return (
                <div
                  className="admin-live-card"
                  key={live.id}
                >
                  <div className="admin-live-card-top">
                    <span className="admin-live-status">
                      {umi
                        ? "● LIVE UMI"
                        : "● LIVE CLIENT"}
                    </span>
                    <span className="admin-viewer-count">
                      {serverPresence[live.id]?.broadcasting === true ? "🔴 EN DIRECT" : "Vérification…"}
                    </span>
                  </div>
                  <AdminLivePreview live={live} />
                  <h3>
                    {live.title ||
                      live.productName ||
                      "LIVE"}
                  </h3>
                  {umi ? (
                    <p className="admin-machine-name">
                      Machine :{" "}
                      <strong>
                        {live.machineName ||
                          "Non renseignée"}
                      </strong>
                    </p>
                  ) : (
                    <>
                      <p className="admin-machine-name">
                        Vendeur :{" "}
                        <strong>
                          {live.sellerName ||
                            live.userName ||
                            "Non renseigné"}
                        </strong>
                      </p>
                      <p className="admin-machine-name">
                        Produit :{" "}
                        <strong>
                          {live.productName ||
                            "Non renseigné"}
                        </strong>
                      </p>
                    </>
                  )}
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "10px",
                      borderRadius: "9px",
                      background: "#f4f7f9",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#44515a",
                    }}
                  >
                    🎥 Enregistrement :{" "}
                    {live.recordingStatus ||
                      "non démarré"}
                  </div>
                  <button type="button" className="umi-admin-stop-button" disabled={Boolean(stoppingLiveId)} onClick={() => stopClientLive(live)}>
                    {stoppingLiveId === live.id ? "Arrêt…" : "⏹ Arrêter ce live"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {!loading && unconfirmedLives.length > 0 && (
        <section className="active-lives-section">
          <h2>Sessions sans présentateur connecté</h2>
          <p>Le serveur ne détecte plus le présentateur dans ces salles. Vous pouvez marquer les anciennes sessions comme terminées.</p>
          {unconfirmedLives.map((live) => (
            <div className="admin-live-card" key={live.id}>
              <strong>{live.title || "Ancienne session"}</strong>
              <p>{live.machineName || ""}</p>
              <button type="button" disabled={Boolean(stoppingLiveId)} onClick={() => markLiveEnded(live)}>
                {stoppingLiveId === live.id ? "Enregistrement…" : "Marquer comme terminé"}
              </button>
            </div>
          ))}
        </section>
      )}
      <nav className="admin-live-bottom-nav">
        <button
          type="button"
          onClick={onHome}
        >
          <span className="admin-live-nav-icon">
            🏠
          </span>
          <small>Accueil</small>
        </button>
        <button
          type="button"
          onClick={onOpenCart}
        >
          <span className="admin-live-nav-icon">
            🛒
          </span>
          <small>Panier</small>
        </button>
        <button
          type="button"
          className="admin-live-nav-logout"
          onClick={onLogout}
        >
          <span className="admin-live-nav-icon">
            ↪
          </span>
          <small>Déconnexion</small>
        </button>
      </nav>
    </div>
  );
}
export default AdminLive;
