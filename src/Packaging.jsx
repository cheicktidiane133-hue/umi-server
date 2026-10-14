import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import { getProductPrice } from "./productPrice";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "./firebase";

import "./CommerceModule.css";


function Packaging({

  onBack,
  onOpenProduct,

  /* FAVORIS */
  isProductFavorite = () => false,
  onToggleFavorite = async () => false,

  /* PHOTO DU COMPTE */
  userPhoto,

  /* BARRE DES TÂCHES */
  onHome,
  onMachines,
  onLive,
  onCart,
  onAccount,

}) {

  /* =========================================
     PRODUITS
  ========================================= */

  const [products, setProducts] =
    useState([]);


  /* =========================================
     RECHERCHE
  ========================================= */

  const [search, setSearch] =
    useState("");


  /* =========================================
     CHARGEMENT
  ========================================= */

  const [loading, setLoading] =
    useState(true);


  /* =========================================
     RECHERCHE PHOTO
  ========================================= */

  const fileInputRef =
    useRef(null);


  const [
    imageSearchLoading,
    setImageSearchLoading,
  ] = useState(false);


  /* =========================================
     CHARGER LES EMBALLAGES
  ========================================= */

  useEffect(() => {

    const loadProducts = async () => {

      try {

        setLoading(true);


        const snapshot =
          await getDocs(
            collection(
              db,
              "packaging"
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
          "Erreur emballages :",
          error
        );


      } finally {

        setLoading(false);

      }

    };


    loadProducts();

  }, []);


  /* =========================================
     NORMALISER TEXTE
  ========================================= */

  const normalizeText =
    (value) => {

      return String(
        value || ""
      )
        .toLowerCase()
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .trim();

    };


  /* =========================================
     RECHERCHE TEXTE
  ========================================= */

  const filteredProducts =
    useMemo(() => {

      const text =
        normalizeText(
          search
        );


      if (!text) {

        return products;

      }


      const searchWords =
        text
          .split(/\s+/)
          .filter(
            (word) =>
              word.length >= 2
          );


      return products.filter(
        (product) => {

          const information =
            normalizeText(
              [
                product.name,
                product.type,
                product.material,
                product.size,
                product.description,
                product.minimumQuantity,
                product.price,
              ]
                .filter(Boolean)
                .join(" ")
            );


          if (
            information.includes(
              text
            )
          ) {

            return true;

          }


          return searchWords.some(
            (word) =>
              information.includes(
                word
              )
          );

        }
      );


    }, [
      products,
      search,
    ]);


  /* =========================================
     RECHERCHE PAR PHOTO
  ========================================= */

  const handleImageSearch =
    (event) => {

      const file =
        event.target.files?.[0];


      event.target.value = "";


      if (!file) {

        return;

      }


      if (
        !file.type.startsWith(
          "image/"
        )
      ) {

        umiNotify(
          "Veuillez sélectionner une image."
        );

        return;

      }


      if (
        file.size >
        10 * 1024 * 1024
      ) {

        umiNotify(
          "La photo doit faire moins de 10 MB."
        );

        return;

      }


      setImageSearchLoading(
        true
      );


      const reader =
        new FileReader();


      reader.onloadend =
        async () => {

          try {

            const response =
              await fetch(
                "https://umi-server.onrender.com/search-machine-image",
                {
                  method:
                    "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body:
                    JSON.stringify({
                      image:
                        reader.result,
                    }),
                }
              );


            const data =
              await response.json();


            if (!response.ok) {

              console.error(
                "Erreur recherche photo :",
                data
              );


              await umiNotify(
                data?.message ||
                data?.error ||
                "Impossible d'analyser cette photo."
              );

              return;

            }


            let keywords = "";


            if (
              typeof data?.keywords ===
              "string"
            ) {

              keywords =
                data.keywords;

            }

            else if (
              Array.isArray(
                data?.keywords
              )
            ) {

              keywords =
                data.keywords.join(
                  " "
                );

            }

            else if (
              typeof data?.search ===
              "string"
            ) {

              keywords =
                data.search;

            }

            else if (
              typeof data?.result ===
              "string"
            ) {

              keywords =
                data.result;

            }

            else if (
              typeof data?.query ===
              "string"
            ) {

              keywords =
                data.query;

            }


            keywords =
              String(
                keywords || ""
              ).trim();


            if (keywords) {

              setSearch(
                keywords
              );

            } else {

              await umiNotify(
                "Aucun emballage n'a été reconnu sur cette photo."
              );

            }


          } catch (error) {

            console.error(
              "Erreur recherche photo :",
              error
            );


            await umiNotify(
              "Impossible d'effectuer la recherche par photo. Vérifiez votre connexion internet puis réessayez."
            );


          } finally {

            setImageSearchLoading(
              false
            );

          }

        };


      reader.onerror =
        () => {

          setImageSearchLoading(
            false
          );


          umiNotify(
            "Impossible de lire cette photo."
          );

        };


      reader.readAsDataURL(
        file
      );

    };


  /* =========================================
     OUVRIR RECHERCHE PHOTO
  ========================================= */

  const openImageSearch =
    () => {

      if (
        imageSearchLoading
      ) {

        return;

      }


      fileInputRef.current?.click();

    };


  /* =========================================
     EFFACER RECHERCHE
  ========================================= */

  const clearSearch =
    () => {

      setSearch("");

    };


  /* =========================================
     PHOTO PRINCIPALE
  ========================================= */

  const getMainImage =
    (product) => {

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


      return (
        product.imageUrl ||
        ""
      );

    };


  /* =========================================
     AFFICHAGE
  ========================================= */

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
            Emballages
          </h1>

        </div>


        <span>
          📦
        </span>

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="commerce-content">


        {/* =====================================
            RECHERCHE TEXTE + PHOTO
        ===================================== */}

        <div
          className="commerce-search"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >

          <span>
            🔍
          </span>


          <input
            type="text"
            placeholder="Rechercher un emballage..."
            value={search}
            onChange={(event) => {

              setSearch(
                event.target.value
              );

            }}
            style={{
              flex: 1,
              minWidth: 0,
            }}
          />


          {/* EFFACER */}

          {search && (

            <button
              type="button"
              onClick={
                clearSearch
              }
              aria-label="Effacer la recherche"
              style={{
                width: "30px",
                height: "30px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                border: "none",
                borderRadius: "50%",
                background: "#eef3f8",
                color: "#64748b",
                fontSize: "19px",
                cursor: "pointer",
              }}
            >
              ×
            </button>

          )}


          {/* RECHERCHE PHOTO */}

          <button
            type="button"
            onClick={
              openImageSearch
            }
            disabled={
              imageSearchLoading
            }
            aria-label="Rechercher par photo"
            title="Rechercher par photo"
            style={{
              width: "38px",
              height: "38px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              border: "none",
              borderRadius: "10px",
              background: "#eef6fd",
              fontSize: "19px",
              cursor:
                imageSearchLoading
                  ? "wait"
                  : "pointer",
              opacity:
                imageSearchLoading
                  ? 0.6
                  : 1,
            }}
          >

            {imageSearchLoading
              ? "..."
              : "📷"}

          </button>


          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={
              handleImageSearch
            }
            style={{
              display: "none",
            }}
          />

        </div>


        {/* =====================================
            ANALYSE PHOTO
        ===================================== */}

        {imageSearchLoading && (

          <div
            style={{
              margin:
                "-4px 0 12px",
              color:
                "#64748b",
              fontSize:
                "11px",
              textAlign:
                "center",
            }}
          >

            Analyse de la photo...

          </div>

        )}


        {/* =====================================
            PRODUITS
        ===================================== */}

        {loading ? (

          <div className="commerce-empty">

            Chargement...

          </div>

        ) : filteredProducts.length === 0 ? (

          <div className="commerce-empty">

            <div>

              {search
                ? "🔍"
                : "📦"}

            </div>


            <h3>

              {search
                ? "Aucun résultat"
                : "Aucun emballage disponible"}

            </h3>


            <p>

              {search
                ? `Aucun emballage ne correspond à « ${search} ».`
                : "Les emballages ajoutés par l'administration apparaîtront ici."}

            </p>


            {search && (

              <button
                type="button"
                onClick={
                  clearSearch
                }
                style={{
                  marginTop:
                    "12px",
                  padding:
                    "10px 16px",
                  border:
                    "none",
                  borderRadius:
                    "10px",
                  background:
                    "#123e69",
                  color:
                    "#ffffff",
                  fontFamily:
                    "inherit",
                  fontSize:
                    "11px",
                  fontWeight:
                    "700",
                  cursor:
                    "pointer",
                }}
              >

                Voir tous les emballages

              </button>

            )}

          </div>


        ) : (

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
                    onClick={() => {

                      onOpenProduct?.(
                        product
                      );

                    }}
                  >


                    {/* IMAGE */}

                    <div
                      className="commerce-card-image"
                      style={{
                        position:
                          "relative",
                      }}
                    >
<button
  type="button"
  className={`commerce-favorite-button ${
    isProductFavorite?.(
      product,
      "packaging"
    )
      ? "active"
      : ""
  }`}
  onClick={async (event) => {

    event.preventDefault();
    event.stopPropagation();

    await onToggleFavorite?.(
      product
    );
  }}
  aria-label={
    isProductFavorite?.(
      product,
      "packaging"
    )
      ? "Retirer des favoris"
      : "Ajouter aux favoris"
  }
>
  {isProductFavorite?.(
    product,
    "packaging"
  )
    ? "♥"
    : "♡"}
</button>

{mainImage ? (
                      

                        <img
                          src={
                            mainImage
                          }
                          alt={
                            product.name ||
                            "Emballage"
                          }
                        />

                      ) : (

                        <span>
                          📦
                        </span>

                      )}


                      {/* NOMBRE PHOTOS */}

                      {numberOfImages > 1 && (

                        <div
                          style={{
                            position:
                              "absolute",
                            left:
                              "8px",
                            bottom:
                              "8px",
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


                      {/* VIDÉO */}

                      {hasVideo && (

                        <div
                          style={{
                            position:
                              "absolute",
                            right:
                              "8px",
                            bottom:
                              "8px",
                            width:
                              "34px",
                            height:
                              "34px",
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


                    {/* INFORMATIONS */}

                    <div className="commerce-card-info">

                      <h3>

                        {product.name ||
                          "Sans nom"}

                      </h3>


                      {product.minimumQuantity && (

                        <p>

                          Minimum:{" "}
                          {
                            product.minimumQuantity
                          }

                        </p>

                      )}


                      {product.material && (

                        <p>

                          Matière:{" "}
                          {product.material}

                        </p>

                      )}


                      {product.size && (

                        <p>

                          Taille:{" "}
                          {product.size}

                        </p>

                      )}


                      <strong>
  {getProductPrice(product)}
</strong>


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


      {/* =====================================
          BARRE DES TÂCHES
      ===================================== */}

      <nav className="commerce-bottom-nav">


        {/* ACCUEIL */}

        <button
          type="button"
          className="commerce-bottom-nav-item"
          onClick={onHome}
        >

          <span className="commerce-bottom-nav-icon">
            🏠
          </span>

          <span>
            Accueil
          </span>

        </button>


        {/* MACHINES */}

        <button
          type="button"
          className="commerce-bottom-nav-item"
          onClick={onMachines}
        >

          <span className="commerce-bottom-nav-icon">
            ⚙️
          </span>

          <span>
            Machines
          </span>

        </button>


        {/* UMI LIVE */}

        <button
          type="button"
          className="commerce-bottom-nav-item"
          onClick={onLive}
        >

          <span
            className="
              commerce-bottom-nav-icon
              commerce-live-nav-icon
            "
          >
            ▶
          </span>

          <span>
            UMI LIVE
          </span>

        </button>


        {/* PANIER */}

        <button
          type="button"
          className="commerce-bottom-nav-item"
          onClick={onCart}
        >

          <span className="commerce-bottom-nav-icon">
            🛒
          </span>

          <span>
            Panier
          </span>

        </button>


        {/* COMPTE AVEC PHOTO */}

        <button
          type="button"
          className="commerce-bottom-nav-item"
          onClick={onAccount}
        >

          <span className="commerce-account-nav-photo-wrapper">

            {userPhoto ? (

              <img
                src={userPhoto}
                alt="Compte"
                className="commerce-account-nav-photo"
              />

            ) : (

              <span className="commerce-account-nav-placeholder">
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

  );

}


export default Packaging;