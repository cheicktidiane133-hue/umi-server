import { useEffect, useMemo, useState } from "react";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "./firebase";

import "./CommerceModule.css";


function RawMaterials({
  onBack,
  onOpenProduct,
}) {

  const [products, setProducts] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);


  /* =========================================
     CHARGER LES MATIÈRES PREMIÈRES
  ========================================= */

  useEffect(() => {

    const loadProducts = async () => {

      try {

        setLoading(true);

        const snapshot =
          await getDocs(
            collection(
              db,
              "rawMaterials"
            )
          );

        const data =
          snapshot.docs.map(
            (document) => ({
              id: document.id,
              ...document.data(),
            })
          );

        setProducts(data);

      } catch (error) {

        console.error(
          "Erreur matières premières :",
          error
        );

      } finally {

        setLoading(false);

      }

    };


    loadProducts();

  }, []);


  /* =========================================
     RECHERCHE
  ========================================= */

  const filteredProducts =
    useMemo(() => {

      const text =
        search
          .trim()
          .toLowerCase();

      if (!text) {
        return products;
      }

      return products.filter(
        (product) => {

          const information = [
            product.name,
            product.category,
            product.origin,
            product.description,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return information.includes(
            text
          );

        }
      );

    }, [products, search]);


  /* =========================================
     PHOTO PRINCIPALE
  ========================================= */

  const getMainImage = (
    product
  ) => {

    /*
      Nouveau système :
      imageUrls contient jusqu'à
      10 photos.
    */

    if (
      Array.isArray(
        product.imageUrls
      ) &&
      product.imageUrls.length > 0
    ) {

      return (
        product.imageUrls[0] ||
        ""
      );

    }


    /*
      Ancien système :
      imageUrl contient une photo.
    */

    return (
      product.imageUrl ||
      ""
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
            Matières premières
          </h1>

          <p>
            UMI Marketplace
          </p>

        </div>


        <span>
          🌾
        </span>

      </header>


      <main className="commerce-content">


        {/* =====================================
            INTRODUCTION
        ===================================== */}

        <div className="commerce-intro">

          <h2>
            Matières premières industrielles
          </h2>

          <p>
            Achetez ou commandez les matières
            nécessaires à votre production.
          </p>

        </div>


        {/* =====================================
            RECHERCHE
        ===================================== */}

        <div className="commerce-search">

          <span>
            🔍
          </span>

          <input
            type="text"
            placeholder="Rechercher une matière première..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

        </div>


        {/* =====================================
            CHARGEMENT
        ===================================== */}

        {loading ? (

          <div className="commerce-empty">

            Chargement...

          </div>

        ) : filteredProducts.length === 0 ? (

          /* =================================
             AUCUN PRODUIT
          ================================= */

          <div className="commerce-empty">

            <div>
              🌾
            </div>

            <h3>
              Aucun produit disponible
            </h3>

            <p>
              Les matières premières ajoutées
              par l'administration apparaîtront ici.
            </p>

          </div>

        ) : (

          /* =================================
             PRODUITS
          ================================= */

          <div className="commerce-grid">

            {filteredProducts.map(
              (product) => {

                const mainImage =
                  getMainImage(
                    product
                  );

                const numberOfImages =
                  Array.isArray(
                    product.imageUrls
                  )
                    ? product.imageUrls.length
                    : product.imageUrl
                    ? 1
                    : 0;

                const hasVideo =
                  Boolean(
                    product.videoUrl
                  );


                return (

                  <button
                    type="button"
                    className="commerce-card"
                    key={product.id}
                    onClick={() =>
                      onOpenProduct(
                        product
                      )
                    }
                  >


                    {/* =========================
                        PHOTO PRINCIPALE
                    ========================= */}

                    <div
                      className="commerce-card-image"
                      style={{
                        position:
                          "relative",
                      }}
                    >

                      {mainImage ? (

                        <img
                          src={
                            mainImage
                          }
                          alt={
                            product.name ||
                            "Matière première"
                          }
                        />

                      ) : (

                        <span>
                          🌾
                        </span>

                      )}


                      {/* =====================
                          NOMBRE DE PHOTOS
                      ===================== */}

                      {numberOfImages > 1 && (

                        <div
                          style={{
                            position:
                              "absolute",
                            left: "8px",
                            bottom: "8px",

                            padding:
                              "5px 9px",

                            borderRadius:
                              "12px",

                            background:
                              "rgba(0,0,0,0.68)",

                            color:
                              "#ffffff",

                            fontSize:
                              "11px",

                            fontWeight:
                              "800",
                          }}
                        >

                          📷 {numberOfImages}

                        </div>

                      )}


                      {/* =====================
                          VIDÉO DISPONIBLE
                      ===================== */}

                      {hasVideo && (

                        <div
                          style={{
                            position:
                              "absolute",

                            right: "8px",
                            bottom: "8px",

                            width: "34px",
                            height: "34px",

                            display:
                              "flex",

                            alignItems:
                              "center",

                            justifyContent:
                              "center",

                            borderRadius:
                              "50%",

                            background:
                              "rgba(0,0,0,0.72)",

                            color:
                              "#ffffff",

                            fontSize:
                              "16px",
                          }}
                          title="Vidéo disponible"
                        >

                          ▶

                        </div>

                      )}

                    </div>


                    {/* =========================
                        INFORMATIONS
                    ========================= */}

                    <div className="commerce-card-info">

                      <h3>

                        {product.name ||
                          "Sans nom"}

                      </h3>


                      {product.unit && (

                        <p>

                          Unité :{" "}
                          {product.unit}

                        </p>

                      )}


                      <strong>

                        {product.price ||
                          "Prix sur demande"}

                      </strong>


                      {/* =====================
                          MÉDIAS DISPONIBLES
                      ===================== */}

                      {(numberOfImages > 1 ||
                        hasVideo) && (

                        <small
                          style={{
                            display:
                              "block",

                            marginTop:
                              "6px",

                            opacity:
                              "0.7",
                          }}
                        >

                          {numberOfImages > 0
                            ? `${numberOfImages} photo${
                                numberOfImages > 1
                                  ? "s"
                                  : ""
                              }`
                            : ""}

                          {numberOfImages > 0 &&
                          hasVideo
                            ? " • "
                            : ""}

                          {hasVideo
                            ? "1 vidéo"
                            : ""}

                        </small>

                      )}

                    </div>

                  </button>

                );

              }
            )}

          </div>

        )}

      </main>

    </div>

  );

}


export default RawMaterials;