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


function AdminPackaging({
  onBack,
  onOpenPublished,
  productToEdit,
  onEditFinished,
}) {

  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [material, setMaterial] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [minimumQuantity, setMinimumQuantity] = useState("");
  const [customizable, setCustomizable] = useState(false);
  const [description, setDescription] = useState("");


  /* =========================================
     NOUVELLES PHOTOS
  ========================================= */

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);


  /* =========================================
     PHOTOS EXISTANTES EN MODIFICATION
  ========================================= */

  const [
    existingImageUrls,
    setExistingImageUrls,
  ] = useState([]);


  /* =========================================
     VIDÉO
  ========================================= */

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");

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
     CHARGER PRODUIT À MODIFIER
  ========================================= */

  useEffect(() => {

    if (!productToEdit?.id) {

      setExistingImageUrls([]);
      setExistingVideoUrl("");

      return;
    }


    setName(
      productToEdit.name || ""
    );

    setType(
      productToEdit.type || ""
    );

    setMaterial(
      productToEdit.material || ""
    );

    setSize(
      productToEdit.size || ""
    );

    setColor(
      productToEdit.color || ""
    );

    setPrice(
      productToEdit.price || ""
    );

    setStock(
      productToEdit.stock || ""
    );

    setMinimumQuantity(
      productToEdit.minimumQuantity || ""
    );

    setCustomizable(
      Boolean(
        productToEdit.customizable
      )
    );

    setDescription(
      productToEdit.description || ""
    );


    /* =====================================
       RÉCUPÉRER LES PHOTOS EXISTANTES
    ===================================== */

    let savedImages = [];

    if (
      Array.isArray(
        productToEdit.imageUrls
      )
    ) {

      savedImages =
        productToEdit.imageUrls.filter(
          Boolean
        );

    }


    /*
      Compatibilité avec les anciens
      emballages qui avaient seulement
      imageUrl.
    */

    if (
      productToEdit.imageUrl &&
      !savedImages.includes(
        productToEdit.imageUrl
      )
    ) {

      savedImages.unshift(
        productToEdit.imageUrl
      );

    }


    setExistingImageUrls(
      savedImages.slice(0, 10)
    );


    /* =====================================
       VIDÉO EXISTANTE
    ===================================== */

    setExistingVideoUrl(
      productToEdit.videoUrl || ""
    );


    setImageFiles([]);
    setImagePreviews([]);

    setVideoFile(null);
    setVideoPreview("");

  }, [productToEdit]);


  /* =========================================
     NOMBRE TOTAL DE PHOTOS
  ========================================= */

  const totalPhotos =
    existingImageUrls.length +
    imageFiles.length;


  /* =========================================
     CHOISIR DES PHOTOS
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
          file.type?.startsWith(
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
      10 - totalPhotos;


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


    const previews =
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
        ...previews,
      ]
    );


    event.target.value = "";

  };


  /* =========================================
     SUPPRIMER UNE NOUVELLE PHOTO
  ========================================= */

  const removeNewImage = (
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
     SUPPRIMER PHOTO EXISTANTE
  ========================================= */

  const removeExistingImage = (
    index
  ) => {

    setExistingImageUrls(
      (previous) =>
        previous.filter(
          (_, currentIndex) =>
            currentIndex !== index
        )
    );

  };


  /* =========================================
     CHOISIR VIDÉO
  ========================================= */

  const handleVideoChange = (
    event
  ) => {

    const file =
      event.target.files?.[0];


    if (!file) {

      return;

    }


    const fileName =
      (
        file.name || ""
      ).toLowerCase();


    const isVideo =
      file.type?.startsWith(
        "video/"
      ) ||
      fileName.endsWith(".mp4") ||
      fileName.endsWith(".mov") ||
      fileName.endsWith(".m4v") ||
      fileName.endsWith(".webm") ||
      fileName.endsWith(".3gp");


    if (!isVideo) {

      alert(
        "Veuillez sélectionner une vidéo compatible."
      );

      event.target.value = "";

      return;

    }


    if (
      videoPreview &&
      videoPreview.startsWith(
        "blob:"
      )
    ) {

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


    /*
      La nouvelle vidéo remplacera
      l'ancienne lors de l'enregistrement.
    */

    event.target.value = "";

  };


  /* =========================================
     SUPPRIMER NOUVELLE VIDÉO
  ========================================= */

  const removeNewVideo = () => {

    if (
      videoPreview &&
      videoPreview.startsWith(
        "blob:"
      )
    ) {

      URL.revokeObjectURL(
        videoPreview
      );

    }


    setVideoFile(null);
    setVideoPreview("");

  };


  /* =========================================
     SUPPRIMER VIDÉO EXISTANTE
  ========================================= */

  const removeExistingVideo = () => {

    setExistingVideoUrl("");

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
      data.secure_url || ""
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
      data.secure_url || ""
    );

  };


  /* =========================================
     VIDER FORMULAIRE
  ========================================= */

  const resetForm = () => {

    imagePreviews.forEach(
      (preview) => {

        if (
          preview?.startsWith(
            "blob:"
          )
        ) {

          URL.revokeObjectURL(
            preview
          );

        }

      }
    );


    if (
      videoPreview &&
      videoPreview.startsWith(
        "blob:"
      )
    ) {

      URL.revokeObjectURL(
        videoPreview
      );

    }


    setName("");
    setType("");
    setMaterial("");
    setSize("");
    setColor("");
    setPrice("");
    setStock("");
    setMinimumQuantity("");
    setCustomizable(false);
    setDescription("");

    setImageFiles([]);
    setImagePreviews([]);
    setExistingImageUrls([]);

    setVideoFile(null);
    setVideoPreview("");
    setExistingVideoUrl("");

  };


  /* =========================================
     ANNULER MODIFICATION
  ========================================= */

  const handleCancelEdit = () => {

    resetForm();


    if (onEditFinished) {

      onEditFinished();

    }

  };


  /* =========================================
     PUBLIER / MODIFIER
  ========================================= */

  const handleSubmit = async (
    event
  ) => {

    event.preventDefault();


    if (!name.trim()) {

      alert(
        "Indiquez le nom de l'emballage."
      );

      return;

    }


    if (
      totalPhotos === 0
    ) {

      alert(
        "Ajoutez au moins une photo de l'emballage."
      );

      return;

    }


    if (
      totalPhotos > 10
    ) {

      alert(
        "Vous pouvez ajouter maximum 10 photos."
      );

      return;

    }


    try {

      setSaving(true);


      /* =====================================
         ENVOYER LES NOUVELLES PHOTOS
      ===================================== */

      const uploadedImageUrls =
        await Promise.all(

          imageFiles.map(
            (file) =>
              uploadImage(
                file
              )
          )

        );


      /* =====================================
         PHOTOS FINALES
      ===================================== */

      const finalImageUrls = [

        ...existingImageUrls,

        ...uploadedImageUrls,

      ].filter(Boolean);


      /* =====================================
         VIDÉO
      ===================================== */

      let finalVideoUrl =
        existingVideoUrl;


      if (videoFile) {

        finalVideoUrl =
          await uploadVideo(
            videoFile
          );

      }


      /* =====================================
         DONNÉES
      ===================================== */

      const productData = {

        name:
          name.trim(),

        type:
          type.trim(),

        material:
          material.trim(),

        size:
          size.trim(),

        color:
          color.trim(),

        price:
          price.trim(),

        stock:
          stock.trim(),

        minimumQuantity:
          minimumQuantity.trim(),

        customizable,

        description:
          description.trim(),


        /*
          Première photo =
          image principale.
        */

        imageUrl:
          finalImageUrls[0] || "",


        /*
          Jusqu'à 10 photos.
        */

        imageUrls:
          finalImageUrls,


        /*
          Une vidéo.
        */

        videoUrl:
          finalVideoUrl || "",


        productType:
          "packaging",


        updatedAt:
          serverTimestamp(),

      };


      /* =====================================
         MODIFICATION
      ===================================== */

      if (
        productToEdit?.id
      ) {

        await updateDoc(
          doc(
            db,
            "packaging",
            productToEdit.id
          ),
          productData
        );


        alert(
          "Emballage modifié avec succès."
        );


        resetForm();


        if (
          onEditFinished
        ) {

          onEditFinished();

        }


        return;

      }


      /* =====================================
         NOUVEL EMBALLAGE
      ===================================== */

      await addDoc(

        collection(
          db,
          "packaging"
        ),

        {

          ...productData,

          createdAt:
            serverTimestamp(),

        }

      );


      alert(
        "Emballage publié avec succès."
      );


      resetForm();


    } catch (error) {

      console.error(
        "Erreur sauvegarde emballage :",
        error
      );


      alert(
        `Erreur : ${
          error?.message ||
          "Impossible d'enregistrer l'emballage."
        }`
      );


    } finally {

      setSaving(false);

    }

  };


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
        >
          ←
        </button>


        <div>

          <h1>
            Emballages
          </h1>

          <p>
            Administration UMI
          </p>

        </div>


        <span className="admin-commerce-header-icon">
          📦
        </span>

      </header>


      <main className="admin-commerce-content">


        {/* =====================================
            GÉRER LES PUBLICATIONS
        ===================================== */}

        {!productToEdit && (

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
              📋 Gérer les emballages publiés
            </button>

          </div>

        )}


        {/* =====================================
            FORMULAIRE
        ===================================== */}

        <section className="admin-commerce-form-card">

          <div className="admin-commerce-title-row">

            <div>

              <span>
                {productToEdit
                  ? "MODIFICATION"
                  : "NOUVEL EMBALLAGE"}
              </span>

              <h2>
                {productToEdit
                  ? "Modifier l'emballage"
                  : "Ajouter un emballage"}
              </h2>

            </div>


            {productToEdit && (

              <button
                type="button"
                className="admin-cancel-edit"
                onClick={
                  handleCancelEdit
                }
              >
                Annuler
              </button>

            )}

          </div>


          <form
            className="admin-commerce-form"
            onSubmit={
              handleSubmit
            }
          >


            {/* =================================
                PHOTOS
            ================================= */}

            <div>

              <strong>
                Photos
              </strong>

              <p>
                Ajoutez jusqu'à 10 photos de l'emballage.
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
                    {totalPhotos}/10 photos
                  </small>

                </div>

              </label>


              {/* PHOTOS EXISTANTES */}

              {existingImageUrls.length > 0 && (

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: "10px",
                    marginTop: "15px",
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
                            removeExistingImage(
                              index
                            )
                          }
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


              {/* NOUVELLES PHOTOS */}

              {imagePreviews.length > 0 && (

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: "10px",
                    marginTop: "10px",
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
                          alt={`Nouvelle photo ${index + 1}`}
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
                            removeNewImage(
                              index
                            )
                          }
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

            <div
              style={{
                marginTop: "20px",
              }}
            >

              <strong>
                Vidéo
              </strong>

              <p>
                Ajoutez une vidéo de l'emballage.
              </p>


              {!videoPreview &&
                !existingVideoUrl && (

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
                      1 vidéo maximum
                    </small>

                  </div>

                </label>

              )}


              {/* VIDÉO EXISTANTE */}

              {!videoPreview &&
                existingVideoUrl && (

                <div
                  style={{
                    position: "relative",
                    marginTop: "10px",
                  }}
                >

                  <video
                    src={
                      existingVideoUrl
                    }
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


              {/* NOUVELLE VIDÉO */}

              {videoPreview && (

                <div
                  style={{
                    position: "relative",
                    marginTop: "10px",
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
                      removeNewVideo
                    }
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


              {/* REMPLACER VIDÉO */}

              {!videoPreview &&
                existingVideoUrl && (

                <label
                  className="admin-image-picker"
                  style={{
                    marginTop: "12px",
                  }}
                >

                  <input
                    type="file"
                    accept="video/*,video/mp4,video/quicktime,video/x-m4v,video/webm,video/3gpp,.mp4,.mov,.m4v,.webm,.3gp"
                    onChange={
                      handleVideoChange
                    }
                  />

                  <div>

                    <span>
                      🔄
                    </span>

                    <strong>
                      Remplacer la vidéo
                    </strong>

                  </div>

                </label>

              )}

            </div>


            {/* =================================
                NOM
            ================================= */}

            <label>

              Nom *

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="Ex : Bouteille PET 500 ml"
                required
              />

            </label>


            {/* TYPE */}

            <label>

              Type d'emballage

              <input
                type="text"
                value={type}
                onChange={(event) =>
                  setType(
                    event.target.value
                  )
                }
                placeholder="Bouteille, sachet, carton, pot..."
              />

            </label>


            <div className="admin-commerce-two-columns">

              <label>

                Matière

                <input
                  type="text"
                  value={material}
                  onChange={(event) =>
                    setMaterial(
                      event.target.value
                    )
                  }
                  placeholder="PET, plastique, verre..."
                />

              </label>


              <label>

                Dimensions / capacité

                <input
                  type="text"
                  value={size}
                  onChange={(event) =>
                    setSize(
                      event.target.value
                    )
                  }
                  placeholder="Ex : 500 ml"
                />

              </label>

            </div>


            <div className="admin-commerce-two-columns">

              <label>

                Couleur

                <input
                  type="text"
                  value={color}
                  onChange={(event) =>
                    setColor(
                      event.target.value
                    )
                  }
                  placeholder="Transparent, blanc..."
                />

              </label>


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
                  placeholder="Ex : 100 FCFA"
                />

              </label>

            </div>


            <div className="admin-commerce-two-columns">

              <label>

                Stock

                <input
                  type="text"
                  value={stock}
                  onChange={(event) =>
                    setStock(
                      event.target.value
                    )
                  }
                  placeholder="Ex : 10 000 unités"
                />

              </label>


              <label>

                Commande minimum

                <input
                  type="text"
                  value={minimumQuantity}
                  onChange={(event) =>
                    setMinimumQuantity(
                      event.target.value
                    )
                  }
                  placeholder="Ex : 500 unités"
                />

              </label>

            </div>


            {/* PERSONNALISATION */}

            <label className="admin-packaging-checkbox">

              <input
                type="checkbox"
                checked={customizable}
                onChange={(event) =>
                  setCustomizable(
                    event.target.checked
                  )
                }
              />

              <span>
                Cet emballage peut être personnalisé
                avec le logo ou le design du client.
              </span>

            </label>


            {/* DESCRIPTION */}

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
                placeholder="Décrivez l'emballage, son utilisation, sa qualité..."
              />

            </label>


            {/* ENREGISTRER */}

            <button
              type="submit"
              className="admin-commerce-save"
              disabled={saving}
            >

              {saving
                ? "Envoi des fichiers et enregistrement..."
                : productToEdit
                ? "✓ Enregistrer les modifications"
                : "＋ Publier l'emballage"}

            </button>

          </form>

        </section>

      </main>

    </div>

  );

}


export default AdminPackaging;