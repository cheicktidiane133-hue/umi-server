import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import { getProductPrice } from "./productPrice";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import {
  db,
} from "./firebase";

import {
  Share2,
} from "lucide-react";

import "./CommerceModule.css";


function CommerceProductDetail({

  product,

  type,

  onBack,

  onAddToCart,

  onQuote,

  /* AVIS */

  onOpenReviews,

  /* FAVORIS */

  isFavorite = false,

  onToggleFavorite,

}) {


  /* =========================================
     QUANTITÉ
  ========================================= */

  const [
    quantity,
    setQuantity,
  ] = useState(1);


  const orderUnit =
    String(
      product?.unit || ""
    ).trim();


  /* =========================================
     MÉDIA SÉLECTIONNÉ
  ========================================= */

  const [
    selectedMedia,
    setSelectedMedia,
  ] = useState(0);


  /* =========================================
     FAVORIS
  ========================================= */

  const [
    favoriteLoading,
    setFavoriteLoading,
  ] = useState(false);


  /* =========================================
     AVIS CLIENTS
  ========================================= */

  const [
    reviews,
    setReviews,
  ] = useState([]);


  /* =========================================
     COLLECTION FIRESTORE DU PRODUIT
  ========================================= */

  const productCollection =
    type === "rawMaterial"
      ? "rawMaterials"
      : "packaging";


  /* =========================================
     CHARGER LES AVIS DU PRODUIT
  ========================================= */

  useEffect(() => {

    if (!product?.id) {

      setReviews([]);

      return;

    }


    const reviewsRef =
      collection(
        db,
        productCollection,
        product.id,
        "reviews"
      );


    const unsubscribe =
      onSnapshot(

        reviewsRef,

        (snapshot) => {

          const reviewsData =
            snapshot.docs.map(
              (reviewDocument) => ({

                id:
                  reviewDocument.id,

                ...reviewDocument.data(),

              })
            );


          reviewsData.sort(
            (a, b) => {

              const dateA =
                a.createdAt
                  ?.toMillis?.() || 0;

              const dateB =
                b.createdAt
                  ?.toMillis?.() || 0;


              return dateB - dateA;

            }
          );


          setReviews(
            reviewsData
          );

        },

        (error) => {

          console.error(
            "Erreur chargement avis produit :",
            error
          );

          setReviews([]);

        }

      );


    return () => {

      unsubscribe();

    };

  }, [
    product?.id,
    productCollection,
  ]);


  /* =========================================
     NOTE MOYENNE
  ========================================= */

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (total, review) =>
              total +
              (
                Number(
                  review.rating
                ) || 0
              ),
            0
          ) / reviews.length
        )
      : 0;


  /* =========================================
     MÉDIAS
  ========================================= */

  const medias =
    useMemo(() => {

      if (!product) {

        return [];

      }


      const result = [];


      /* PHOTOS */

      if (
        Array.isArray(
          product.imageUrls
        )
      ) {

        product.imageUrls.forEach(
          (url) => {

            if (
              typeof url === "string" &&
              url.trim()
            ) {

              result.push({

                type: "image",

                url:
                  url.trim(),

              });

            }

          }
        );

      }


      /* ANCIENNE PHOTO PRINCIPALE */

      if (
        product.imageUrl &&
        !result.some(
          (media) =>
            media.url ===
            product.imageUrl
        )
      ) {

        result.push({

          type: "image",

          url:
            product.imageUrl,

        });

      }


      /* VIDÉO */

      if (
        typeof product.videoUrl ===
          "string" &&
        product.videoUrl.trim()
      ) {

        result.push({

          type: "video",

          url:
            product.videoUrl.trim(),

        });

      }


      return result;

    }, [product]);


  /* =========================================
     PRODUIT ABSENT
  ========================================= */

  if (!product) {

    return null;

  }


  const currentMedia =
    medias[selectedMedia] ||
    null;


  /* =========================================
     AJOUTER AU PANIER
  ========================================= */

  const handleAdd = () => {

    onAddToCart({

      ...product,

      id:
        `${type}_${product.id}`,

      originalId:
        product.id,

      productType:
        type,

      quantity,

      unit:
        orderUnit,

      quantityWithUnit:
        type === "rawMaterial"
          ? `${quantity} ${orderUnit}`
          : String(quantity),

    });

  };


  /* =========================================
     FAVORIS
  ========================================= */

  const handleFavorite =
    async () => {

      if (
        !onToggleFavorite ||
        favoriteLoading
      ) {

        return;

      }


      try {

        setFavoriteLoading(
          true
        );


        await onToggleFavorite();

      } catch (error) {

        console.error(
          "Erreur favori :",
          error
        );

      } finally {

        setFavoriteLoading(
          false
        );

      }

    };


  /* =========================================
     PARTAGER
  ========================================= */

  const handleShare =
    async () => {

      const shareData = {

        title:
          product.name ||
          "UMI Marketplace",

        text:
          `Découvrez ${
            product.name ||
            "cet article"
          } sur UMI`,

        url:
          window.location.href,

      };


      try {

        if (
          navigator.share
        ) {

          await navigator.share(
            shareData
          );

        } else if (
          navigator.clipboard
        ) {

          await navigator.clipboard
            .writeText(
              window.location.href
            );


          await umiNotify(
            "Lien copié."
          );

        } else {

          await umiNotify(
            "Le partage n'est pas disponible sur cet appareil."
          );

        }

      } catch (error) {

        if (
          error?.name !==
          "AbortError"
        ) {

          console.error(
            "Erreur de partage :",
            error
          );

        }

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


    setSelectedMedia(
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


    setSelectedMedia(
      (current) =>
        current ===
        medias.length - 1
          ? 0
          : current + 1
    );

  };


  /* =========================================
     OUVRIR LES AVIS
  ========================================= */

  const handleOpenReviews = () => {

    if (!onOpenReviews) {

      return;

    }


    onOpenReviews({

      ...product,

      productType:
        type,

    });

  };


  return (

    <div className="commerce-page">


      {/* =====================================
          HEADER
      ===================================== */}

      <header className="commerce-header">

        <button
          type="button"
          onClick={onBack}
        >
          ←
        </button>


        <div>

          <h1>

            {type === "rawMaterial"
              ? "Matière première"
              : "Emballage"}

          </h1>


          <p>
            UMI Marketplace
          </p>

        </div>


        <span>

          {type === "rawMaterial"
            ? "🌾"
            : "📦"}

        </span>

      </header>


      <main className="commerce-detail">


        {/* =====================================
            GRAND AFFICHAGE PHOTO / VIDÉO
        ===================================== */}

        <div
          className="commerce-detail-image"

          style={{
            position: "relative",
            overflow: "hidden",
          }}
        >


          {/* FAVORIS */}

          <button
            type="button"

            onClick={
              handleFavorite
            }

            disabled={
              favoriteLoading
            }

            aria-label={
              isFavorite
                ? "Retirer des favoris"
                : "Ajouter aux favoris"
            }

            title={
              isFavorite
                ? "Retirer des favoris"
                : "Ajouter aux favoris"
            }

            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 20,

              width: "46px",
              height: "46px",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              padding: "0",
              border: "none",
              borderRadius: "50%",

              background:
                isFavorite
                  ? "#fff0f3"
                  : "rgba(255,255,255,0.96)",

              color:
                isFavorite
                  ? "#e11d48"
                  : "#173b5b",

              fontSize: "30px",
              fontWeight: "700",
              lineHeight: "1",

              boxShadow:
                "0 4px 15px rgba(0,0,0,0.15)",

              cursor:
                favoriteLoading
                  ? "default"
                  : "pointer",

              opacity:
                favoriteLoading
                  ? 0.65
                  : 1,
            }}
          >

            {isFavorite
              ? "♥"
              : "♡"}

          </button>


          {/* PARTAGER */}

          <button
            type="button"

            onClick={
              handleShare
            }

            aria-label="Partager"
            title="Partager"

            style={{
              position: "absolute",
              top: "66px",
              right: "10px",
              zIndex: 20,

              width: "46px",
              height: "46px",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              padding: "0",
              border: "none",
              borderRadius: "50%",

              background:
                "rgba(255,255,255,0.96)",

              color:
                "#173b5b",

              boxShadow:
                "0 4px 15px rgba(0,0,0,0.15)",

              cursor:
                "pointer",
            }}
          >

            <Share2
              size={22}
              strokeWidth={2}
            />

          </button>


          {!currentMedia ? (

            <span>

              {type === "rawMaterial"
                ? "🌾"
                : "📦"}

            </span>

          ) : currentMedia.type ===
            "video" ? (

            <video
              key={
                currentMedia.url
              }

              src={
                currentMedia.url
              }

              controls
              playsInline
              preload="metadata"

              style={{
                width: "100%",
                height: "100%",
                maxHeight: "500px",
                objectFit: "contain",
                background: "#000000",
              }}
            >

              Votre navigateur ne peut pas lire cette vidéo.

            </video>

          ) : (

            <img
              key={
                currentMedia.url
              }

              src={
                currentMedia.url
              }

              alt={
                product.name
              }

              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />

          )}


          {/* FLÈCHE GAUCHE */}

          {medias.length > 1 && (

            <button
              type="button"

              onClick={
                previousMedia
              }

              aria-label="Média précédent"

              style={{
                position: "absolute",
                left: "10px",
                top: "50%",

                transform:
                  "translateY(-50%)",

                width: "42px",
                height: "42px",

                border: "none",
                borderRadius: "50%",

                background:
                  "rgba(0,0,0,0.55)",

                color: "#ffffff",

                fontSize: "24px",
                fontWeight: "700",

                cursor: "pointer",
                zIndex: 5,
              }}
            >
              ‹
            </button>

          )}


          {/* FLÈCHE DROITE */}

          {medias.length > 1 && (

            <button
              type="button"

              onClick={
                nextMedia
              }

              aria-label="Média suivant"

              style={{
                position: "absolute",
                right: "10px",
                top: "50%",

                transform:
                  "translateY(-50%)",

                width: "42px",
                height: "42px",

                border: "none",
                borderRadius: "50%",

                background:
                  "rgba(0,0,0,0.55)",

                color: "#ffffff",

                fontSize: "24px",
                fontWeight: "700",

                cursor: "pointer",
                zIndex: 5,
              }}
            >
              ›
            </button>

          )}


          {/* COMPTEUR MÉDIAS */}

          {medias.length > 1 && (

            <div
              style={{
                position: "absolute",
                right: "10px",
                bottom: "10px",

                padding: "5px 10px",

                borderRadius: "15px",

                background:
                  "rgba(0,0,0,0.65)",

                color: "#ffffff",

                fontSize: "12px",
                fontWeight: "700",

                zIndex: 5,
              }}
            >

              {selectedMedia + 1}

              {" / "}

              {medias.length}

            </div>

          )}

        </div>
                {/* =====================================
            PETITES PHOTOS + VIDÉO
        ===================================== */}

        {medias.length > 1 && (

          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              padding: "10px 2px 12px 2px",
              WebkitOverflowScrolling: "touch",
            }}
          >

            {medias.map(
              (media, index) => (

                <button
                  key={`${media.url}-${index}`}
                  type="button"

                  onClick={() =>
                    setSelectedMedia(index)
                  }

                  style={{
                    flex: "0 0 72px",
                    width: "72px",
                    height: "72px",
                    padding: "0",

                    border:
                      selectedMedia === index
                        ? "3px solid #087fc1"
                        : "1px solid #dddddd",

                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "#f5f5f5",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >

                  {media.type === "video" ? (

                    <>

                      <video
                        src={media.url}
                        muted
                        playsInline
                        preload="metadata"

                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          pointerEvents: "none",
                        }}
                      />

                      <span
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "50%",

                          transform:
                            "translate(-50%, -50%)",

                          width: "30px",
                          height: "30px",

                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",

                          borderRadius: "50%",
                          background: "rgba(0,0,0,0.7)",
                          color: "#ffffff",
                          fontSize: "14px",
                        }}
                      >
                        ▶
                      </span>

                    </>

                  ) : (

                    <img
                      src={media.url}
                      alt={`${product.name} ${index + 1}`}

                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />

                  )}

                </button>

              )
            )}

          </div>

        )}


        {/* =====================================
            NOM
        ===================================== */}

        <h1>
          {product.name}
        </h1>


        {/* =====================================
            PRIX
        ===================================== */}

        <div className="commerce-detail-price">
  {getProductPrice(product)}
</div>


        {/* =====================================
            DESCRIPTION
        ===================================== */}

        {product.description && (

          <p className="commerce-description">
            {product.description}
          </p>

        )}


        {/* =====================================
            AVIS CLIENTS
            SOUS LE PRIX ET LA DESCRIPTION
        ===================================== */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",

            marginTop: "10px",
            marginBottom: "18px",
          }}
        >

          {/* ÉTOILES */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",

              fontSize: "25px",
              lineHeight: "1",
            }}
          >

            {[1, 2, 3, 4, 5].map(
              (star) => (

                <span
                  key={star}

                  style={{
                    color:
                      reviews.length === 0
                        ? "#f5a000"
                        : star <=
                          Math.round(
                            averageRating
                          )
                          ? "#f5a000"
                          : "#cbd5e1",
                  }}
                >
                  ★
                </span>

              )
            )}

          </div>


          {/* NOMBRE D'AVIS */}

          <button
            type="button"

            onClick={
              handleOpenReviews
            }

            disabled={
              !onOpenReviews
            }

            style={{
              padding: "0",

              border: "none",

              background:
                "transparent",

              color:
                "#123d64",

              fontSize:
                "20px",

              fontWeight:
                "700",

              lineHeight:
                "1",

              textDecoration:
                "underline",

              textUnderlineOffset:
                "3px",

              cursor:
                onOpenReviews
                  ? "pointer"
                  : "default",
            }}
          >

            {reviews.length}

            {" "}

            avis

          </button>

        </div>


        {/* =====================================
            CARACTÉRISTIQUES
        ===================================== */}

        <div className="commerce-characteristics">


          {product.origin && (

            <div>

              <span>
                Origine
              </span>

              <strong>
                {product.origin}
              </strong>

            </div>

          )}


          {product.unit && (

            <div>

              <span>
                Unité
              </span>

              <strong>
                {product.unit}
              </strong>

            </div>

          )}


          {product.stock && (

            <div>

              <span>
                Stock
              </span>

              <strong>
                {product.stock}
              </strong>

            </div>

          )}


          {product.category && (

            <div>

              <span>
                Catégorie
              </span>

              <strong>
                {product.category}
              </strong>

            </div>

          )}


          {product.material && (

            <div>

              <span>
                Matière
              </span>

              <strong>
                {product.material}
              </strong>

            </div>

          )}


          {product.size && (

            <div>

              <span>
                Dimensions
              </span>

              <strong>
                {product.size}
              </strong>

            </div>

          )}


          {product.minimumQuantity && (

            <div>

              <span>
                Commande minimum
              </span>

              <strong>
                {product.minimumQuantity}
              </strong>

            </div>

          )}

        </div>


        {/* =====================================
            QUANTITÉ
        ===================================== */}

        <div className="commerce-quantity">

          <span>
            Quantité
          </span>


          <div>

            <button
              type="button"

              onClick={() =>
                setQuantity(
                  Math.max(
                    1,
                    quantity - 1
                  )
                )
              }
            >
              −
            </button>


            <input
              type="number"
              min="1"

              value={
                quantity
              }

              onChange={(event) => {

                const value =
                  Number(
                    event.target.value
                  );


                setQuantity(
                  Number.isFinite(value) &&
                  value > 0
                    ? value
                    : 1
                );

              }}

              style={{
                width: "70px",
                height: "46px",

                border:
                  "1px solid #d8e2ea",

                borderRadius:
                  "10px",

                textAlign:
                  "center",

                fontSize:
                  "18px",

                fontWeight:
                  "700",

                background:
                  "#ffffff",
              }}
            />


            <button
              type="button"

              onClick={() =>
                setQuantity(
                  quantity + 1
                )
              }
            >
              +
            </button>

          </div>

        </div>


        {/* =====================================
            AJOUTER AU PANIER
        ===================================== */}

        <button
          type="button"

          className="commerce-primary-button"

          onClick={
            handleAdd
          }
        >
          🛒 Ajouter au panier
        </button>


        {/* =====================================
            DEMANDER UN DEVIS
        ===================================== */}

        <button
          type="button"

          className="commerce-secondary-button"

          onClick={() =>
            onQuote(product)
          }
        >
          📄 Demander un devis
        </button>


      </main>

    </div>

  );

}


export default CommerceProductDetail;