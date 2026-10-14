import {
  useEffect,
  useState,
} from "react";

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import {
  auth,
  db,
} from "./firebase";

import "./ProductDetail.css";


function ProductReviews({
  product,
  onBack,
}) {

  /* =========================================
     AVIS
  ========================================= */

  const [
    reviews,
    setReviews,
  ] = useState([]);


  const [
    reviewRating,
    setReviewRating,
  ] = useState(5);


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
    isSubmittingReview,
    setIsSubmittingReview,
  ] = useState(false);


  const [
    reviewMessage,
    setReviewMessage,
  ] = useState("");


  /* =========================================
     TYPE DE PRODUIT
  ========================================= */

  const productType =
    product?.productType ||
    "machine";


  /* =========================================
     COLLECTION FIRESTORE
  ========================================= */

  const productCollection =
    productType === "rawMaterial"
      ? "rawMaterials"
      : productType === "packaging"
        ? "packaging"
        : "machines";


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
        productCollection,
        product.id,
        "reviews"
      );


    /*
      On garde le même principe que les avis
      machines : les plus récents en premier.
    */

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
              (reviewDocument) => ({

                id:
                  reviewDocument.id,

                ...reviewDocument.data(),

              })
            );


          setReviews(
            reviewsData
          );

        },

        (error) => {

          console.error(
            "Erreur chargement avis :",
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
     APERÇU PHOTO
  ========================================= */

  useEffect(() => {

    return () => {

      if (
        reviewPhotoPreview &&
        reviewPhotoPreview.startsWith(
          "blob:"
        )
      ) {

        URL.revokeObjectURL(
          reviewPhotoPreview
        );

      }

    };

  }, [reviewPhotoPreview]);


  /* =========================================
     CLOUDINARY
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


  /* =========================================
     SÉLECTIONNER UNE PHOTO
  ========================================= */

  const handleReviewPhotoChange =
    (event) => {

      const file =
        event.target.files?.[0];


      if (!file) {

        return;

      }


      if (
        !file.type.startsWith(
          "image/"
        )
      ) {

        setReviewMessage(
          "Veuillez sélectionner une image."
        );

        event.target.value = "";

        return;

      }


      /*
        Limite raisonnable avant l'envoi
        vers Cloudinary.
      */

      if (
        file.size >
        10 * 1024 * 1024
      ) {

        setReviewMessage(
          "La photo est trop lourde. Maximum 10 Mo."
        );

        event.target.value = "";

        return;

      }


      if (
        reviewPhotoPreview &&
        reviewPhotoPreview.startsWith(
          "blob:"
        )
      ) {

        URL.revokeObjectURL(
          reviewPhotoPreview
        );

      }


      const preview =
        URL.createObjectURL(
          file
        );


      setReviewPhoto(
        file
      );


      setReviewPhotoPreview(
        preview
      );


      setReviewMessage("");

    };


  /* =========================================
     RETIRER LA PHOTO
  ========================================= */

  const handleRemoveReviewPhoto =
    () => {

      if (
        reviewPhotoPreview &&
        reviewPhotoPreview.startsWith(
          "blob:"
        )
      ) {

        URL.revokeObjectURL(
          reviewPhotoPreview
        );

      }


      setReviewPhoto(
        null
      );


      setReviewPhotoPreview(
        ""
      );

    };


  /* =========================================
     PUBLIER UN AVIS
  ========================================= */

  const handleSubmitReview =
    async (event) => {

      event?.preventDefault?.();


      if (
        isSubmittingReview
      ) {

        return;

      }


      setReviewMessage("");


      const user =
        auth.currentUser;


      if (!user) {

        setReviewMessage(
          "Connectez-vous pour publier un avis."
        );

        return;

      }


      if (
        reviewRating < 1 ||
        reviewRating > 5
      ) {

        setReviewMessage(
          "Choisissez une note de 1 à 5 étoiles."
        );

        return;

      }


      const cleanComment =
        reviewComment.trim();


      if (!cleanComment) {

        setReviewMessage(
          "Écrivez votre commentaire."
        );

        return;

      }


      if (!product?.id) {

        setReviewMessage(
          "Impossible d'identifier ce produit."
        );

        return;

      }


      try {

        setIsSubmittingReview(
          true
        );


        /* =====================================
           PHOTO FACULTATIVE
        ===================================== */

        let photoUrl = "";


        if (reviewPhoto) {

          photoUrl =
            await uploadToCloudinary(
              reviewPhoto,
              "image"
            );

        }


        /* =====================================
           NOM DU CLIENT
        ===================================== */

        let userName =
          user.displayName ||
          "";


        try {

          const savedUser =
            JSON.parse(
              localStorage.getItem(
                "umiCurrentUser"
              ) || "null"
            );


          userName =
            userName ||
            savedUser?.displayName ||
            savedUser?.name ||
            savedUser?.prenom ||
            savedUser?.email ||
            user.email ||
            "Client UMI";

        } catch {

          userName =
            userName ||
            user.email ||
            "Client UMI";

        }


        /* =====================================
           COLLECTION CORRECTE

           machines/{id}/reviews
           rawMaterials/{id}/reviews
           packaging/{id}/reviews
        ===================================== */

        const reviewsRef =
          collection(
            db,
            productCollection,
            product.id,
            "reviews"
          );


        await addDoc(
          reviewsRef,
          {

            userId:
              user.uid,

            userName,

            rating:
              reviewRating,

            comment:
              cleanComment,

            photoUrl,

            productType,

            productName:
              product.name || "",

            createdAt:
              serverTimestamp(),

          }
        );


        /* =====================================
           RÉINITIALISER LE FORMULAIRE
        ===================================== */

        if (
          reviewPhotoPreview &&
          reviewPhotoPreview.startsWith(
            "blob:"
          )
        ) {

          URL.revokeObjectURL(
            reviewPhotoPreview
          );

        }


        setReviewRating(5);

        setReviewComment("");

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

        setIsSubmittingReview(
          false
        );

      }

    };


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
          ) /
          reviews.length
        )
      : 0;


  /* =========================================
     TITRE SELON LE PRODUIT
  ========================================= */

  const productTypeLabel =
    productType === "rawMaterial"
      ? "Matière première"
      : productType === "packaging"
        ? "Emballage"
        : "Machine";


  return (

    <div className="product-detail-page">


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",

          padding:
            "14px 16px",

          borderBottom:
            "1px solid #e5e7eb",

          background:
            "#ffffff",

          position:
            "sticky",

          top: 0,

          zIndex: 30,
        }}
      >

        <button
          type="button"
          onClick={onBack}

          aria-label="Retour"

          style={{
            width: "40px",
            height: "40px",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            padding: 0,

            border:
              "1px solid #e5e7eb",

            borderRadius:
              "50%",

            background:
              "#ffffff",

            color:
              "#173b5b",

            fontSize:
              "22px",

            cursor:
              "pointer",

            flexShrink: 0,
          }}
        >
          ←
        </button>


        <div
          style={{
            minWidth: 0,
            flex: 1,
          }}
        >

          <h1
            style={{
              margin: 0,

              color:
                "#173b5b",

              fontSize:
                "19px",

              lineHeight:
                "1.2",
            }}
          >
            Avis clients
          </h1>


          <p
            style={{
              margin:
                "3px 0 0 0",

              color:
                "#64748b",

              fontSize:
                "12px",

              overflow:
                "hidden",

              textOverflow:
                "ellipsis",

              whiteSpace:
                "nowrap",
            }}
          >

            {product?.name ||
              productTypeLabel}

          </p>

        </div>


        <span
          style={{
            fontSize:
              "23px",
          }}
        >
          ⭐
        </span>

      </header>
            {/* =====================================
          CONTENU
      ===================================== */}

      <main
        style={{
          padding: "16px",
          paddingBottom: "40px",
        }}
      >


        {/* =====================================
            RÉSUMÉ DES AVIS
        ===================================== */}

        <section
          style={{
            padding: "16px",
            marginBottom: "18px",

            border:
              "1px solid #e5e7eb",

            borderRadius:
              "14px",

            background:
              "#ffffff",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
            }}
          >

            <div>

              <strong
                style={{
                  display: "block",
                  color: "#173b5b",
                  fontSize: "28px",
                  lineHeight: "1",
                }}
              >
                {reviews.length > 0
                  ? averageRating.toFixed(1)
                  : "0.0"}
              </strong>

              <span
                style={{
                  display: "block",
                  marginTop: "5px",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                sur 5
              </span>

            </div>


            <div
              style={{
                flex: 1,
                textAlign: "right",
              }}
            >

              <div
                style={{
                  color: "#f5a623",
                  fontSize: "22px",
                  letterSpacing: "2px",
                }}
              >

                {[1, 2, 3, 4, 5].map(
                  (star) => (

                    <span
                      key={star}

                      style={{
                        color:
                          star <=
                          Math.round(
                            averageRating
                          )
                            ? "#f5a623"
                            : "#cbd5e1",
                      }}
                    >
                      ★
                    </span>

                  )
                )}

              </div>


              <div
                style={{
                  marginTop: "5px",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >

                {reviews.length}

                {" "}

                {reviews.length <= 1
                  ? "avis"
                  : "avis"}

              </div>

            </div>

          </div>

        </section>


        {/* =====================================
            DONNER VOTRE AVIS
        ===================================== */}

        <section
          style={{
            padding: "16px",
            marginBottom: "22px",

            border:
              "1px solid #e5e7eb",

            borderRadius:
              "14px",

            background:
              "#ffffff",
          }}
        >

          <h2
            style={{
              margin:
                "0 0 5px 0",

              color:
                "#173b5b",

              fontSize:
                "18px",
            }}
          >
            Donner votre avis
          </h2>


          <p
            style={{
              margin:
                "0 0 16px 0",

              color:
                "#64748b",

              fontSize:
                "13px",

              lineHeight:
                "1.45",
            }}
          >
            Partagez votre expérience avec ce produit.
          </p>


          <form
            onSubmit={
              handleSubmitReview
            }
          >


            {/* =================================
                NOTE
            ================================= */}

            <div
              style={{
                marginBottom:
                  "16px",
              }}
            >

              <strong
                style={{
                  display:
                    "block",

                  marginBottom:
                    "8px",

                  color:
                    "#334155",

                  fontSize:
                    "14px",
                }}
              >
                Votre note
              </strong>


              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                }}
              >

                {[1, 2, 3, 4, 5].map(
                  (star) => (

                    <button
                      key={star}

                      type="button"

                      onClick={() =>
                        setReviewRating(
                          star
                        )
                      }

                      aria-label={
                        `${star} étoile${
                          star > 1
                            ? "s"
                            : ""
                        }`
                      }

                      style={{
                        padding: 0,
                        border: "none",
                        background:
                          "transparent",

                        color:
                          star <=
                          reviewRating
                            ? "#f5a623"
                            : "#cbd5e1",

                        fontSize:
                          "32px",

                        lineHeight:
                          "1",

                        cursor:
                          "pointer",
                      }}
                    >
                      ★
                    </button>

                  )
                )}

              </div>

            </div>


            {/* =================================
                COMMENTAIRE
            ================================= */}

            <div
              style={{
                marginBottom:
                  "14px",
              }}
            >

              <label
                htmlFor="review-comment"

                style={{
                  display:
                    "block",

                  marginBottom:
                    "7px",

                  color:
                    "#334155",

                  fontSize:
                    "14px",

                  fontWeight:
                    "700",
                }}
              >
                Votre commentaire
              </label>


              <textarea
                id="review-comment"

                value={
                  reviewComment
                }

                onChange={(event) =>
                  setReviewComment(
                    event.target.value
                  )
                }

                placeholder="Écrivez votre avis..."

                rows={5}

                maxLength={1000}

                disabled={
                  isSubmittingReview
                }

                style={{
                  width: "100%",
                  boxSizing:
                    "border-box",

                  padding:
                    "12px",

                  border:
                    "1px solid #d8e2ea",

                  borderRadius:
                    "10px",

                  background:
                    "#ffffff",

                  color:
                    "#1e293b",

                  fontFamily:
                    "inherit",

                  fontSize:
                    "14px",

                  lineHeight:
                    "1.5",

                  resize:
                    "vertical",

                  outline:
                    "none",
                }}
              />


              <div
                style={{
                  marginTop:
                    "4px",

                  textAlign:
                    "right",

                  color:
                    "#94a3b8",

                  fontSize:
                    "11px",
                }}
              >
                {reviewComment.length}
                {" / 1000"}
              </div>

            </div>


            {/* =================================
                AJOUTER UNE PHOTO
            ================================= */}

            <div
              style={{
                marginBottom:
                  "16px",
              }}
            >

              <strong
                style={{
                  display:
                    "block",

                  marginBottom:
                    "7px",

                  color:
                    "#334155",

                  fontSize:
                    "14px",
                }}
              >
                Photo
                {" "}
                <span
                  style={{
                    color:
                      "#94a3b8",

                    fontWeight:
                      "400",
                  }}
                >
                  (facultatif)
                </span>
              </strong>


              <label
                style={{
                  minHeight:
                    "46px",

                  padding:
                    "0 14px",

                  display:
                    "inline-flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  gap:
                    "8px",

                  border:
                    "1px solid #d8e2ea",

                  borderRadius:
                    "10px",

                  background:
                    "#f8fafc",

                  color:
                    "#173b5b",

                  fontSize:
                    "14px",

                  fontWeight:
                    "700",

                  cursor:
                    isSubmittingReview
                      ? "default"
                      : "pointer",

                  opacity:
                    isSubmittingReview
                      ? 0.65
                      : 1,
                }}
              >

                📷 Ajouter une photo


                <input
                  type="file"

                  accept="image/*"

                  onChange={
                    handleReviewPhotoChange
                  }

                  disabled={
                    isSubmittingReview
                  }

                  style={{
                    display:
                      "none",
                  }}
                />

              </label>

            </div>


            {/* =================================
                APERÇU DE LA PHOTO
            ================================= */}

            {reviewPhotoPreview && (

              <div
                style={{
                  position:
                    "relative",

                  width:
                    "fit-content",

                  maxWidth:
                    "100%",

                  marginBottom:
                    "16px",
                }}
              >

                <img
                  src={
                    reviewPhotoPreview
                  }

                  alt="Aperçu"

                  style={{
                    width:
                      "180px",

                    maxWidth:
                      "100%",

                    height:
                      "180px",

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


                <button
                  type="button"

                  onClick={
                    handleRemoveReviewPhoto
                  }

                  disabled={
                    isSubmittingReview
                  }

                  aria-label="Retirer la photo"

                  title="Retirer la photo"

                  style={{
                    position:
                      "absolute",

                    top:
                      "7px",

                    right:
                      "7px",

                    width:
                      "32px",

                    height:
                      "32px",

                    padding:
                      "0",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    border:
                      "none",

                    borderRadius:
                      "50%",

                    background:
                      "rgba(0,0,0,0.70)",

                    color:
                      "#ffffff",

                    fontSize:
                      "18px",

                    cursor:
                      "pointer",
                  }}
                >
                  ×
                </button>

              </div>

            )}


            {/* =================================
                MESSAGE
            ================================= */}

            {reviewMessage && (

              <div
                style={{
                  marginBottom:
                    "12px",

                  padding:
                    "10px 12px",

                  borderRadius:
                    "9px",

                  background:
                    reviewMessage ===
                    "Votre avis a été publié."
                      ? "#ecfdf5"
                      : "#f8fafc",

                  color:
                    reviewMessage ===
                    "Votre avis a été publié."
                      ? "#047857"
                      : "#475569",

                  fontSize:
                    "13px",

                  lineHeight:
                    "1.4",
                }}
              >
                {reviewMessage}
              </div>

            )}


            {/* =================================
                PUBLIER
            ================================= */}

            <button
              type="submit"

              disabled={
                isSubmittingReview
              }

              style={{
                width:
                  "100%",

                minHeight:
                  "48px",

                padding:
                  "12px 16px",

                border:
                  "none",

                borderRadius:
                  "10px",

                background:
                  "#087fc1",

                color:
                  "#ffffff",

                fontSize:
                  "15px",

                fontWeight:
                  "700",

                cursor:
                  isSubmittingReview
                    ? "default"
                    : "pointer",

                opacity:
                  isSubmittingReview
                    ? 0.65
                    : 1,
              }}
            >

              {isSubmittingReview
                ? "Publication..."
                : "Publier mon avis"}

            </button>

          </form>

        </section>


        {/* =====================================
            LISTE DES AVIS
        ===================================== */}

        <section>

          <h2
            style={{
              margin:
                "0 0 14px 0",

              color:
                "#173b5b",

              fontSize:
                "18px",
            }}
          >

            Avis clients

            {" "}

            <span
              style={{
                color:
                  "#64748b",

                fontSize:
                  "14px",

                fontWeight:
                  "600",
              }}
            >
              ({reviews.length})
            </span>

          </h2>


          {reviews.length === 0 ? (

            <div
              style={{
                padding:
                  "20px 16px",

                border:
                  "1px solid #e5e7eb",

                borderRadius:
                  "12px",

                background:
                  "#ffffff",

                color:
                  "#64748b",

                textAlign:
                  "center",

                fontSize:
                  "14px",
              }}
            >
              Aucun avis pour le moment.
            </div>

          ) : (

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


                return (

                  <article
                    key={
                      review.id
                    }

                    style={{
                      padding:
                        "16px",

                      marginBottom:
                        "12px",

                      border:
                        "1px solid #e5e7eb",

                      borderRadius:
                        "14px",

                      background:
                        "#ffffff",
                    }}
                  >


                    {/* NOM + DATE */}

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

                        marginBottom:
                          "7px",
                      }}
                    >

                      <strong
                        style={{
                          color:
                            "#173b5b",

                          fontSize:
                            "14px",
                        }}
                      >
                        {review.userName ||
                          "Client UMI"}
                      </strong>


                      {reviewDate && (

                        <span
                          style={{
                            color:
                              "#94a3b8",

                            fontSize:
                              "11px",

                            flexShrink:
                              0,
                          }}
                        >
                          {reviewDate}
                        </span>

                      )}

                    </div>


                    {/* ÉTOILES */}

                    <div
                      style={{
                        marginBottom:
                          "9px",

                        color:
                          "#f5a623",

                        fontSize:
                          "17px",

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


                    {/* COMMENTAIRE */}

                    {review.comment && (

                      <p
                        style={{
                          margin:
                            "0",

                          color:
                            "#475569",

                          fontSize:
                            "14px",

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


                    {/* PHOTO DE L'AVIS */}

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
                            "260px",

                          maxHeight:
                            "300px",

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

        </section>


      </main>

    </div>

  );

}


export default ProductReviews;