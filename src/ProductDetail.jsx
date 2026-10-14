import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Share } from "@capacitor/share";
import { Share2 } from "lucide-react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import "./CommerceModule.css";
import machineUmi from "./assets/machine-umi.png";
function ProductDetail({
  product,
  embedded = false,
  onBack,
  onHome,
  onCategories,
onOpenCart,
  onOrder,
  onAddToCart,
  onOpenReviews,
  /* FAVORIS */
  isFavorite = false,
  onToggleFavorite,
}) {
  /* =========================================
     QUANTITÉ
  ========================================= */
  const machineModels = Array.isArray(product?.models)
  ? product.models
  : [];
const [selectedModelId, setSelectedModelId] = useState(product?.selectedModelId || product?.models?.[0]?.id || "");
const [modelQuantities, setModelQuantities] = useState({});
const [addedSelections, setAddedSelections] = useState([]);
const [cartMessage, setCartMessage] = useState("");
useEffect(() => {
  if (!cartMessage) return;
  const timer = window.setTimeout(() => {
    setCartMessage("");
  }, 4000);
  return () => window.clearTimeout(timer);
}, [cartMessage]);
useEffect(() => {
  setCartMessage("");
}, [product?.id]);
const [enlargedPhoto, setEnlargedPhoto] = useState("");
const [enlargedVideo, setEnlargedVideo] = useState("");
const swipeStart = useRef(null);
const handleSwipeStart = (event) => {
  const touch = event.touches[0];
  swipeStart.current = {
    x: touch.clientX,
    y: touch.clientY,
  };
};
const handleSwipeEnd = (event) => {
  const start = swipeStart.current;
  swipeStart.current = null;
  if (!start || !event.changedTouches[0]) return;
  const touch = event.changedTouches[0];
  const distanceX = touch.clientX - start.x;
  const distanceY = touch.clientY - start.y;
  if (
    medias.length <= 1 ||
    Math.abs(distanceX) < 50 ||
    Math.abs(distanceX) <= Math.abs(distanceY)
  ) {
    return;
  }
  const nextIndex =
    distanceX < 0
      ? (selectedMediaIndex + 1) % medias.length
      : (selectedMediaIndex - 1 + medias.length) % medias.length;
  setSelectedMediaIndex(nextIndex);
  if (enlargedPhoto || enlargedVideo) {
    const media = medias[nextIndex];
    setEnlargedPhoto(
      media.type === "image" ? media.url : ""
    );
    setEnlargedVideo(
      media.type === "video" ? media.url : ""
    );
  }
};
useEffect(() => {
  if (!enlargedPhoto && !enlargedVideo) return;
  const handleEscape = (event) => {
  if (event.key === "Escape") {
    setEnlargedPhoto("");
    setEnlargedVideo("");
  }
};
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", handleEscape);
  return () => {
    document.body.style.overflow = previousOverflow;
    window.removeEventListener("keydown", handleEscape);
  };
}, [enlargedPhoto, enlargedVideo]);
useEffect(() => {
  setEnlargedPhoto("");
}, [product?.id]);
const selectedMachineModel =
  machineModels.find((item) => item.id === selectedModelId) ||
  machineModels[0] ||
  null;
const activeModelId = selectedMachineModel?.id || "";
const quantityKey = activeModelId || "machine";
const quantity = modelQuantities[quantityKey] ?? 1;
const setQuantity = (value) => {
  const numericValue = Number(value);
  const safeQuantity = Number.isFinite(numericValue)
    ? Math.max(1, Math.floor(numericValue))
    : 1;
  setModelQuantities((current) => ({
    ...current,
    [quantityKey]: safeQuantity,
  }));
};
useEffect(() => {
  setSelectedModelId(product?.selectedModelId || product?.models?.[0]?.id || "");
  setModelQuantities({});
  setAddedSelections([]);
}, [product?.id]);
const selectedPrice = selectedMachineModel?.price ?? product?.price;
const selectedProduct = selectedMachineModel
  ? {
      ...product,
      model: selectedMachineModel.name,
      selectedModelId: selectedMachineModel.id,
      capacity: selectedMachineModel.capacity ?? "",
      price: selectedMachineModel.price,
      power: selectedMachineModel.power ?? "",
      year: selectedMachineModel.year ?? "",
      warranty: selectedMachineModel.warranty ?? "",
      availability: selectedMachineModel.availability ?? "",
      images: selectedMachineModel.images || [],
      videos: selectedMachineModel.videos || [],
      imageUrl:
        selectedMachineModel.images?.[0] ||
        selectedMachineModel.imageUrl ||
        "",
      videoUrl:
        selectedMachineModel.videos?.[0] ||
        selectedMachineModel.videoUrl ||
        "",
      image: "",
    }
  : product;
/* =========================================
   MÉDIA SÉLECTIONNÉ
\========================================= */
const [
  selectedMediaIndex,
  setSelectedMediaIndex,
] = useState(0);
/* =========================================
   FAVORI EN COURS
\========================================= */
const [
  favoriteLoading,
  setFavoriteLoading,
] = useState(false);
/* =========================================
   NOTES ET COMMENTAIRES
\========================================= */
const [reviews, setReviews] = useState([]);
const [
  selectedRating,
  setSelectedRating,
] = useState(0);
const [
  reviewComment,
  setReviewComment,
] = useState("");
const [
  reviewPhoto,
  setReviewPhoto,
] = useState(null);
const [
  reviewPhotoPreview,
  setReviewPhotoPreview,
] = useState("");
const [
  reviewLoading,
  setReviewLoading,
] = useState(false);
const [
  reviewMessage,
  setReviewMessage,
] = useState("");
  /* =========================================
     TOUS LES MÉDIAS
     PHOTOS + VIDÉOS
  ========================================= */
  const medias = useMemo(() => {
  if (!product) return [];
  const source = selectedMachineModel || (embedded ? product : null);
if (!source) return [];
  const photos = [];
  const videos = [];
  const addUrl = (list, url) => {
    if (typeof url !== "string" || !url.trim()) return;
    const cleanUrl = url.trim();
    if (!list.includes(cleanUrl)) {
      list.push(cleanUrl);
    }
  };
  if (Array.isArray(source.imageUrls)) {
    source.imageUrls.forEach((url) => addUrl(photos, url));
  }
  if (Array.isArray(source.images)) {
    source.images.forEach((url) => addUrl(photos, url));
  }
  addUrl(photos, source.imageUrl);
  addUrl(photos, source.image);
  if (Array.isArray(source.videos)) {
    source.videos.forEach((url) => addUrl(videos, url));
  }
  addUrl(videos, source.videoUrl);
  const result = [
    ...photos.slice(0, 6).map((url) => ({
      type: "image",
      url,
    })),
    ...videos.slice(0, 3).map((url) => ({
      type: "video",
      url,
    })),
  ];
  return result.length > 0
    ? result
    : [{ type: "image", url: machineUmi }];
}, [product, selectedMachineModel, embedded]);
useEffect(() => {
  setSelectedMediaIndex(0);
}, [product?.id, selectedModelId]);
  /* =========================================
     MÉDIA ACTUEL
  ========================================= */
  const currentMedia =
    medias[selectedMediaIndex] ||
    medias[0] ||
    null;
  /* =========================================
     RÉINITIALISER LORSQU'ON CHANGE DE MACHINE
  ========================================= */
  /* =========================================
     SÉCURITÉ INDEX MÉDIA
  ========================================= */
  useEffect(() => {
    if (
      selectedMediaIndex >=
      medias.length
    ) {
      setSelectedMediaIndex(0);
    }
  }, [
    medias.length,
    selectedMediaIndex,
  ]);
  /* =========================================
     CHARGER LES AVIS
  ========================================= */
  useEffect(() => {
    if (!product?.id) {
      setReviews([]);
      return;
    }
    const reviewsRef =
      collection(
        db,
        "machines",
        product.id,
        "reviews"
      );
    const reviewsQuery =
      query(
        reviewsRef,
        orderBy(
          "createdAt",
          "desc"
        )
      );
    const unsubscribe =
      onSnapshot(
        reviewsQuery,
        (snapshot) => {
          const reviewsData =
            snapshot.docs.map(
              (reviewDoc) => ({
                id: reviewDoc.id,
                ...reviewDoc.data(),
              })
            );
          setReviews(
            reviewsData
          );
        },
        (error) => {
          console.error(
            "Erreur chargement des avis :",
            error
          );
          setReviews([]);
        }
      );
    return () => {
      unsubscribe();
    };
  }, [product?.id]);
  /* =========================================
     DESCRIPTION
  ========================================= */
  const productDescription =
    typeof product?.description ===
      "string" &&
    product.description.trim()
      ? product.description.trim()
      : "Aucune description disponible.";
  /* =========================================
     PRIX
     Même présentation que matière première
  ========================================= */
  const priceText = String(selectedPrice ?? "")
  .replace(/FCFA|CFA|EUR|USD|CHF/gi, "")
  .replace(/[€$]/g, "")
  .trim();
const displayPrice = priceText
  ? `${priceText} FCFA`
  : getProductPrice(product);
  /* =========================================
     COMMANDER
  ========================================= */
const handleOrder = () => {
  if (!selectedMachineModel && (!embedded || machineModels.length > 0)) {
    umiNotify("Veuillez choisir un modèle.");
    return;
  }
  if (onOrder) {
    onOrder({
      ...selectedProduct,
      quantity,
    });
  }
};
const handleAddToCart = async () => {
  if (!onAddToCart) return;
  if (machineModels.length > 0 && !selectedMachineModel) {
    await umiNotify("Veuillez choisir un modèle.");
    return;
  }
  try {
    const added = await onAddToCart({
      ...selectedProduct,
      quantity,
    });
    if (added !== true) return;
setAddedSelections((current) => {
  const existing = current.find(
    (item) => item.selectedModelId === selectedProduct.selectedModelId
  );
  if (existing) {
    return current.map((item) =>
      item.selectedModelId === selectedProduct.selectedModelId
        ? {
            ...item,
            quantity: item.quantity + quantity,
          }
        : item
    );
  }
  return [
    ...current,
    {
      selectedModelId: selectedProduct.selectedModelId,
      name: selectedMachineModel?.name || product.name,
      price: selectedProduct.price,
      quantity,
    },
  ];
});
    const modelName =
      selectedMachineModel?.name || product.name;
    setCartMessage(
  `${modelName} × ${quantity} : ajouté au panier.`
);
  } catch (error) {
    console.error("Erreur ajout au panier :", error);
    await umiNotify("Impossible d’ajouter votre sélection au panier.");
  }
};
  /* =========================================
     FAVORIS
  ========================================= */
  const handleFavorite = async () => {
    if (
      !onToggleFavorite ||
      favoriteLoading
    ) {
      return;
    }
    try {
      setFavoriteLoading(true);
      await onToggleFavorite();
    } catch (error) {
      console.error(
        "Erreur favori :",
        error
      );
    } finally {
      setFavoriteLoading(false);
    }
  };
  /* =========================================
     PARTAGER
  ========================================= */
  const handleShare = async () => {
    const productName =
      product?.name ||
      "Machine UMI";
    try {
      await Share.share({
        title:
          productName,
        text:
          `Découvrez ${productName} sur UMI`,
        url:
          window.location.href,
        dialogTitle:
          "Partager cette machine",
      });
    } catch (error) {
      console.log(
        "Partage annulé :",
        error
      );
    }
  };
  /* =========================================
     MÉDIA PRÉCÉDENT
  ========================================= */
  const previousMedia = () => {
    if (
      medias.length <= 1
    ) {
      return;
    }
    setSelectedMediaIndex(
      (current) =>
        current === 0
          ? medias.length - 1
          : current - 1
    );
  };
  /* =========================================
     MÉDIA SUIVANT
  ========================================= */
  const nextMedia = () => {
    if (
      medias.length <= 1
    ) {
      return;
    }
    setSelectedMediaIndex(
      (current) =>
        current ===
        medias.length - 1
          ? 0
          : current + 1
    );
  };
  /* =========================================
     PUBLIER UN AVIS
  ========================================= */
const uploadToCloudinary =
  async (
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
        "Erreur Cloudinary :",
        data
      );
      throw new Error(
        data?.error?.message ||
        "Impossible d'envoyer la photo."
      );
    }
    if (!data.secure_url) {
      throw new Error(
        "Cloudinary n'a pas retourné l'adresse de la photo."
      );
    }
    return data.secure_url;
  };
  const handleSubmitReview =
  async () => {
    if (reviewLoading) {
      return;
    }
    setReviewMessage("");
    const currentUser =
      auth.currentUser;
    if (!currentUser) {
      setReviewMessage(
        "Connectez-vous pour publier un avis."
      );
      return;
    }
    if (
      selectedRating < 1 ||
      selectedRating > 5
    ) {
      setReviewMessage(
        "Choisissez une note de 1 à 5 étoiles."
      );
      return;
    }
    if (!reviewComment.trim()) {
      setReviewMessage(
        "Écrivez votre commentaire."
      );
      return;
    }
    if (!product?.id) {
      setReviewMessage(
        "Impossible d'identifier cette machine."
      );
      return;
    }
    try {
      setReviewLoading(true);
      /* =========================
         ENVOYER LA PHOTO
      ========================= */
      let reviewPhotoUrl = "";
      if (reviewPhoto) {
        reviewPhotoUrl =
          await uploadToCloudinary(
            reviewPhoto,
            "image"
          );
      }
      /* =========================
         ENREGISTRER L'AVIS
      ========================= */
      const reviewsRef =
        collection(
          db,
          "machines",
          product.id,
          "reviews"
        );
      await addDoc(
        reviewsRef,
        {
          userId:
            currentUser.uid,
          userName:
            currentUser.displayName ||
            "Client UMI",
          rating:
            selectedRating,
          comment:
            reviewComment.trim(),
          photoUrl:
            reviewPhotoUrl,
          createdAt:
            serverTimestamp(),
        }
      );
      /* =========================
         RÉINITIALISER
      ========================= */
      setSelectedRating(0);
      setReviewComment("");
      if (reviewPhotoPreview) {
        URL.revokeObjectURL(
          reviewPhotoPreview
        );
      }
      setReviewPhoto(null);
      setReviewPhotoPreview("");
      setReviewMessage(
        "Votre avis a été publié."
      );
    } catch (error) {
      console.error(
        "Erreur publication avis :",
        error
      );
      setReviewMessage(
        "Impossible de publier votre avis."
      );
    } finally {
      setReviewLoading(false);
    }
  };
  /* =========================================
     SI AUCUNE MACHINE
  ========================================= */
  if (!product) {
    return null;
  }
 const formatModelPrice = (value) => {
  const rawPrice = String(value ?? "")
    .replace(/FCFA|CFA|EUR|USD|CHF/gi, "")
    .replace(/[€$]/g, "")
    .replace(/\s/g, "")
    .replace(",", ".");

  const price = Number(rawPrice);

  return rawPrice && Number.isFinite(price)
    ? `${price.toLocaleString("fr-FR")} FCFA`
    : "Prix non renseigné";
};
  const selectionTotal = addedSelections.reduce((total, item) => {
    const rawPrice = String(item.price ?? "")
      .replace(/FCFA|CFA|EUR|USD|CHF/gi, "")
      .replace(/[€$]/g, "")
      .replace(/\s/g, "")
      .replace(",", ".");
    const price = Number(rawPrice);
    if (total === null || !rawPrice || !Number.isFinite(price)) {
      return null;
    }
    return total + price * item.quantity;
  }, 0);
  const averageRating = reviews.length
    ? reviews.reduce(
        (total, review) => total + (Number(review.rating) || 0),
        0
      ) / reviews.length
    : 0;
  const closeEnlargedMedia = () => {
    setEnlargedPhoto("");
    setEnlargedVideo("");
  };
  const smallButtonStyle = {
    width: "34px",
    height: "34px",
    padding: 0,
    border: "1px solid #cad9e9",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#163b5c",
    fontSize: "16px",
    cursor: "pointer",
  };
  return (
    <div className={embedded ? "commerce-page umi-embedded-product" : "commerce-page"}>
      {!embedded && <header className="commerce-header">
        <button type="button" onClick={onBack}>
          ←
        </button>
        <div>
          <h1>Machine</h1>
          <p>UMI Marketplace</p>
        </div>
        <span>🏭</span>
      </header>}
      <main
        className="commerce-detail"
        style={{
          paddingBottom:
  embedded ? "12px" : "calc(76px + env(safe-area-inset-bottom, 0px))",
marginBottom: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            padding: "12px",
            border: "1px solid #e3eaf2",
            borderRadius: "20px",
            background: "#ffffff",
            boxShadow: "0 6px 22px rgba(23,59,91,0.08)",
          }}
        >
          {/* GALERIE EN HAUT */}
          <div
  onTouchStart={handleSwipeStart}
  onTouchEnd={handleSwipeEnd}
  onTouchCancel={() => {
    swipeStart.current = null;
  }}
  style={{
    position: "relative",
    width: "100%",
    height: "clamp(220px, 65vw, 380px)",
    overflow: "hidden",
    borderRadius: "14px",
    background: "#f7faff",
    touchAction: "pan-y",
  }}
>
            {currentMedia?.type === "video" ? (
              <div style={{ width: "100%", height: "100%" }}>
                <video
                  key={currentMedia.url}
                  src={currentMedia.url}
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
                <button
                  type="button"
                  onClick={(event) => {
                    const video =
                      event.currentTarget.parentElement.querySelector(
                        "video"
                      );
                    video?.pause();
                    setEnlargedPhoto("");
                    setEnlargedVideo(currentMedia.url);
                  }}
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    zIndex: 10,
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: "8px",
                    background: "rgba(0,0,0,0.7)",
                    color: "#ffffff",
                    fontFamily: "inherit",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  ⛶ Agrandir la vidéo
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label="Agrandir la photo du modèle"
                onClick={() => {
                  setEnlargedVideo("");
                  setEnlargedPhoto(currentMedia?.url || machineUmi);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  cursor: "zoom-in",
                }}
              >
                <img
                  key={currentMedia?.url}
                  src={currentMedia?.url || machineUmi}
                  alt={selectedMachineModel?.name || product.name}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </button>
            )}
            <button
              type="button"
              onClick={handleFavorite}
              disabled={favoriteLoading}
              aria-label={
                isFavorite
                  ? "Retirer des favoris"
                  : "Ajouter aux favoris"
              }
              style={{
                ...smallButtonStyle,
                position: "absolute",
                top: "10px",
                right: "10px",
                zIndex: 20,
                width: "40px",
                height: "40px",
                border: "none",
                borderRadius: "50%",
                color: isFavorite ? "#e11d48" : "#163b5c",
                fontSize: "27px",
              }}
            >
              {isFavorite ? "♥" : "♡"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Partager"
              style={{
                ...smallButtonStyle,
                position: "absolute",
                top: "58px",
                right: "10px",
                zIndex: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                border: "none",
                borderRadius: "50%",
              }}
            >
              <Share2 size={20} />
            </button>
            {medias.length > 1 && (
              <>
                {[
                  ["‹", "Média précédent", previousMedia, "left"],
                  ["›", "Média suivant", nextMedia, "right"],
                ].map(([icon, label, action, side]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={action}
                    aria-label={label}
                    style={{
                      position: "absolute",
                      [side]: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 5,
                      width: "36px",
                      height: "36px",
                      padding: 0,
                      border: "none",
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.55)",
                      color: "#ffffff",
                      fontSize: "24px",
                      cursor: "pointer",
                    }}
                  >
                    {icon}
                  </button>
                ))}
                <span
                  style={{
                    position: "absolute",
                    bottom:
                      currentMedia?.type === "video" ? "50px" : "10px",
                    right: "10px",
                    padding: "5px 10px",
                    borderRadius: "15px",
                    background: "rgba(0,0,0,0.65)",
                    color: "#ffffff",
                    fontSize: "11px",
                    pointerEvents: "none",
                  }}
                >
                  {selectedMediaIndex + 1} / {medias.length}
                </span>
              </>
            )}
          </div>
          {/* NOM */}
          <h1
            style={{
              margin: "16px 0 8px",
              color: "#163b5c",
              fontSize: "clamp(20px, 5vw, 28px)",
              lineHeight: "1.25",
              overflowWrap: "anywhere",
            }}
          >
            {product.name || "Machine industrielle"}
          </h1>
          {/* AVIS SOUS LE NOM */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <div aria-label="Note des clients">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  style={{
                    fontSize: "17px",
                    color:
                      star <= Math.round(averageRating)
                        ? "#f5a623"
                        : "#dce4ed",
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={onOpenReviews}
              style={{
                padding: "6px 10px",
                border: "none",
                borderRadius: "16px",
                background: "#f0f5fb",
                color: "#174b91",
                fontFamily: "inherit",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {reviews.length ? `${reviews.length} avis` : "Voir les avis"} ›
            </button>
          </div>
          {/* MODÈLES */}
          {machineModels.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <p
                style={{
                  color: "#52657a",
                  fontSize: "15px",
                  fontWeight: "700",
                }}
              >
                Choisissez votre modèle
              </p>
              <div
                style={{
                  border: "1px solid #e3eaf2",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "0.85fr 1fr 1.15fr",
                    gap: "8px",
                    padding: "9px 8px",
                    background: "#f5f7fb",
                    color: "#7a879a",
                    fontSize: "12px",
                    fontWeight: "800",
                  }}
                >
                  <span>MODÈLE</span>
                  <span>CAPACITÉ</span>
                  <span>PRIX</span>
                </div>
                {machineModels.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={activeModelId === item.id}
                    onClick={() => {
                      setSelectedMediaIndex(0);
                      setSelectedModelId(item.id);
                    }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "0.85fr 1fr 1.15fr",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "9px 8px",
lineHeight: "1.2",
minHeight: 0,
                      border: "none",
                      borderTop: "1px solid #e3eaf2",
                      borderLeft:
                        activeModelId === item.id
                          ? "4px solid #087fc1"
                          : "4px solid transparent",
                      borderRadius: 0,
                      background:
                        activeModelId === item.id ? "#edf6fc" : "#ffffff",
                      textAlign: "left",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      color: "#163b5c",
                      cursor: "pointer",
                    }}
                  >
                    <strong style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                      {item.name}
                    </strong>
                    <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                      {item.capacity}
                    </span>
                    <strong
                      style={{
                        minWidth: 0,
                        color: "#087fc1",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {formatModelPrice(item.price)}
                    </strong>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* DÉTAILS */}
{selectedMachineModel && (
  <div
    style={{
      margin: "8px 0",
      padding: "6px 8px",
      border: "1px solid #e3eaf2",
      borderRadius: "10px",
      background: "#ffffff",
    }}
  >
    {[
      ["Catégorie", product.category],
      ["Puissance", selectedMachineModel.power],
      ["Année de fabrication", selectedMachineModel.year],
      ["Garantie", selectedMachineModel.warranty],
      ["Disponibilité", selectedMachineModel.availability],
    ].map(([label, value], index) => (
      <div
        key={label}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "start",
          gap: "8px",
          padding: "7px 0",
          borderTop: index === 0
            ? "none"
            : "1px solid #edf1f5",
          fontSize: "15px",
          lineHeight: "1.45",
        }}
      >
        <span style={{ color: "#52657a" }}>
          {label}
        </span>
        <strong
          style={{
            color: "#163b5c",
            textAlign: "right",
            overflowWrap: "anywhere",
          }}
        >
          {String(value ?? "").trim() || "Non renseignée"}
        </strong>
      </div>
    ))}
  </div>
)}
          {/* DESCRIPTION */}
<section style={{ margin: "12px 0", padding: "12px", border: "1px solid #e3eaf2", borderRadius: "14px", background: "#ffffff" }}>
          <h2 style={{ margin: "0 0 8px", color: "#163b5c", fontSize: "16px" }}>
            Description
          </h2>
          <p
            style={{
              margin: 0,
              color: "#667085",
              fontSize: "15px",
              lineHeight: "1.65",
              whiteSpace: "pre-line",
              overflowWrap: "anywhere",
            }}
          >
            {productDescription}
          </p>
</section>
{/* PRIX, QUANTITÉ ET AJOUT */}
          {selectedMachineModel && (
            <div
              style={{
                padding: "8px",
                border: "1px solid #dceaf5",
                borderRadius: "14px",
                background: "#edf6fc",
              }}
            >
              <strong style={{ color: "#52657a", fontSize: "15px" }}>
                {selectedMachineModel.name}
              </strong>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "6px",
                  marginTop: "6px",
                }}
              >
                <div>
                  <div style={{ color: "#52657a", fontSize: "15px" }}>
                    Prix unitaire
                  </div>
                  <strong style={{ color: "#087fc1", fontSize: "16px" }}>
                    {formatModelPrice(selectedMachineModel.price)}
                  </strong>
                </div>
                <div>
                  <label
                    htmlFor="model-quantity"
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      color: "#52657a",
                      fontSize: "15px",
                    }}
                  >
                    Quantité
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      aria-label="Diminuer la quantité"
                      onClick={() => setQuantity(quantity - 1)}
                      style={smallButtonStyle}
                    >
                      −
                    </button>
                    <input
                      id="model-quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      style={{
                        width: "48px",
                        height: "34px",
                        boxSizing: "border-box",
                        border: "1px solid #cad9e9",
                        borderRadius: "8px",
                        textAlign: "center",
                        fontSize: "15px",
                        background: "#ffffff",
                        color: "#163b5c",
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Augmenter la quantité"
                      onClick={() => setQuantity(quantity + 1)}
                      style={smallButtonStyle}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "10px",
                  border: "none",
                  borderRadius: "10px",
                  background: "#087fc1",
                  color: "#ffffff",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                🛒 Ajouter au panier
              </button>
              {cartMessage && (
  <div
    role="status"
    aria-live="polite"
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginTop: "8px",
      padding: "10px",
      border: "1px solid #b9dfce",
      borderRadius: "10px",
      background: "#edf9f2",
      color: "#176b45",
      fontSize: "15px",
      lineHeight: "1.4",
    }}
  >
    <span style={{ fontSize: "18px" }}>✓</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <strong>UMI</strong>
      <div style={{ overflowWrap: "anywhere" }}>
        {cartMessage}
      </div>
    </div>
    <button
      type="button"
      aria-label="Fermer la confirmation"
      onClick={() => setCartMessage("")}
      style={{
        padding: "4px",
        border: "none",
        background: "transparent",
        color: "#176b45",
        fontSize: "20px",
        cursor: "pointer",
      }}
    >
      ×
    </button>
  </div>
)}
            </div>
          )}
          {/* TOTAL DE LA SÉLECTION */}
          <div
            style={{
              margin: "16px 0",
              padding: "12px",
              border: "1px solid #dceaf5",
              borderRadius: "14px",
              background: "#f7faff",
            }}
          >
            <h2 style={{ margin: "0 0 10px", fontSize: "15px", color: "#163b5c" }}>
              Total de votre sélection
            </h2>
            {addedSelections.length === 0 ? (
              <p style={{ margin: 0, fontSize: "15px", color: "#52657a" }}>
                Aucun modèle ajouté pour le moment.
              </p>
            ) : (
              <>
                {addedSelections.map((item) => (
                  <div
                    key={item.selectedModelId || "machine"}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      marginBottom: "6px",
                      fontSize: "15px",
                      color: "#52657a",
                    }}
                  >
                    <span>{item.name}</span>
                    <strong>× {item.quantity}</strong>
                  </div>
                ))}
                <strong
                  style={{
                    display: "block",
                    paddingTop: "10px",
                    marginTop: "10px",
                    borderTop: "1px solid #dceaf5",
                    color: "#087fc1",
                    fontSize: "18px",
                  }}
                >
                  {selectionTotal === null
  ? "Total non disponible"
  : `${selectionTotal.toLocaleString("fr-FR")} FCFA`}
                </strong>
              </>
            )}
          </div>
        </div>
      </main>
     {/* BARRE FIXE EN BAS */}
<nav
  className="umi-product-actions"
  aria-label="Navigation principale"
>
  {(embedded
    ? [
        ["🛒", "Panier", onOpenCart],
        ["✓", "Commander", handleOrder],
      ]
    : [
        ["⌂", "Accueil", onHome],
        ["⚙", "Catégories", onCategories],
        ["🛒", "Panier", onOpenCart],
        ["✓", "Commander", handleOrder],
      ]
  ).map(([icon, label, action]) => (
    <button
      key={label}
      type="button"
      onClick={action}
    >
      <span className="umi-product-action-icon">{icon}</span>
      <span className="umi-product-action-label">{label}</span>
    </button>
  ))}
</nav>
      {/* PHOTO OU VIDÉO AGRANDIE */}
{(enlargedPhoto || enlargedVideo) &&
  createPortal(
   <div
  onTouchStart={handleSwipeStart}
  onTouchEnd={handleSwipeEnd}
  onTouchCancel={() => {
    swipeStart.current = null;
  }}
  role="dialog"
  aria-modal="true"
      aria-label="Média agrandi du modèle"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
        background: "#000000",
        touchAction: "pan-y",
      }}
    >
      <button
        type="button"
        autoFocus
        aria-label="Retour à la fiche machine"
        onClick={closeEnlargedMedia}
        style={{
          position: "absolute",
          top: "calc(12px + env(safe-area-inset-top, 0px))",
          left: "12px",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          border: "none",
          borderRadius: "12px",
          background: "#ffffff",
          color: "#163b5c",
          fontFamily: "inherit",
          fontSize: "14px",
          fontWeight: "700",
          cursor: "pointer",
        }}
      >
        ← Retour
      </button>
      {enlargedVideo ? (
        <video
          key={enlargedVideo}
          src={enlargedVideo}
          controls
          playsInline
          autoPlay
          style={{
            display: "block",
            width: "100%",
            maxHeight: "80dvh",
            objectFit: "contain",
          }}
        />
      ) : (
        <img
          src={enlargedPhoto}
          alt={selectedMachineModel?.name || "Machine"}
          style={{
            display: "block",
            maxWidth: "100%",
            maxHeight: "80dvh",
            objectFit: "contain",
          }}
        />
      )}
    </div>,
    document.body
  )}
    </div>
  );
}
export default ProductDetail;
