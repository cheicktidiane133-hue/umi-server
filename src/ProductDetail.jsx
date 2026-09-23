import { useEffect, useState } from "react";
import { Share } from "@capacitor/share";

import "./ProductDetail.css";
import machineUmi from "./assets/machine-umi.png";


function ProductDetail({
  product,
  onBack,
  onHome,
  onOrder,
  onAddToCart,
}) {

  /* =========================================
     PHOTOS
  ========================================= */

  const productImages =
    Array.isArray(product?.images) &&
    product.images.filter(Boolean).length > 0
      ? product.images.filter(Boolean)
      : product?.imageUrl
        ? [product.imageUrl]
        : product?.image
          ? [product.image]
          : [machineUmi];


  /* =========================================
     VIDÉOS
     Compatible avec :
     - videoUrl
     - videos
  ========================================= */

  const productVideos = (() => {

    const videos = [];


    /* Ancien système éventuel */

    if (Array.isArray(product?.videos)) {

      product.videos
        .filter(Boolean)
        .forEach((url) => {

          if (!videos.includes(url)) {
            videos.push(url);
          }

        });

    }


    /* Nouveau système */

    if (
      typeof product?.videoUrl === "string" &&
      product.videoUrl.trim()
    ) {

      const videoUrl =
        product.videoUrl.trim();


      if (!videos.includes(videoUrl)) {

        videos.push(videoUrl);

      }

    }


    return videos;

  })();


  /* =========================================
     TOUS LES MÉDIAS
  ========================================= */

  const media = [

    ...productImages.map((url) => ({
      type: "image",
      url,
    })),

    ...productVideos.map((url) => ({
      type: "video",
      url,
    })),

  ];


  /* =========================================
     MÉDIA SÉLECTIONNÉ
  ========================================= */

  const [
    selectedMediaIndex,
    setSelectedMediaIndex,
  ] = useState(0);


  const [
    isFullscreen,
    setIsFullscreen,
  ] = useState(false);


  /* =========================================
     RÉINITIALISER QUAND ON CHANGE DE MACHINE
  ========================================= */

  useEffect(() => {

    setSelectedMediaIndex(0);

    setIsFullscreen(false);

  }, [product?.id]);


  /*
    Protection si le nombre de médias
    change après une mise à jour Firestore.
  */

  useEffect(() => {

    if (
      selectedMediaIndex >= media.length
    ) {

      setSelectedMediaIndex(0);

    }

  }, [
    media.length,
    selectedMediaIndex,
  ]);


  const selectedMedia =
    media[selectedMediaIndex] ||
    media[0];


  /* =========================================
     DESCRIPTION
  ========================================= */

  const productDescription =
    typeof product?.description === "string" &&
    product.description.trim()
      ? product.description.trim()
      : "Aucune description disponible.";


  /* =========================================
     COMMANDER
  ========================================= */

  const handleOrder = () => {

    if (onOrder) {

      onOrder(product);

    }

  };


  /* =========================================
     AJOUTER AU PANIER
  ========================================= */

  const handleAddToCart = () => {

    if (onAddToCart) {

      onAddToCart(product);

    }

  };


  /* =========================================
     ACCUEIL
  ========================================= */

  const handleHome = () => {

    if (onHome) {

      onHome();

    }

  };


  /* =========================================
     OUVRIR EN PLEIN ÉCRAN
  ========================================= */

  const openMedia = (index) => {

    setSelectedMediaIndex(index);

    setIsFullscreen(true);

  };


  /* =========================================
     MÉDIA PRÉCÉDENT
  ========================================= */

  const previousMedia = () => {

    if (media.length <= 1) {
      return;
    }


    setSelectedMediaIndex(
      (currentIndex) =>
        currentIndex === 0
          ? media.length - 1
          : currentIndex - 1
    );

  };


  /* =========================================
     MÉDIA SUIVANT
  ========================================= */

  const nextMedia = () => {

    if (media.length <= 1) {
      return;
    }


    setSelectedMediaIndex(
      (currentIndex) =>
        currentIndex === media.length - 1
          ? 0
          : currentIndex + 1
    );

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


  return (

    <div className="product-page">


      {/* =====================================
          RETOUR
      ===================================== */}

      <button
        type="button"
        className="product-back"
        onClick={onBack}
      >
        ←
      </button>


      <div className="product-container">


        {/* =====================================
            GALERIE
        ===================================== */}

        <div className="product-gallery">


          <div className="product-image-box">


            {/* PARTAGER */}

            <button
              type="button"
              className="product-share-button"
              onClick={handleShare}
              aria-label="Partager"
            >
              ↗
            </button>


            {/* =================================
                MÉDIA PRINCIPAL
            ================================= */}

            <button
              type="button"
              className="product-main-media"
              onClick={() =>
                openMedia(
                  selectedMediaIndex
                )
              }
            >


              {selectedMedia?.type ===
              "video" ? (

                <div className="product-video-cover">


                  <video
                    src={
                      selectedMedia.url
                    }
                    muted
                    playsInline
                    preload="metadata"
                  />


                  <span className="product-play-icon">
                    ▶
                  </span>


                </div>

              ) : (

                <img
                  src={
                    selectedMedia?.url ||
                    machineUmi
                  }
                  alt={
                    product?.name ||
                    "Machine industrielle"
                  }
                />

              )}


            </button>


            {/* COMPTEUR */}

            {media.length > 1 && (

              <div className="product-media-counter">

                {selectedMediaIndex + 1}

                {" / "}

                {media.length}

              </div>

            )}


          </div>


          {/* =================================
              MINIATURES
          ================================= */}

          {media.length > 1 && (

            <div className="product-thumbnails">


              {media.map(
                (item, index) => (

                  <button
                    type="button"
                    key={`${item.type}-${item.url}-${index}`}
                    className={
                      index ===
                      selectedMediaIndex
                        ? "product-thumbnail active"
                        : "product-thumbnail"
                    }
                    onClick={() =>
                      setSelectedMediaIndex(
                        index
                      )
                    }
                  >


                    {item.type ===
                    "video" ? (

                      <div className="product-thumbnail-video">


                        <video
                          src={item.url}
                          muted
                          playsInline
                          preload="metadata"
                        />


                        <span>
                          ▶
                        </span>


                      </div>

                    ) : (

                      <img
                        src={item.url}
                        alt={`Photo ${
                          index + 1
                        }`}
                      />

                    )}


                  </button>

                )
              )}


            </div>

          )}


        </div>


        {/* =====================================
            INFORMATIONS MACHINE
        ===================================== */}

        <div className="product-details">


          <p className="product-category">

            {product?.category ||
              "Machine industrielle"}

          </p>


          <h1>

            {product?.name ||
              "Machine industrielle"}

          </h1>


          <p className="product-price">

            {product?.price ||
              "Prix non renseigné"}

          </p>


          {/* =================================
              DESCRIPTION
          ================================= */}

          <div className="product-description-section">


            <h2>
              Description
            </h2>


            <p className="product-description">

              {productDescription}

            </p>


          </div>


          {/* =================================
              CARACTÉRISTIQUES
          ================================= */}

          <h2>
            Caractéristiques
          </h2>


          <div className="product-specifications">


            <p>

              <strong>
                Nom de la machine :
              </strong>{" "}

              {product?.name ||
                "Non renseigné"}

            </p>


            <p>

              <strong>
                Catégorie :
              </strong>{" "}

              {product?.category ||
                "Non renseignée"}

            </p>


            <p>

              <strong>
                Prix :
              </strong>{" "}

              {product?.price ||
                "Non renseigné"}

            </p>


            <p>

              <strong>
                État de la machine :
              </strong>{" "}

              {product?.condition ||
                "Non renseigné"}

            </p>


            <p>

              <strong>
                Marque :
              </strong>{" "}

              {product?.brand ||
                "Non renseignée"}

            </p>


            <p>

              <strong>
                Modèle :
              </strong>{" "}

              {product?.model ||
                "Non renseigné"}

            </p>


            <p>

              <strong>
                Capacité de production :
              </strong>{" "}

              {product?.capacity ||
                "Non renseignée"}

            </p>


            <p>

              <strong>
                Puissance :
              </strong>{" "}

              {product?.power ||
                "Non renseignée"}

            </p>


            <p>

              <strong>
                Année de fabrication :
              </strong>{" "}

              {product?.year ||
                "Non renseignée"}

            </p>


            <p>

              <strong>
                Garantie :
              </strong>{" "}

              {product?.warranty ||
                "Non renseignée"}

            </p>


            <p>

              <strong>
                Localisation :
              </strong>{" "}

              {product?.location ||
                "Non renseignée"}

            </p>


          </div>


        </div>


      </div>


      {/* =====================================
          BARRE FIXE EN BAS
      ===================================== */}

      <div className="product-bottom-bar">


        <button
          type="button"
          className="product-home-button"
          onClick={handleHome}
        >

          <span>
            ⌂
          </span>

          <small>
            Accueil
          </small>

        </button>


        <button
          type="button"
          className="product-cart-button"
          onClick={handleAddToCart}
        >

          <span>
            🛒
          </span>

          <small>
            Ajouter au panier
          </small>

        </button>


        <button
          type="button"
          className="product-order-button"
          onClick={handleOrder}
        >
          Commander
        </button>


      </div>


      {/* =====================================
          PLEIN ÉCRAN
      ===================================== */}

      {isFullscreen && (

        <div className="product-fullscreen">


          {/* RETOUR */}

          <button
            type="button"
            className="fullscreen-back"
            onClick={() =>
              setIsFullscreen(false)
            }
          >
            ←
          </button>


          {/* PARTAGER */}

          <button
            type="button"
            className="fullscreen-share"
            onClick={handleShare}
          >
            ↗
          </button>


          {/* PRÉCÉDENT */}

          {media.length > 1 && (

            <button
              type="button"
              className="fullscreen-previous"
              onClick={previousMedia}
            >
              ‹
            </button>

          )}


          {/* =================================
              MÉDIA PLEIN ÉCRAN
          ================================= */}

          <div className="fullscreen-media">


            {selectedMedia?.type ===
            "video" ? (

              <video
                src={
                  selectedMedia.url
                }
                controls
                autoPlay
                playsInline
                preload="metadata"
              />

            ) : (

              <img
                src={
                  selectedMedia?.url ||
                  machineUmi
                }
                alt={
                  product?.name ||
                  "Machine"
                }
              />

            )}


          </div>


          {/* SUIVANT */}

          {media.length > 1 && (

            <button
              type="button"
              className="fullscreen-next"
              onClick={nextMedia}
            >
              ›
            </button>

          )}


          {/* COMPTEUR */}

          <div className="fullscreen-counter">

            {selectedMediaIndex + 1}

            {" / "}

            {media.length}

          </div>


        </div>

      )}


    </div>

  );

}


export default ProductDetail;