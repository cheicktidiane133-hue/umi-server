import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import React from "react";

import {
  collectionGroup,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";

import {
  db,
} from "./firebase";

import "./CommerceModule.css";


function AdminReviews({
  onBack,
}) {

  const [
    reviews,
    setReviews,
  ] = React.useState([]);


  const [
    loading,
    setLoading,
  ] = React.useState(true);


  const [
    loadError,
    setLoadError,
  ] = React.useState("");


  /* =========================================
     CHARGER TOUS LES AVIS

     machines/{id}/reviews
     rawMaterials/{id}/reviews
     packaging/{id}/reviews
  ========================================= */

  React.useEffect(() => {

    setLoading(true);

    setLoadError("");


    const reviewsQuery =
      collectionGroup(
        db,
        "reviews"
      );


    const unsubscribe =
      onSnapshot(

        reviewsQuery,

        (snapshot) => {

          const reviewsData =
            snapshot.docs.map(
              (reviewDoc) => {

                /*
                  Exemple :

                  machines/ABC/reviews/XYZ

                  reviewDoc.ref.parent
                  = reviews

                  reviewDoc.ref.parent.parent
                  = document ABC

                  .parent.id
                  = machines
                */

                const productRef =
                  reviewDoc.ref
                    .parent
                    .parent;


                const collectionName =
                  productRef
                    ?.parent
                    ?.id || "";


                const productId =
                  productRef?.id || "";


                /* ===============================
                   TYPE DU PRODUIT
                =============================== */

                let productType =
                  "machine";


                let productTypeLabel =
                  "Machine";


                if (
                  collectionName ===
                  "rawMaterials"
                ) {

                  productType =
                    "rawMaterial";

                  productTypeLabel =
                    "Matière première";

                } else if (
                  collectionName ===
                  "packaging"
                ) {

                  productType =
                    "packaging";

                  productTypeLabel =
                    "Emballage";

                }


                return {

                  id:
                    reviewDoc.id,

                  productId,

                  collectionName,

                  productType,

                  productTypeLabel,

                  ...reviewDoc.data(),

                };

              }
            );


          /* =====================================
             TRIER DU PLUS RÉCENT
          ===================================== */

          reviewsData.sort(
            (a, b) => {

              const dateA =
                a.createdAt
                  ?.toMillis?.() || 0;


              const dateB =
                b.createdAt
                  ?.toMillis?.() || 0;


              return (
                dateB -
                dateA
              );

            }
          );


          console.log(
            "Avis trouvés par Admin :",
            reviewsData.length,
            reviewsData
          );


          setReviews(
            reviewsData
          );


          setLoadError("");


          setLoading(false);

        },

        (error) => {

          console.error(
            "Erreur chargement avis admin :",
            error
          );


          setLoadError(
            error?.message ||
            "Impossible de charger les avis."
          );


          setLoading(false);

        }

      );


    return () => {

      unsubscribe();

    };

  }, []);


  /* =========================================
     SUPPRIMER UN AVIS
  ========================================= */

  const handleDeleteReview =
    async (review) => {

      const confirmation =
        await umiAsk(
          "Voulez-vous vraiment supprimer cet avis ?"
        );


      if (!confirmation) {

        return;

      }


      if (
        !review?.productId ||
        !review?.id ||
        !review?.collectionName
      ) {

        await umiNotify(
          "Impossible d'identifier cet avis."
        );

        return;

      }


      /*
        Sécurité supplémentaire :

        on autorise ici uniquement
        les trois collections prévues.
      */

      const allowedCollections = [
        "machines",
        "rawMaterials",
        "packaging",
      ];


      if (
        !allowedCollections.includes(
          review.collectionName
        )
      ) {

        console.error(
          "Collection d'avis inconnue :",
          review.collectionName
        );


        await umiNotify(
          "Impossible d'identifier le type de produit."
        );

        return;

      }


      try {

        await deleteDoc(
          doc(
            db,
            review.collectionName,
            review.productId,
            "reviews",
            review.id
          )
        );


        /*
          Pas besoin de setReviews ici.

          onSnapshot reçoit automatiquement
          la suppression et actualise la page.
        */


      } catch (error) {

        console.error(
          "Erreur suppression avis :",
          error
        );


        await umiNotify(
          "Impossible de supprimer cet avis."
        );

      }

    };


  /* =========================================
     AFFICHAGE
  ========================================= */

  return (

    <div className="commerce-page">


      {/* =====================================
          EN-TÊTE
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
            Avis clients
          </h1>

          <p>
            Gestion des commentaires clients
          </p>

        </div>


        <span>
          ⭐
        </span>

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="commerce-detail">


        {/* =====================================
            NOMBRE TOTAL D'AVIS
        ===================================== */}

        <h2
          style={{
            margin:
              "0 0 18px 0",

            color:
              "#173b5b",

            fontSize:
              "21px",
          }}
        >

          {reviews.length}

          {" "}

          avis

        </h2>


        {/* =====================================
            CHARGEMENT
        ===================================== */}

        {loading ? (

          <div
            style={{
              padding:
                "20px",

              textAlign:
                "center",

              color:
                "#64748b",
            }}
          >
            Chargement des avis...
          </div>

        ) : loadError ? (

          /* =====================================
              ERREUR FIREBASE
          ===================================== */

          <div
            style={{
              padding:
                "16px",

              marginBottom:
                "15px",

              border:
                "1px solid #fecaca",

              borderRadius:
                "12px",

              background:
                "#fff5f5",

              color:
                "#b91c1c",
            }}
          >

            <strong>
              Impossible de charger les avis.
            </strong>


            <div
              style={{
                marginTop:
                  "7px",

                fontSize:
                  "13px",

                lineHeight:
                  "1.5",
              }}
            >
              {loadError}
            </div>

          </div>

        ) : reviews.length === 0 ? (

          /* =====================================
              AUCUN AVIS
          ===================================== */

          <div
            style={{
              padding:
                "20px",

              border:
                "1px solid #e5e7eb",

              borderRadius:
                "12px",

              background:
                "#ffffff",

              textAlign:
                "center",

              color:
                "#64748b",
            }}
          >
            Aucun avis client.
          </div>

        ) : (

          /* =====================================
              LISTE DES AVIS
          ===================================== */

          reviews.map(
            (review) => {

              const rating =
                Number(
                  review.rating
                ) || 0;


              let reviewDate =
                "";


              try {

                if (
                  review.createdAt
                    ?.toDate
                ) {

                  reviewDate =
                    review.createdAt
                      .toDate()
                      .toLocaleDateString(
                        "fr-FR"
                      );

                }

              } catch {

                reviewDate =
                  "";

              }


              /* ===============================
                 ICÔNE DU TYPE
              =============================== */

              const typeIcon =
                review.productType ===
                "rawMaterial"
                  ? "🌾"
                  : review.productType ===
                    "packaging"
                    ? "📦"
                    : "⚙️";


              return (

                <article
                  key={
                    `${review.collectionName}-${review.productId}-${review.id}`
                  }

                  style={{
                    padding:
                      "16px",

                    marginBottom:
                      "14px",

                    border:
                      "1px solid #e5e7eb",

                    borderRadius:
                      "14px",

                    background:
                      "#ffffff",
                  }}
                >


                  {/* =====================================
                      TYPE DE PRODUIT
                  ===================================== */}

                  <div
                    style={{
                      display:
                        "inline-flex",

                      alignItems:
                        "center",

                      gap:
                        "6px",

                      marginBottom:
                        "10px",

                      padding:
                        "5px 9px",

                      borderRadius:
                        "20px",

                      background:
                        "#f1f5f9",

                      color:
                        "#475569",

                      fontSize:
                        "12px",

                      fontWeight:
                        "700",
                    }}
                  >

                    <span>
                      {typeIcon}
                    </span>


                    <span>
                      {review.productTypeLabel}
                    </span>

                  </div>


                  {/* =====================================
                      NOM DU PRODUIT
                  ===================================== */}

                  {review.productName && (

                    <div
                      style={{
                        marginBottom:
                          "10px",

                        color:
                          "#173b5b",

                        fontSize:
                          "13px",

                        fontWeight:
                          "700",
                      }}
                    >

                      {review.productName}

                    </div>

                  )}


                  {/* =====================================
                      CLIENT + CORBEILLE
                  ===================================== */}

                  <div
                    style={{
                      display:
                        "flex",

                      alignItems:
                        "flex-start",

                      justifyContent:
                        "space-between",

                      gap:
                        "12px",
                    }}
                  >


                    <div>

                      <strong
                        style={{
                          color:
                            "#173b5b",
                        }}
                      >

                        {review.userName ||
                          "Client UMI"}

                      </strong>


                      {reviewDate && (

                        <div
                          style={{
                            marginTop:
                              "3px",

                            color:
                              "#94a3b8",

                            fontSize:
                              "12px",
                          }}
                        >

                          {reviewDate}

                        </div>

                      )}

                    </div>


                    {/* =================================
                        PETITE CORBEILLE
                    ================================= */}

                    <button
                      type="button"

                      onClick={() =>
                        handleDeleteReview(
                          review
                        )
                      }

                      title="Supprimer cet avis"

                      aria-label="Supprimer cet avis"

                      style={{
                        width:
                          "34px",

                        height:
                          "34px",

                        padding:
                          "0",

                        border:
                          "1px solid #fecaca",

                        borderRadius:
                          "9px",

                        background:
                          "#fff5f5",

                        cursor:
                          "pointer",

                        fontSize:
                          "16px",

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "center",

                        flexShrink:
                          0,
                      }}
                    >
                      🗑️
                    </button>

                  </div>


                  {/* =====================================
                      ÉTOILES
                  ===================================== */}

                  <div
                    style={{
                      margin:
                        "9px 0",

                      fontSize:
                        "18px",

                      letterSpacing:
                        "2px",
                    }}
                  >

                    {[1, 2, 3, 4, 5].map(
                      (star) => (

                        <span
                          key={star}

                          style={{
                            color:
                              star <=
                              rating
                                ? "#f5a623"
                                : "#cbd5e1",
                          }}
                        >
                          ★
                        </span>

                      )
                    )}

                  </div>


                  {/* =====================================
                      COMMENTAIRE
                  ===================================== */}

                  {review.comment && (

                    <p
                      style={{
                        margin:
                          "0",

                        color:
                          "#475569",

                        lineHeight:
                          "1.55",

                        whiteSpace:
                          "pre-wrap",

                        overflowWrap:
                          "anywhere",
                      }}
                    >

                      {review.comment}

                    </p>

                  )}


                  {/* =====================================
                      PHOTO DU CLIENT
                  ===================================== */}

                  {review.photoUrl && (

                    <img
                      src={
                        review.photoUrl
                      }

                      alt="Photo de l'avis client"

                      loading="lazy"

                      style={{
                        width:
                          "100%",

                        maxWidth:
                          "220px",

                        maxHeight:
                          "220px",

                        marginTop:
                          "12px",

                        objectFit:
                          "cover",

                        borderRadius:
                          "12px",

                        display:
                          "block",

                        border:
                          "1px solid #e5e7eb",
                      }}
                    />

                  )}

                </article>

              );

            }
          )

        )}

      </main>

    </div>

  );

}


export default AdminReviews;