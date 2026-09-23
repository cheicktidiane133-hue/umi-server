import { useEffect, useState } from "react";

import {
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

import "./EditMachine.css";
import logoUmi from "./assets/logo-umi.jpeg";


function EditMachine({
  machine,
  onBack,
  onMachineUpdated,
}) {

  /* =========================================
     INFORMATIONS
  ========================================= */

  const [name, setName] =
    useState(machine?.name || "");

  const [category, setCategory] =
    useState(machine?.category || "");

  const [price, setPrice] =
    useState(machine?.price || "");

  const [condition, setCondition] =
    useState(machine?.condition || "");

  const [brand, setBrand] =
    useState(machine?.brand || "");

  const [model, setModel] =
    useState(machine?.model || "");

  const [capacity, setCapacity] =
    useState(machine?.capacity || "");

  const [power, setPower] =
    useState(machine?.power || "");

  const [year, setYear] =
    useState(machine?.year || "");

  const [warranty, setWarranty] =
    useState(machine?.warranty || "");

  const [location, setLocation] =
    useState(machine?.location || "");

  const [description, setDescription] =
    useState(machine?.description || "");


  /* =========================================
     PHOTOS ACTUELLES
  ========================================= */

  const getInitialImages = () => {

    if (
      Array.isArray(machine?.images) &&
      machine.images.length > 0
    ) {
      return machine.images.filter(Boolean);
    }

    if (machine?.imageUrl) {
      return [machine.imageUrl];
    }

    return [];
  };


  const [currentImages, setCurrentImages] =
    useState(getInitialImages());


  /* =========================================
     NOUVELLES PHOTOS
  ========================================= */

  const [newImages, setNewImages] =
    useState([]);

  const [
    newImagePreviews,
    setNewImagePreviews,
  ] = useState([]);


  /* =========================================
     VIDÉO
  ========================================= */

  const [
    currentVideoUrl,
    setCurrentVideoUrl,
  ] = useState(
    machine?.videoUrl || ""
  );

  const [newVideo, setNewVideo] =
    useState(null);

  const [
    newVideoPreview,
    setNewVideoPreview,
  ] = useState("");


  /* =========================================
     ÉTAT
  ========================================= */

  const [isSaving, setIsSaving] =
    useState(false);

  const [uploadStatus, setUploadStatus] =
    useState("");


  /* =========================================
     CATÉGORIES
  ========================================= */

  const categories = [
    "Agroalimentaire",
    "Emballage & conditionnement",
    "Fabrication plastique",
    "Eau & boissons",
    "Produits chimiques & entretien",
    "Cosmétiques",
    "Agriculture & élevage",
    "Construction & BTP",
    "Bois & menuiserie",
    "Métallurgie & fabrication",
    "Textile & habillement",
    "Papier & impression",
    "Énergie & équipements",
    "Recyclage & environnement",
    "Autres machines & accessoires",
  ];


  /* =========================================
     NETTOYAGE DES APERÇUS
  ========================================= */

  useEffect(() => {

    return () => {

      newImagePreviews.forEach(
        (url) => {
          URL.revokeObjectURL(url);
        }
      );

      if (newVideoPreview) {
        URL.revokeObjectURL(
          newVideoPreview
        );
      }

    };

  }, []);


  /* =========================================
     CHOISIR DE NOUVELLES PHOTOS
  ========================================= */

  const handleImagesChange = (event) => {

    const selectedFiles =
      Array.from(
        event.target.files || []
      );


    if (selectedFiles.length === 0) {
      return;
    }


    const totalPhotos =
      currentImages.length +
      newImages.length +
      selectedFiles.length;


    if (totalPhotos > 10) {

      alert(
        "Vous pouvez avoir au maximum 10 photos."
      );

      event.target.value = "";

      return;
    }


    const invalidFile =
      selectedFiles.find(
        (file) =>
          !file.type.startsWith(
            "image/"
          )
      );


    if (invalidFile) {

      alert(
        "Veuillez sélectionner uniquement des photos."
      );

      event.target.value = "";

      return;
    }


    const tooLarge =
      selectedFiles.find(
        (file) =>
          file.size >
          10 * 1024 * 1024
      );


    if (tooLarge) {

      alert(
        "Chaque photo doit faire moins de 10 MB."
      );

      event.target.value = "";

      return;
    }


    const previews =
      selectedFiles.map(
        (file) =>
          URL.createObjectURL(file)
      );


    setNewImages(
      (previous) => [
        ...previous,
        ...selectedFiles,
      ]
    );


    setNewImagePreviews(
      (previous) => [
        ...previous,
        ...previews,
      ]
    );


    event.target.value = "";

  };


  /* =========================================
     SUPPRIMER UNE PHOTO ACTUELLE
  ========================================= */

  const removeCurrentImage = (index) => {

    setCurrentImages(
      (previous) =>
        previous.filter(
          (_, imageIndex) =>
            imageIndex !== index
        )
    );

  };


  /* =========================================
     SUPPRIMER UNE NOUVELLE PHOTO
  ========================================= */

  const removeNewImage = (index) => {

    const preview =
      newImagePreviews[index];


    if (preview) {

      URL.revokeObjectURL(
        preview
      );

    }


    setNewImages(
      (previous) =>
        previous.filter(
          (_, imageIndex) =>
            imageIndex !== index
        )
    );


    setNewImagePreviews(
      (previous) =>
        previous.filter(
          (_, imageIndex) =>
            imageIndex !== index
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


    if (
      !file.type.startsWith(
        "video/"
      )
    ) {

      alert(
        "Veuillez sélectionner une vidéo."
      );

      event.target.value = "";

      return;
    }


    if (
      file.size >
      100 * 1024 * 1024
    ) {

      alert(
        "La vidéo est trop grande. Maximum : 100 MB."
      );

      event.target.value = "";

      return;
    }


    if (newVideoPreview) {

      URL.revokeObjectURL(
        newVideoPreview
      );

    }


    const previewUrl =
      URL.createObjectURL(file);


    setNewVideo(file);

    setNewVideoPreview(
      previewUrl
    );


    event.target.value = "";

  };


  /* =========================================
     ANNULER LA NOUVELLE VIDÉO
  ========================================= */

  const cancelNewVideo = () => {

    if (newVideoPreview) {

      URL.revokeObjectURL(
        newVideoPreview
      );

    }


    setNewVideo(null);

    setNewVideoPreview("");

  };


  /* =========================================
     SUPPRIMER LA VIDÉO ACTUELLE
  ========================================= */

  const removeCurrentVideo = () => {

    const confirmation =
      window.confirm(
        "Voulez-vous supprimer la vidéo actuelle ?"
      );


    if (!confirmation) {
      return;
    }


    setCurrentVideoUrl("");

  };


  /* =========================================
     ENVOYER VERS CLOUDINARY
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


      /* =====================================
         ADRESSE CLOUDINARY CORRIGÉE
      ===================================== */

      const cloudinaryUrl =
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;


      const response =
        await fetch(
          cloudinaryUrl,
          {
            method: "POST",
            body: formData,
          }
        );


      let data;


      try {

        data =
          await response.json();

      } catch {

        throw new Error(
          "Réponse Cloudinary invalide."
        );

      }


      if (!response.ok) {

        console.error(
          "Erreur Cloudinary :",
          data
        );


        throw new Error(
          data?.error?.message ||
          "Impossible d'envoyer le fichier vers Cloudinary."
        );

      }


      if (!data?.secure_url) {

        throw new Error(
          "Cloudinary n'a pas retourné l'adresse du fichier."
        );

      }


      return data.secure_url;

    };


  /* =========================================
     ENREGISTRER
  ========================================= */

  const handleSubmit =
    async (event) => {

      event.preventDefault();


      /* =====================================
         VÉRIFICATIONS
      ===================================== */

      if (!name.trim()) {

        alert(
          "Veuillez entrer le nom de la machine."
        );

        return;
      }


      if (!category) {

        alert(
          "Veuillez sélectionner une catégorie."
        );

        return;
      }


      if (
        !price
          .toString()
          .trim()
      ) {

        alert(
          "Veuillez entrer le prix."
        );

        return;
      }


      if (!condition) {

        alert(
          "Veuillez sélectionner l'état de la machine."
        );

        return;
      }


      if (!machine?.id) {

        alert(
          "Identifiant de la machine introuvable."
        );

        return;
      }


      if (
        currentImages.length === 0 &&
        newImages.length === 0
      ) {

        alert(
          "La machine doit avoir au moins une photo."
        );

        return;
      }


      try {

        setIsSaving(true);

        setUploadStatus(
          "Préparation..."
        );


        /* =====================================
           ENVOYER LES NOUVELLES PHOTOS
        ===================================== */

        const uploadedImages = [];


        for (
          let index = 0;
          index < newImages.length;
          index++
        ) {

          setUploadStatus(
            `Envoi de la photo ${
              index + 1
            }/${newImages.length}...`
          );


          const imageUrl =
            await uploadToCloudinary(
              newImages[index],
              "image"
            );


          uploadedImages.push(
            imageUrl
          );

        }


        const finalImages = [
          ...currentImages,
          ...uploadedImages,
        ];


        /* =====================================
           ENVOYER LA VIDÉO
        ===================================== */

        let finalVideoUrl =
          currentVideoUrl;


        if (newVideo) {

          setUploadStatus(
            "Envoi de la vidéo..."
          );


          const uploadedVideoUrl =
            await uploadToCloudinary(
              newVideo,
              "video"
            );


          finalVideoUrl =
            uploadedVideoUrl;

        }


        /* =====================================
           PRÉPARER LES DONNÉES
        ===================================== */

        setUploadStatus(
          "Enregistrement de la machine..."
        );


        const updatedMachine = {

          name:
            name.trim(),

          category,

          price:
            price
              .toString()
              .trim(),

          condition,

          brand:
            brand.trim(),

          model:
            model.trim(),

          capacity:
            capacity.trim(),

          power:
            power.trim(),

          year:
            year
              .toString()
              .trim(),

          warranty:
            warranty.trim(),

          location:
            location.trim(),

          description:
            description.trim(),

          imageUrl:
            finalImages[0],

          images:
            finalImages,

          videoUrl:
            finalVideoUrl,

        };


        /* =====================================
           METTRE À JOUR FIREBASE
        ===================================== */

        const machineRef =
          doc(
            db,
            "machines",
            machine.id
          );


        await updateDoc(
          machineRef,
          updatedMachine
        );


        /* =====================================
           METTRE À JOUR L'APPLICATION
        ===================================== */

        const updatedMachineWithId = {

          ...machine,
          ...updatedMachine,

        };


        alert(
          "Machine modifiée avec succès !"
        );


        if (onMachineUpdated) {

          onMachineUpdated(
            updatedMachineWithId
          );

        }


      } catch (error) {

        console.error(
          "Erreur modification machine :",
          error
        );


        alert(
          `Erreur lors de la modification.\n\n${
            error?.message ||
            "Erreur inconnue."
          }`
        );


      } finally {

        setUploadStatus("");

        setIsSaving(false);

      }

    };


  return (

    <div className="edit-machine-page">


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="edit-machine-header">

        <button
          type="button"
          className="edit-machine-back"
          onClick={onBack}
          disabled={isSaving}
          aria-label="Retour"
        >
          ←
        </button>


        <div className="edit-machine-brand">

          <div className="edit-machine-header-title">
            MODIFIER LA MACHINE
          </div>

          <div className="edit-machine-header-subtitle">
            Administration UMI
          </div>

        </div>


        <img
          src={logoUmi}
          alt="UMI"
          className="edit-machine-logo"
        />

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="edit-machine-content">


        <div className="edit-machine-intro">

          <h1>
            Modifier la machine
          </h1>

          <p>
            Modifiez les informations,
            les photos et la vidéo de la machine.
          </p>

        </div>


        <form
          className="edit-machine-form"
          onSubmit={handleSubmit}
        >


          {/* =================================
              PHOTOS
          ================================= */}

          <section className="edit-form-section">

            <div className="edit-section-title">

              <span className="edit-section-icon">
                📷
              </span>

              <div>

                <h2>
                  Photos de la machine
                </h2>

                <p>
                  La première photo est la photo principale.
                </p>

              </div>

            </div>


            {currentImages.length > 0 && (

              <>

                <p className="edit-media-label">
                  Photos actuelles
                </p>


                <div className="edit-images-grid">

                  {currentImages.map(
                    (imageUrl, index) => (

                      <div
                        className="edit-image-item"
                        key={`${imageUrl}-${index}`}
                      >

                        <img
                          src={imageUrl}
                          alt={`Photo ${index + 1}`}
                        />


                        {index === 0 && (

                          <span className="edit-main-photo">
                            PRINCIPALE
                          </span>

                        )}


                        <button
                          type="button"
                          className="edit-remove-media"
                          onClick={() =>
                            removeCurrentImage(
                              index
                            )
                          }
                          disabled={isSaving}
                          aria-label="Supprimer la photo"
                        >
                          ×
                        </button>

                      </div>

                    )
                  )}

                </div>

              </>

            )}


            <label
              htmlFor="edit-machine-images"
              className="edit-media-upload"
            >

              <span className="edit-upload-icon">
                +
              </span>

              <strong>
                Ajouter des photos
              </strong>

              <small>
                Jusqu'à 10 photos au total
              </small>

            </label>


            <input
              id="edit-machine-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              disabled={isSaving}
              className="edit-hidden-input"
            />


            {newImagePreviews.length > 0 && (

              <>

                <p className="edit-media-label edit-new-label">
                  Nouvelles photos
                </p>


                <div className="edit-images-grid">

                  {newImagePreviews.map(
                    (preview, index) => (

                      <div
                        className="edit-image-item"
                        key={`${preview}-${index}`}
                      >

                        <img
                          src={preview}
                          alt={`Nouvelle photo ${index + 1}`}
                        />


                        <button
                          type="button"
                          className="edit-remove-media"
                          onClick={() =>
                            removeNewImage(
                              index
                            )
                          }
                          disabled={isSaving}
                          aria-label="Supprimer la nouvelle photo"
                        >
                          ×
                        </button>

                      </div>

                    )
                  )}

                </div>

              </>

            )}


            <p className="edit-media-count">

              {currentImages.length +
                newImages.length}{" "}

              photo
              {currentImages.length +
                newImages.length !== 1
                ? "s"
                : ""}{" "}
              au total

            </p>

          </section>


          {/* =================================
              VIDÉO
          ================================= */}

          <section className="edit-form-section">

            <div className="edit-section-title">

              <span className="edit-section-icon">
                🎥
              </span>

              <div>

                <h2>
                  Vidéo de la machine
                </h2>

                <p>
                  Facultatif
                </p>

              </div>

            </div>


            {/* VIDÉO ACTUELLE */}

            {currentVideoUrl &&
              !newVideoPreview && (

                <div className="edit-video-box">

                  <video
                    src={currentVideoUrl}
                    controls
                    playsInline
                    preload="metadata"
                  />


                  <button
                    type="button"
                    className="edit-delete-video"
                    onClick={
                      removeCurrentVideo
                    }
                    disabled={isSaving}
                  >
                    Supprimer la vidéo actuelle
                  </button>

                </div>

              )}


            {/* NOUVELLE VIDÉO */}

            {newVideoPreview && (

              <div className="edit-video-box">

                <video
                  src={newVideoPreview}
                  controls
                  playsInline
                  preload="metadata"
                />


                <p>
                  {newVideo?.name}
                </p>


                <button
                  type="button"
                  className="edit-delete-video"
                  onClick={
                    cancelNewVideo
                  }
                  disabled={isSaving}
                >
                  Annuler la nouvelle vidéo
                </button>

              </div>

            )}


            <label
              htmlFor="edit-machine-video"
              className="edit-media-upload"
            >

              <span className="edit-upload-icon">
                ▶
              </span>

              <strong>

                {currentVideoUrl
                  ? "Changer la vidéo"
                  : "Ajouter une vidéo"}

              </strong>

              <small>
                Maximum 100 MB
              </small>

            </label>


            <input
              id="edit-machine-video"
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              disabled={isSaving}
              className="edit-hidden-input"
            />

          </section>


          {/* =================================
              INFORMATIONS PRINCIPALES
          ================================= */}

          <section className="edit-form-section">

            <div className="edit-section-title">

              <span className="edit-section-icon">
                ⚙️
              </span>

              <div>

                <h2>
                  Informations principales
                </h2>

                <p>
                  Informations générales de la machine.
                </p>

              </div>

            </div>


            <div className="edit-form-field">

              <label htmlFor="edit-name">

                Nom de la machine

                <span className="edit-required">
                  *
                </span>

              </label>


              <input
                id="edit-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                disabled={isSaving}
                required
              />

            </div>


            <div className="edit-form-field">

              <label htmlFor="edit-category">

                Catégorie

                <span className="edit-required">
                  *
                </span>

              </label>


              <select
                id="edit-category"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value
                  )
                }
                disabled={isSaving}
                required
              >

                {!category && (

                  <option
                    value=""
                    disabled
                  >
                    Sélectionnez une catégorie
                  </option>

                )}


                {categories.map(
                  (item) => (

                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>

                  )
                )}

              </select>

            </div>


            <div className="edit-form-field">

              <label htmlFor="edit-price">

                Prix

                <span className="edit-required">
                  *
                </span>

              </label>


              <input
                id="edit-price"
                type="text"
                value={price}
                onChange={(event) =>
                  setPrice(
                    event.target.value
                  )
                }
                placeholder="Exemple : 2 500 000 FCFA"
                disabled={isSaving}
                required
              />

            </div>


            <div className="edit-form-field">

              <label htmlFor="edit-condition">

                État de la machine

                <span className="edit-required">
                  *
                </span>

              </label>


              <select
                id="edit-condition"
                value={condition}
                onChange={(event) =>
                  setCondition(
                    event.target.value
                  )
                }
                disabled={isSaving}
                required
              >

                {!condition && (

                  <option
                    value=""
                    disabled
                  >
                    Sélectionnez l'état
                  </option>

                )}


                <option value="Neuf">
                  Neuf
                </option>

                <option value="Occasion">
                  Occasion
                </option>

                <option value="Reconditionné">
                  Reconditionné
                </option>

              </select>

            </div>

          </section>


          {/* =================================
              CARACTÉRISTIQUES
          ================================= */}

          <section className="edit-form-section">

            <div className="edit-section-title">

              <span className="edit-section-icon">
                🛠️
              </span>

              <div>

                <h2>
                  Caractéristiques
                </h2>

                <p>
                  Informations techniques de la machine.
                </p>

              </div>

            </div>


            <div className="edit-form-field">

              <label htmlFor="edit-brand">
                Marque
              </label>

              <input
                id="edit-brand"
                type="text"
                value={brand}
                onChange={(event) =>
                  setBrand(
                    event.target.value
                  )
                }
                placeholder="Exemple : Bosch"
                disabled={isSaving}
              />

            </div>


            <div className="edit-form-field">

              <label htmlFor="edit-model">
                Modèle
              </label>

              <input
                id="edit-model"
                type="text"
                value={model}
                onChange={(event) =>
                  setModel(
                    event.target.value
                  )
                }
                placeholder="Exemple : X200"
                disabled={isSaving}
              />

            </div>


            <div className="edit-form-field">

              <label htmlFor="edit-capacity">
                Capacité de production
              </label>

              <input
                id="edit-capacity"
                type="text"
                value={capacity}
                onChange={(event) =>
                  setCapacity(
                    event.target.value
                  )
                }
                placeholder="Exemple : 500 sachets/heure"
                disabled={isSaving}
              />

            </div>


            <div className="edit-form-field">

              <label htmlFor="edit-power">
                Puissance
              </label>

              <input
                id="edit-power"
                type="text"
                value={power}
                onChange={(event) =>
                  setPower(
                    event.target.value
                  )
                }
                placeholder="Exemple : 5 kW"
                disabled={isSaving}
              />

            </div>


            <div className="edit-form-field">

              <label htmlFor="edit-year">
                Année de fabrication
              </label>

              <input
                id="edit-year"
                type="number"
                min="1900"
                max="2100"
                value={year}
                onChange={(event) =>
                  setYear(
                    event.target.value
                  )
                }
                placeholder="Exemple : 2026"
                disabled={isSaving}
              />

            </div>


            <div className="edit-form-field">

              <label htmlFor="edit-warranty">
                Garantie
              </label>

              <input
                id="edit-warranty"
                type="text"
                value={warranty}
                onChange={(event) =>
                  setWarranty(
                    event.target.value
                  )
                }
                placeholder="Exemple : 12 mois"
                disabled={isSaving}
              />

            </div>

          </section>


          {/* =================================
              LOCALISATION
          ================================= */}

          <section className="edit-form-section">

            <div className="edit-section-title">

              <span className="edit-section-icon">
                📍
              </span>

              <div>

                <h2>
                  Localisation
                </h2>

                <p>
                  Indiquez où se trouve la machine.
                </p>

              </div>

            </div>


            <div className="edit-form-field">

              <label htmlFor="edit-location">
                Ville / Pays
              </label>

              <input
                id="edit-location"
                type="text"
                value={location}
                onChange={(event) =>
                  setLocation(
                    event.target.value
                  )
                }
                placeholder="Exemple : Bamako, Mali"
                disabled={isSaving}
              />

            </div>

          </section>


          {/* =================================
              DESCRIPTION
          ================================= */}

          <section className="edit-form-section">

            <div className="edit-section-title">

              <span className="edit-section-icon">
                📝
              </span>

              <div>

                <h2>
                  Description
                </h2>

                <p>
                  Présentation de la machine.
                </p>

              </div>

            </div>


            <div className="edit-form-field">

              <label htmlFor="edit-description">
                Description de la machine
              </label>

              <textarea
                id="edit-description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Décrivez la machine..."
                rows="6"
                disabled={isSaving}
              />

            </div>

          </section>


          {/* =================================
              BOUTONS
          ================================= */}

          <button
            type="submit"
            className="edit-save-button"
            disabled={isSaving}
          >

            {isSaving
              ? uploadStatus ||
                "Enregistrement..."
              : "✓ Enregistrer les modifications"}

          </button>


          <button
            type="button"
            className="edit-cancel-button"
            onClick={onBack}
            disabled={isSaving}
          >
            Annuler
          </button>


        </form>

      </main>

    </div>

  );

}


export default EditMachine;