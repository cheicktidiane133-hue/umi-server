import { useState } from "react";

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

import "./AdminCommerce.css";


/* =========================================
   LISTE DES MATIÈRES PREMIÈRES
========================================= */

const RAW_MATERIAL_OPTIONS = [
  "Eau purifiée",
  "Eau déminéralisée",
  "Sucre",
  "Sel",
  "Huile végétale",
  "Huile de soja",
  "Huile de tournesol",
  "Vinaigre",
  "Concentré de fruits",
  "Purée de fruits",
  "Arômes alimentaires",
  "Colorants alimentaires",
  "Acide citrique",
  "Conservateurs alimentaires",
  "Émulsifiants",
  "Stabilisants alimentaires",
  "Amidon",
  "Œufs en poudre",
  "Lait en poudre",

  "Soude caustique",
  "Hypochlorite de sodium",
  "Carbonate de sodium",
  "Bicarbonate de sodium",
  "Silicate de sodium",
  "SLES",
  "LABSA",
  "Tensioactifs",
  "Parfum pour savon et détergent",
  "Colorant pour savon et détergent",
  "Glycérine",
  "Agents épaississants",
  "Agents moussants",
  "Agents désinfectants",
  "Peroxyde d’hydrogène",
  "Éthanol",
  "Acide chlorhydrique",

  "Résine PET",
  "Granulés PEHD",
  "Granulés PEBD",
  "Granulés PP",
  "Additifs pour plastique",
  "Pigments pour plastique",

  "Autre matière première",
];


/* =========================================
   COMPOSANT
========================================= */

function AdminRawMaterials({
  onBack,
  onOpenPublished,
}) {

  /* =========================================
     FORMULAIRE
  ========================================= */

  const [saving, setSaving] =
    useState(false);

  const [name, setName] =
    useState("");

  const [customName, setCustomName] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [price, setPrice] =
    useState("");

  const [unit, setUnit] =
    useState("");

  const [origin, setOrigin] =
    useState("");

  const [stock, setStock] =
    useState("");

  const [description, setDescription] =
    useState("");


  /* =========================================
     PHOTOS
  ========================================= */

  const [imageFiles, setImageFiles] =
    useState([]);

  const [
    imagePreviews,
    setImagePreviews,
  ] = useState([]);


  /* =========================================
     VIDÉO
  ========================================= */

  const [videoFile, setVideoFile] =
    useState(null);

  const [
    videoPreview,
    setVideoPreview,
  ] = useState("");


  /* =========================================
     CLOUDINARY
  ========================================= */

  const CLOUDINARY_CLOUD_NAME =
    "ytsurq7u";

  const CLOUDINARY_UPLOAD_PRESET =
    "umi_machines";


  /* =========================================
     CHOISIR LES PHOTOS
  ========================================= */

  const handleImagesChange = (
    event
  ) => {

    const selectedFiles =
      Array.from(
        event.target.files || []
      );

    if (
      selectedFiles.length === 0
    ) {
      return;
    }

    const validImages =
      selectedFiles.filter(
        (file) =>
          file.type.startsWith(
            "image/"
          )
      );

    if (
      validImages.length !==
      selectedFiles.length
    ) {

      alert(
        "Certains fichiers sélectionnés ne sont pas des images."
      );

    }

    const remainingPlaces =
      10 - imageFiles.length;

    if (
      remainingPlaces <= 0
    ) {

      alert(
        "Vous avez déjà ajouté 10 photos."
      );

      event.target.value = "";

      return;

    }

    const imagesToAdd =
      validImages.slice(
        0,
        remainingPlaces
      );

    if (
      validImages.length >
      remainingPlaces
    ) {

      alert(
        "Vous pouvez ajouter maximum 10 photos."
      );

    }

    const newPreviews =
      imagesToAdd.map(
        (file) =>
          URL.createObjectURL(
            file
          )
      );

    setImageFiles(
      (previous) => [
        ...previous,
        ...imagesToAdd,
      ]
    );

    setImagePreviews(
      (previous) => [
        ...previous,
        ...newPreviews,
      ]
    );

    event.target.value = "";

  };


  /* =========================================
     SUPPRIMER UNE PHOTO
  ========================================= */

  const removeImage = (
    index
  ) => {

    setImagePreviews(
      (previous) => {

        const preview =
          previous[index];

        if (preview) {

          URL.revokeObjectURL(
            preview
          );

        }

        return previous.filter(
          (_, currentIndex) =>
            currentIndex !== index
        );

      }
    );

    setImageFiles(
      (previous) =>
        previous.filter(
          (_, currentIndex) =>
            currentIndex !== index
        )
    );

  };


  /* =========================================
     CHOISIR UNE VIDÉO
  ========================================= */

  const handleVideoChange = (
    event
  ) => {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    console.log(
      "Vidéo sélectionnée :",
      {
        name: file.name,
        type: file.type,
        size: file.size,
      }
    );

    const fileName =
      (
        file.name || ""
      ).toLowerCase();

    const isVideo =
      file.type?.startsWith(
        "video/"
      ) ||
      fileName.endsWith(
        ".mp4"
      ) ||
      fileName.endsWith(
        ".mov"
      ) ||
      fileName.endsWith(
        ".m4v"
      ) ||
      fileName.endsWith(
        ".webm"
      ) ||
      fileName.endsWith(
        ".3gp"
      );

    if (!isVideo) {

      alert(
        "Le fichier sélectionné n'est pas une vidéo compatible."
      );

      event.target.value = "";

      return;

    }

    if (videoPreview) {

      URL.revokeObjectURL(
        videoPreview
      );

    }

    const preview =
      URL.createObjectURL(
        file
      );

    setVideoFile(
      file
    );

    setVideoPreview(
      preview
    );

  };


  /* =========================================
     SUPPRIMER LA VIDÉO
  ========================================= */

  const removeVideo = () => {

    if (videoPreview) {

      URL.revokeObjectURL(
        videoPreview
      );

    }

    setVideoFile(
      null
    );

    setVideoPreview(
      ""
    );

  };


  /* =========================================
     UPLOAD PHOTO CLOUDINARY
  ========================================= */

  const uploadImage = async (
    file
  ) => {

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    formData.append(
      "upload_preset",
      CLOUDINARY_UPLOAD_PRESET
    );

    const response =
      await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data?.error?.message ||
        "Erreur lors de l'envoi d'une photo."
      );

    }

    return (
      data.secure_url ||
      ""
    );

  };


  /* =========================================
     UPLOAD VIDÉO CLOUDINARY
  ========================================= */

  const uploadVideo = async (
    file
  ) => {

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    formData.append(
      "upload_preset",
      CLOUDINARY_UPLOAD_PRESET
    );

    const response =
      await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      console.error(
        "Erreur Cloudinary vidéo :",
        data
      );

      throw new Error(
        data?.error?.message ||
        "Erreur lors de l'envoi de la vidéo."
      );

    }

    return (
      data.secure_url ||
      ""
    );

  };


  /* =========================================
     VIDER LE FORMULAIRE
  ========================================= */

  const resetForm = () => {

    imagePreviews.forEach(
      (preview) => {

        URL.revokeObjectURL(
          preview
        );

      }
    );

    if (videoPreview) {

      URL.revokeObjectURL(
        videoPreview
      );

    }

    setName("");
    setCustomName("");
    setCategory("");
    setPrice("");
    setUnit("");
    setOrigin("");
    setStock("");
    setDescription("");

    setImageFiles([]);
    setImagePreviews([]);

    setVideoFile(null);
    setVideoPreview("");

  };


  /* =========================================
     PUBLIER
  ========================================= */

  const handleSubmit = async (
    event
  ) => {

    event.preventDefault();


    /* =====================================
       NOM FINAL
    ===================================== */

    const finalName =
      name ===
      "Autre matière première"
        ? customName.trim()
        : name.trim();


    if (!finalName) {

      alert(
        "Sélectionnez ou indiquez une matière première."
      );

      return;

    }


    if (
      imageFiles.length === 0
    ) {

      alert(
        "Ajoutez au moins une photo."
      );

      return;

    }


    if (
      imageFiles.length > 10
    ) {

      alert(
        "Vous pouvez ajouter maximum 10 photos."
      );

      return;

    }


    try {

      setSaving(
        true
      );


      /* =====================================
         ENVOYER LES PHOTOS
      ===================================== */

      const imageUrls =
        await Promise.all(

          imageFiles.map(
            (file) =>
              uploadImage(
                file
              )
          )

        );


      /* =====================================
         ENVOYER LA VIDÉO
      ===================================== */

      let videoUrl = "";

      if (videoFile) {

        videoUrl =
          await uploadVideo(
            videoFile
          );

      }


      /* =====================================
         DONNÉES FIRESTORE
      ===================================== */

      const productData = {

        name:
          finalName,

        category:
          category.trim(),

        price:
          price.trim(),

        unit:
          unit.trim(),

        origin:
          origin.trim(),

        stock:
          stock.trim(),

        description:
          description.trim(),


        /* PHOTO PRINCIPALE */

        imageUrl:
          imageUrls[0] || "",


        /* TOUTES LES PHOTOS */

        imageUrls,


        /* VIDÉO */

        videoUrl,


        /* TYPE */

        productType:
          "rawMaterial",


        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),

      };


      /* =====================================
         ENREGISTRER DANS FIRESTORE
      ===================================== */

      await addDoc(

        collection(
          db,
          "rawMaterials"
        ),

        productData

      );


      alert(
        "Matière première publiée avec succès."
      );

      resetForm();


    } catch (error) {

      console.error(
        "Erreur publication matière première :",
        error
      );

      alert(
        `Erreur : ${
          error?.message ||
          "Impossible de publier la matière première."
        }`
      );

    } finally {

      setSaving(
        false
      );

    }

  };


  /* =========================================
     AFFICHAGE
  ========================================= */

  return (

    <div className="admin-commerce-page">


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="admin-commerce-header">

        <button
          type="button"
          onClick={
            onBack
          }
          className="admin-commerce-back"
        >
          ←
        </button>


        <div>

          <h1>
            Matières premières
          </h1>

          <p>
            Administration UMI
          </p>

        </div>


        <span className="admin-commerce-header-icon">
          🧪
        </span>

      </header>


      <main className="admin-commerce-content">


        {/* =====================================
            GÉRER LES PUBLICATIONS
        ===================================== */}

        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >

          <button
            type="button"
            className="admin-commerce-save"
            onClick={
              onOpenPublished
            }
            style={{
              width: "100%",
              maxWidth: "520px",
            }}
          >
            📋 Gérer les matières publiées
          </button>

        </div>


        {/* =====================================
            FORMULAIRE
        ===================================== */}

        <section className="admin-commerce-form-card">


          <div className="admin-commerce-title-row">

            <div>

              <span>
                NOUVEAU PRODUIT
              </span>

              <h2>
                Ajouter une matière première
              </h2>

            </div>

          </div>


          <form
            className="admin-commerce-form"
            onSubmit={
              handleSubmit
            }
          >


            {/* =================================
                MATIÈRE PREMIÈRE
            ================================= */}

            <label>

              Matière première *

              <select
                value={
                  name
                }
                onChange={(
                  event
                ) => {

                  const value =
                    event.target.value;

                  setName(
                    value
                  );

                  if (
                    value !==
                    "Autre matière première"
                  ) {

                    setCustomName(
                      ""
                    );

                  }

                }}
                required
              >

                <option value="">
                  -- Sélectionner une matière première --
                </option>


                {RAW_MATERIAL_OPTIONS.map(
                  (material) => (

                    <option
                      key={
                        material
                      }
                      value={
                        material
                      }
                    >
                      {material}
                    </option>

                  )
                )}

              </select>

            </label>


            {/* =================================
                AUTRE MATIÈRE
            ================================= */}

            {name ===
              "Autre matière première" && (

              <label>

                Nom de la matière première *

                <input
                  type="text"
                  value={
                    customName
                  }
                  onChange={(
                    event
                  ) =>
                    setCustomName(
                      event.target.value
                    )
                  }
                  placeholder="Écrivez le nom de la matière première"
                  required
                />

              </label>

            )}


            {/* =================================
                CATÉGORIE
            ================================= */}

            <label>

              Catégorie

              <input
                type="text"
                value={
                  category
                }
                onChange={(
                  event
                ) =>
                  setCategory(
                    event.target.value
                  )
                }
                placeholder="Ex : Savon, boisson, détergent..."
              />

            </label>


            {/* =================================
                PHOTOS
            ================================= */}

            <div>

              <strong>
                Photos
              </strong>

              <p>
                Ajoutez jusqu'à 10 photos
                du produit.
              </p>


              <label className="admin-image-picker">

                <input
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                  multiple
                  onChange={
                    handleImagesChange
                  }
                />


                <div>

                  <span>
                    📷
                  </span>

                  <strong>
                    Ajouter des photos
                  </strong>

                  <small>
                    {imageFiles.length}/10 photos
                  </small>

                </div>

              </label>


              {/* APERÇU PHOTOS */}

              {imagePreviews.length >
                0 && (

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: "10px",
                    marginTop: "15px",
                  }}
                >

                  {imagePreviews.map(
                    (
                      preview,
                      index
                    ) => (

                      <div
                        key={`${preview}-${index}`}
                        style={{
                          position:
                            "relative",
                        }}
                      >

                        <img
                          src={
                            preview
                          }
                          alt={`Photo ${index + 1}`}
                          style={{
                            display:
                              "block",
                            width:
                              "100%",
                            height:
                              "150px",
                            objectFit:
                              "cover",
                            borderRadius:
                              "12px",
                          }}
                        />


                        <button
                          type="button"
                          onClick={() =>
                            removeImage(
                              index
                            )
                          }
                          aria-label="Supprimer la photo"
                          style={{
                            position:
                              "absolute",
                            top: "6px",
                            right: "6px",
                            width: "34px",
                            height: "34px",
                            border:
                              "none",
                            borderRadius:
                              "50%",
                            background:
                              "#dc2626",
                            color:
                              "#ffffff",
                            fontSize:
                              "20px",
                            fontWeight:
                              "700",
                            cursor:
                              "pointer",
                          }}
                        >
                          ×
                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>


            {/* =================================
                VIDÉO
            ================================= */}

            <div
              style={{
                marginTop: "20px",
              }}
            >

              <strong>
                Vidéo
              </strong>

              <p>
                Ajoutez une vidéo du produit.
              </p>


              {!videoPreview ? (

                <label className="admin-image-picker">

                  <input
                    type="file"
                    accept="video/*,video/mp4,video/quicktime,video/x-m4v,video/webm,video/3gpp,.mp4,.mov,.m4v,.webm,.3gp"
                    onChange={
                      handleVideoChange
                    }
                  />


                  <div>

                    <span>
                      🎥
                    </span>

                    <strong>
                      Ajouter une vidéo
                    </strong>

                    <small>
                      MP4, MOV, M4V, WebM
                    </small>

                  </div>

                </label>

              ) : (

                <div
                  style={{
                    position:
                      "relative",
                    marginTop:
                      "10px",
                  }}
                >

                  <video
                    src={
                      videoPreview
                    }
                    controls
                    playsInline
                    preload="metadata"
                    style={{
                      display:
                        "block",
                      width:
                        "100%",
                      maxHeight:
                        "400px",
                      borderRadius:
                        "14px",
                      background:
                        "#000000",
                    }}
                  />


                  <button
                    type="button"
                    onClick={
                      removeVideo
                    }
                    aria-label="Supprimer la vidéo"
                    style={{
                      position:
                        "absolute",
                      top: "8px",
                      right: "8px",
                      width: "38px",
                      height: "38px",
                      border: "none",
                      borderRadius:
                        "50%",
                      background:
                        "#dc2626",
                      color:
                        "#ffffff",
                      fontSize:
                        "22px",
                      fontWeight:
                        "700",
                      cursor:
                        "pointer",
                    }}
                  >
                    ×
                  </button>

                </div>

              )}

            </div>


            {/* =================================
                PRIX + UNITÉ
            ================================= */}

            <div className="admin-commerce-two-columns">

              <label>

                Prix

                <input
                  type="text"
                  value={
                    price
                  }
                  onChange={(
                    event
                  ) =>
                    setPrice(
                      event.target.value
                    )
                  }
                  placeholder="Ex : 25 000 FCFA"
                />

              </label>


              <label>

                Unité

                <input
                  type="text"
                  value={
                    unit
                  }
                  onChange={(
                    event
                  ) =>
                    setUnit(
                      event.target.value
                    )
                  }
                  placeholder="kg, tonne, litre..."
                />

              </label>

            </div>


            {/* =================================
                ORIGINE + STOCK
            ================================= */}

            <div className="admin-commerce-two-columns">

              <label>

                Origine

                <input
                  type="text"
                  value={
                    origin
                  }
                  onChange={(
                    event
                  ) =>
                    setOrigin(
                      event.target.value
                    )
                  }
                  placeholder="Pays / région"
                />

              </label>


              <label>

                Stock disponible

                <input
                  type="text"
                  value={
                    stock
                  }
                  onChange={(
                    event
                  ) =>
                    setStock(
                      event.target.value
                    )
                  }
                  placeholder="Ex : 500 kg"
                />

              </label>

            </div>


            {/* =================================
                DESCRIPTION
            ================================= */}

            <label>

              Description

              <textarea
                rows="6"
                value={
                  description
                }
                onChange={(
                  event
                ) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Décrivez la matière première, sa qualité et son utilisation..."
              />

            </label>


            {/* =================================
                PUBLIER
            ================================= */}

            <button
              type="submit"
              className="admin-commerce-save"
              disabled={
                saving
              }
            >

              {saving
                ? "Envoi des fichiers et publication..."
                : "＋ Publier la matière première"}

            </button>


          </form>

        </section>

      </main>

    </div>

  );

}


export default AdminRawMaterials;