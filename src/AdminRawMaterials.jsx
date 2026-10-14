import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import { useEffect, useState } from "react";

import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

import "./AdminCommerce.css";


function AdminRawMaterials({
  onBack,
  onOpenPublished,
  product = null,
}) {

  /* =========================================
     MODE AJOUT / MODIFICATION
  ========================================= */

  const isEditing = Boolean(product?.id);


  /* =========================================
     FORMULAIRE
  ========================================= */

  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [origin, setOrigin] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");


  /* =========================================
     PHOTOS
  ========================================= */

  const [imageFiles, setImageFiles] =
    useState([]);

  const [imagePreviews, setImagePreviews] =
    useState([]);

  const [
    existingImageUrls,
    setExistingImageUrls,
  ] = useState([]);


  /* =========================================
     VIDÉO
  ========================================= */

  const [videoFile, setVideoFile] =
    useState(null);

  const [videoPreview, setVideoPreview] =
    useState("");

  const [
    existingVideoUrl,
    setExistingVideoUrl,
  ] = useState("");


  /* =========================================
     CLOUDINARY
  ========================================= */

  const CLOUDINARY_CLOUD_NAME =
    "ytsurq7u";

  const CLOUDINARY_UPLOAD_PRESET =
    "umi_machines";


  /* =========================================
     CHARGER LE PRODUIT À MODIFIER
  ========================================= */

  useEffect(() => {

    /*
      MODE AJOUT
    */

    if (!product?.id) {

      setName("");
      setCategory("");
      setPrice("");
      setUnit("");
      setOrigin("");
      setStock("");
      setDescription("");

      setExistingImageUrls([]);
      setExistingVideoUrl("");

      setImageFiles([]);
      setImagePreviews([]);

      setVideoFile(null);
      setVideoPreview("");

      return;
    }


    /*
      MODE MODIFICATION
      Remplir automatiquement
      les anciennes informations.
    */

    setName(
      String(product.name ?? "")
    );

    setCategory(
      String(product.category ?? "")
    );

    setPrice(
      String(product.price ?? "")
    );

    setUnit(
      String(product.unit ?? "")
    );

    setOrigin(
      String(product.origin ?? "")
    );

    setStock(
      String(product.stock ?? "")
    );

    setDescription(
      String(product.description ?? "")
    );


    /*
      ANCIENNES PHOTOS
    */

    if (
      Array.isArray(product.imageUrls) &&
      product.imageUrls.length > 0
    ) {

      setExistingImageUrls(
        product.imageUrls.filter(Boolean)
      );

    } else if (product.imageUrl) {

      setExistingImageUrls([
        product.imageUrl,
      ]);

    } else {

      setExistingImageUrls([]);

    }


    /*
      ANCIENNE VIDÉO
    */

    setExistingVideoUrl(
      product.videoUrl || ""
    );


    /*
      VIDER SEULEMENT LES NOUVEAUX
      FICHIERS LOCAUX
    */

    setImageFiles([]);
    setImagePreviews([]);

    setVideoFile(null);
    setVideoPreview("");

  }, [product]);


  /* =========================================
     CHOISIR LES PHOTOS
  ========================================= */

  const handleImagesChange = (event) => {

    const selectedFiles =
      Array.from(
        event.target.files || []
      );


    if (selectedFiles.length === 0) {
      return;
    }


    const validImages =
      selectedFiles.filter(
        (file) =>
          file.type.startsWith("image/")
      );


    if (
      validImages.length !==
      selectedFiles.length
    ) {

      umiNotify(
        "Certains fichiers sélectionnés ne sont pas des images."
      );

    }


    const currentTotal =
      existingImageUrls.length +
      imageFiles.length;


    const remainingPlaces =
      10 - currentTotal;


    if (remainingPlaces <= 0) {

      umiNotify(
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

      umiNotify(
        "Vous pouvez ajouter maximum 10 photos."
      );

    }


    const newPreviews =
      imagesToAdd.map(
        (file) =>
          URL.createObjectURL(file)
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
     SUPPRIMER UNE NOUVELLE PHOTO
  ========================================= */

  const removeImage = (index) => {

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
     SUPPRIMER UNE ANCIENNE PHOTO
  ========================================= */

  const removeExistingImage = (index) => {

    setExistingImageUrls(
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

  const handleVideoChange = (event) => {

    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    const fileName =
      (file.name || "")
        .toLowerCase();


    const isVideo =
      file.type?.startsWith("video/") ||
      fileName.endsWith(".mp4") ||
      fileName.endsWith(".mov") ||
      fileName.endsWith(".m4v") ||
      fileName.endsWith(".webm") ||
      fileName.endsWith(".3gp");


    if (!isVideo) {

      umiNotify(
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
      URL.createObjectURL(file);


    setVideoFile(file);
    setVideoPreview(preview);

    event.target.value = "";

  };


  /* =========================================
     SUPPRIMER LA NOUVELLE VIDÉO
  ========================================= */

  const removeVideo = () => {

    if (videoPreview) {

      URL.revokeObjectURL(
        videoPreview
      );

    }


    setVideoFile(null);
    setVideoPreview("");

  };


  /* =========================================
     SUPPRIMER L'ANCIENNE VIDÉO
  ========================================= */

  const removeExistingVideo = () => {

    setExistingVideoUrl("");

  };
    /* =========================================
     UPLOAD PHOTO CLOUDINARY
  ========================================= */

  const uploadImage = async (file) => {

    const formData = new FormData();

    formData.append(
      "file",
      file
    );

    formData.append(
      "upload_preset",
      CLOUDINARY_UPLOAD_PRESET
    );


    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );


    const data =
      await response.json();


    if (!response.ok) {

      console.error(
        "Erreur Cloudinary photo :",
        data
      );

      throw new Error(
        data?.error?.message ||
        "Erreur lors de l'envoi d'une photo."
      );

    }


    return data.secure_url || "";

  };


  /* =========================================
     UPLOAD VIDÉO CLOUDINARY
  ========================================= */

  const uploadVideo = async (file) => {

    const formData = new FormData();

    formData.append(
      "file",
      file
    );

    formData.append(
      "upload_preset",
      CLOUDINARY_UPLOAD_PRESET
    );


    const response = await fetch(
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


    return data.secure_url || "";

  };


  /* =========================================
     VIDER LE FORMULAIRE
  ========================================= */

  const resetForm = () => {

    imagePreviews.forEach(
      (preview) => {

        if (preview) {

          URL.revokeObjectURL(
            preview
          );

        }

      }
    );


    if (videoPreview) {

      URL.revokeObjectURL(
        videoPreview
      );

    }


    setName("");
    setCategory("");
    setPrice("");
    setUnit("");
    setOrigin("");
    setStock("");
    setDescription("");

    setImageFiles([]);
    setImagePreviews([]);
    setExistingImageUrls([]);

    setVideoFile(null);
    setVideoPreview("");
    setExistingVideoUrl("");

  };


  /* =========================================
     PUBLIER / MODIFIER
  ========================================= */

  const handleSubmit = async (event) => {

    event.preventDefault();


    if (saving) {
      return;
    }


    const finalName =
      name.trim();


    /* =====================================
       VÉRIFIER LE NOM
    ===================================== */

    if (!finalName) {

      await umiNotify(
        "Indiquez le nom de la matière première."
      );

      return;

    }


    /* =====================================
       VÉRIFIER LES PHOTOS
    ===================================== */

    const totalImages =
      existingImageUrls.length +
      imageFiles.length;


    if (totalImages === 0) {

      await umiNotify(
        "Ajoutez au moins une photo."
      );

      return;

    }


    if (totalImages > 10) {

      await umiNotify(
        "Vous pouvez ajouter maximum 10 photos."
      );

      return;

    }


    try {

      setSaving(true);


      /* =====================================
         UPLOAD DES NOUVELLES PHOTOS
      ===================================== */

      let uploadedImageUrls = [];


      if (imageFiles.length > 0) {

        uploadedImageUrls =
          await Promise.all(

            imageFiles.map(
              (file) =>
                uploadImage(file)
            )

          );

      }


      uploadedImageUrls =
        uploadedImageUrls.filter(
          Boolean
        );


      /* =====================================
         PHOTOS FINALES
      ===================================== */

      const finalImageUrls = [

        ...existingImageUrls,

        ...uploadedImageUrls,

      ].filter(Boolean);


      if (finalImageUrls.length === 0) {

        throw new Error(
          "Aucune photo valide n'a été enregistrée."
        );

      }


      /* =====================================
         VIDÉO FINALE
      ===================================== */

      let finalVideoUrl =
        existingVideoUrl || "";


      if (videoFile) {

        finalVideoUrl =
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

        imageUrl:
          finalImageUrls[0] || "",

        imageUrls:
          finalImageUrls,

        videoUrl:
          finalVideoUrl,

        productType:
          "rawMaterial",

        updatedAt:
          serverTimestamp(),

      };


      /* =====================================
         MODE MODIFICATION
      ===================================== */

      if (isEditing) {

        await updateDoc(

          doc(
            db,
            "rawMaterials",
            product.id
          ),

          productData

        );


        await umiNotify(
          "Matière première modifiée avec succès."
        );


        if (onOpenPublished) {

          onOpenPublished();

        } else if (onBack) {

          onBack();

        }


        return;

      }


      /* =====================================
         MODE AJOUT
      ===================================== */

      await addDoc(

        collection(
          db,
          "rawMaterials"
        ),

        {

          ...productData,

          createdAt:
            serverTimestamp(),

        }

      );


      await umiNotify(
        "Matière première publiée avec succès."
      );


      resetForm();


    } catch (error) {

      console.error(
        isEditing
          ? "Erreur modification matière première :"
          : "Erreur publication matière première :",
        error
      );


      await umiNotify(
        `Erreur : ${
          error?.message ||
          (
            isEditing
              ? "Impossible de modifier la matière première."
              : "Impossible de publier la matière première."
          )
        }`
      );


    } finally {

      setSaving(false);

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
          onClick={onBack}
          className="admin-commerce-back"
          disabled={saving}
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
            GÉRER LES MATIÈRES PUBLIÉES
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
            onClick={onOpenPublished}
            disabled={saving}
            style={{
              width: "100%",
              maxWidth: "520px",
            }}
          >
            📋 Gérer les matières publiées
          </button>

        </div>


        {/* =====================================
            CARTE FORMULAIRE
        ===================================== */}

        <section className="admin-commerce-form-card">


          <div className="admin-commerce-title-row">

            <div>

              <span>
                {isEditing
                  ? "MODIFICATION"
                  : "NOUVEAU PRODUIT"}
              </span>


              <h2>

                {isEditing
                  ? "Modifier une matière première"
                  : "Ajouter une matière première"}

              </h2>

            </div>

          </div>


          <form
            className="admin-commerce-form"
            onSubmit={handleSubmit}
          >


            {/* =================================
                NOM
            ================================= */}

            <label>

              Nom de la matière première *

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="Ex : Sucre, glycérine, huile de soja..."
                required
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
                Ajoutez jusqu'à 10 photos du produit.
              </p>


              {/* PHOTOS DÉJÀ PUBLIÉES */}

              {existingImageUrls.length > 0 && (

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: "10px",
                    marginTop: "15px",
                    marginBottom: "15px",
                  }}
                >

                  {existingImageUrls.map(
                    (imageUrl, index) => (

                      <div
                        key={`${imageUrl}-${index}`}
                        style={{
                          position: "relative",
                        }}
                      >

                        <img
                          src={imageUrl}
                          alt={`Photo existante ${index + 1}`}
                          style={{
                            display: "block",
                            width: "100%",
                            height: "150px",
                            objectFit: "cover",
                            borderRadius: "12px",
                          }}
                        />


                        <button
                          type="button"
                          onClick={() =>
                            removeExistingImage(
                              index
                            )
                          }
                          aria-label="Supprimer la photo"
                          style={{
                            position: "absolute",
                            top: "6px",
                            right: "6px",
                            width: "34px",
                            height: "34px",
                            border: "none",
                            borderRadius: "50%",
                            background: "#dc2626",
                            color: "#ffffff",
                            fontSize: "20px",
                            fontWeight: "700",
                            cursor: "pointer",
                          }}
                        >
                          ×
                        </button>

                      </div>

                    )
                  )}

                </div>

              )}


              {/* CADRE AJOUTER PHOTOS */}

              <label className="admin-image-picker">

                <input
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                  multiple
                  onChange={
                    handleImagesChange
                  }
                  disabled={saving}
                />


                <div>

                  <span>
                    📷
                  </span>


                  <strong>

                    {isEditing
                      ? "Ajouter ou modifier les photos"
                      : "Ajouter des photos"}

                  </strong>


                  <small>

                    {existingImageUrls.length +
                      imageFiles.length}
                    /10 photos

                  </small>

                </div>

              </label>


              {/* APERÇU NOUVELLES PHOTOS */}

              {imagePreviews.length > 0 && (

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
                    (preview, index) => (

                      <div
                        key={`${preview}-${index}`}
                        style={{
                          position: "relative",
                        }}
                      >

                        <img
                          src={preview}
                          alt={`Photo ${index + 1}`}
                          style={{
                            display: "block",
                            width: "100%",
                            height: "150px",
                            objectFit: "cover",
                            borderRadius: "12px",
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
                            position: "absolute",
                            top: "6px",
                            right: "6px",
                            width: "34px",
                            height: "34px",
                            border: "none",
                            borderRadius: "50%",
                            background: "#dc2626",
                            color: "#ffffff",
                            fontSize: "20px",
                            fontWeight: "700",
                            cursor: "pointer",
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

            <div>

              <strong>
                Vidéo
              </strong>

              <p>
                Ajoutez une vidéo du produit.
              </p>


              {/* VIDÉO DÉJÀ PUBLIÉE */}

              {existingVideoUrl &&
                !videoPreview && (

                  <div
                    style={{
                      position: "relative",
                      marginTop: "10px",
                      marginBottom: "15px",
                    }}
                  >

                    <video
                      src={existingVideoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      style={{
                        display: "block",
                        width: "100%",
                        maxHeight: "400px",
                        borderRadius: "14px",
                        background: "#000000",
                      }}
                    />


                    <button
                      type="button"
                      onClick={
                        removeExistingVideo
                      }
                      aria-label="Supprimer la vidéo"
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "38px",
                        height: "38px",
                        border: "none",
                        borderRadius: "50%",
                        background: "#dc2626",
                        color: "#ffffff",
                        fontSize: "22px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>

                  </div>

                )}


              {/* CADRE AJOUTER / REMPLACER VIDÉO */}

              {!videoPreview && (

                <label className="admin-image-picker">

                  <input
                    type="file"
                    accept="video/*,video/mp4,video/quicktime,video/x-m4v,video/webm,video/3gpp,.mp4,.mov,.m4v,.webm,.3gp"
                    onChange={
                      handleVideoChange
                    }
                    disabled={saving}
                  />


                  <div>

                    <span>
                      🎥
                    </span>


                    <strong>

                      {existingVideoUrl
                        ? "Remplacer la vidéo"
                        : "Ajouter une vidéo"}

                    </strong>


                    <small>
                      MP4, MOV, M4V, WebM
                    </small>

                  </div>

                </label>

              )}


              {/* APERÇU NOUVELLE VIDÉO */}

              {videoPreview && (

                <div
                  style={{
                    position: "relative",
                    marginTop: "15px",
                  }}
                >

                  <video
                    src={videoPreview}
                    controls
                    playsInline
                    preload="metadata"
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: "400px",
                      borderRadius: "14px",
                      background: "#000000",
                    }}
                  />


                  <button
                    type="button"
                    onClick={
                      removeVideo
                    }
                    aria-label="Supprimer la vidéo"
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      width: "38px",
                      height: "38px",
                      border: "none",
                      borderRadius: "50%",
                      background: "#dc2626",
                      color: "#ffffff",
                      fontSize: "22px",
                      fontWeight: "700",
                      cursor: "pointer",
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
                  value={price}
                  onChange={(event) =>
                    setPrice(
                      event.target.value
                    )
                  }
                  placeholder="Ex : 25 000 FCFA"
                />

              </label>


              <label>

  Unité

  <select
    value={unit}
    onChange={(event) =>
      setUnit(
        event.target.value
      )
    }
  >

    <option value="">
      Sélectionner une unité
    </option>

    <option value="kg">
      Kilogramme (kg)
    </option>

    <option value="g">
      Gramme (g)
    </option>

    <option value="tonne">
      Tonne
    </option>

    <option value="L">
      Litre (L)
    </option>

    <option value="mL">
      Millilitre (mL)
    </option>

    <option value="sac">
      Sac
    </option>

    <option value="carton">
      Carton
    </option>

    <option value="pièce">
      Pièce
    </option>

    <option value="bidon">
      Bidon
    </option>

    <option value="fût">
      Fût
    </option>

  </select>

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
                  value={origin}
                  onChange={(event) =>
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
                  value={stock}
                  onChange={(event) =>
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
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Décrivez la matière première, sa qualité et son utilisation..."
              />

            </label>


            {/* =================================
                BOUTON PUBLIER / MODIFIER
            ================================= */}

            <button
              type="submit"
              className="admin-commerce-save"
              disabled={saving}
            >

              {saving
                ? (
                    isEditing
                      ? "Modification..."
                      : "Envoi des fichiers et publication..."
                  )
                : (
                    isEditing
  ? "💾 Enregistrer la modification"
  : "＋ Publier la matière première"
)}

            </button>

          </form>

        </section>

      </main>

    </div>

  );

}


export default AdminRawMaterials;