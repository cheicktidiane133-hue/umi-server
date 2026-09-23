import { useMemo, useState } from "react";

import "./CommerceModule.css";


function CommerceProductDetail({
  product,
  type,
  onBack,
  onAddToCart,
  onQuote,
}) {

  const [quantity, setQuantity] =
    useState(1);

  const [selectedMedia, setSelectedMedia] =
    useState(0);


  /* =========================================
     MÉDIAS DU PRODUIT
     PHOTOS + VIDÉO
  ========================================= */

  const medias = useMemo(() => {

    if (!product) {
      return [];
    }

    const result = [];


    /* =====================================
       NOUVELLES PHOTOS
    ===================================== */

    if (
      Array.isArray(product.imageUrls)
    ) {

      product.imageUrls.forEach(
        (url) => {

          if (
            typeof url === "string" &&
            url.trim()
          ) {

            result.push({
              type: "image",
              url: url.trim(),
            });

          }

        }
      );

    }


    /* =====================================
       ANCIENNE PHOTO PRINCIPALE

       On l'ajoute seulement si elle
       n'est pas déjà dans imageUrls.
    ===================================== */

    if (
      product.imageUrl &&
      !result.some(
        (media) =>
          media.url === product.imageUrl
      )
    ) {

      result.push({
        type: "image",
        url: product.imageUrl,
      });

    }


    /* =====================================
       VIDÉO
    ===================================== */

    if (
      typeof product.videoUrl === "string" &&
      product.videoUrl.trim()
    ) {

      result.push({
        type: "video",
        url: product.videoUrl.trim(),
      });

    }


    return result;

  }, [product]);


  if (!product) {
    return null;
  }


  /* =========================================
     MÉDIA ACTUEL
  ========================================= */

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
    });

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
            GRAND AFFICHAGE
            PHOTO OU VIDÉO
        ===================================== */}

        <div
          className="commerce-detail-image"
          style={{
            position: "relative",
            overflow: "hidden",
          }}
        >

          {!currentMedia ? (

            <span>

              {type === "rawMaterial"
                ? "🌾"
                : "📦"}

            </span>

          ) : currentMedia.type ===
            "video" ? (

            /* =================================
               VIDÉO
            ================================= */

            <video
              key={currentMedia.url}
              src={currentMedia.url}
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
              Votre navigateur ne peut pas
              lire cette vidéo.
            </video>

          ) : (

            /* =================================
               PHOTO
            ================================= */

            <img
              key={currentMedia.url}
              src={currentMedia.url}
              alt={product.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />

          )}


          {/* =================================
              FLÈCHE GAUCHE
          ================================= */}

          {medias.length > 1 && (

            <button
              type="button"
              onClick={previousMedia}
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


          {/* =================================
              FLÈCHE DROITE
          ================================= */}

          {medias.length > 1 && (

            <button
              type="button"
              onClick={nextMedia}
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


          {/* =================================
              COMPTEUR
          ================================= */}

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
              padding:
                "10px 2px 12px 2px",
              WebkitOverflowScrolling:
                "touch",
            }}
          >

            {medias.map(
              (media, index) => (

                <button
                  key={`${media.url}-${index}`}
                  type="button"
                  onClick={() =>
                    setSelectedMedia(
                      index
                    )
                  }
                  style={{
                    flex: "0 0 72px",
                    width: "72px",
                    height: "72px",
                    padding: "0",
                    border:
                      selectedMedia ===
                      index
                        ? "3px solid #087fc1"
                        : "1px solid #dddddd",
                    borderRadius: "10px",
                    overflow: "hidden",
                    background:
                      "#f5f5f5",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >

                  {media.type ===
                  "video" ? (

                    <>

                      <video
                        src={media.url}
                        muted
                        playsInline
                        preload="metadata"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit:
                            "cover",
                          pointerEvents:
                            "none",
                        }}
                      />


                      <span
                        style={{
                          position:
                            "absolute",
                          left: "50%",
                          top: "50%",
                          transform:
                            "translate(-50%, -50%)",
                          width: "30px",
                          height: "30px",
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          borderRadius:
                            "50%",
                          background:
                            "rgba(0,0,0,0.7)",
                          color:
                            "#ffffff",
                          fontSize:
                            "14px",
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
                        objectFit:
                          "cover",
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

          {product.price ||
            "Prix sur demande"}

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

                {
                  product.minimumQuantity
                }

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


            <strong>
              {quantity}
            </strong>


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
          onClick={handleAdd}
        >
          🛒 Ajouter au panier
        </button>


        {/* =====================================
            DEVIS
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