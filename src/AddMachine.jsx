import { useEffect, useState } from "react";

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

import "./AddMachine.css";
import logoUmi from "./assets/logo-umi.jpeg";


function AddMachine({
  onBack,
  onSaveMachine,
}) {

  /* =========================================
     INFORMATIONS
  ========================================= */

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("");

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [capacity, setCapacity] = useState("");
  const [power, setPower] = useState("");
  const [year, setYear] = useState("");
  const [warranty, setWarranty] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");


  /* =========================================
     PHOTOS
  ========================================= */

  const [imageFiles, setImageFiles] =
    useState([]);

  const [imagePreviews, setImagePreviews] =
    useState([]);


  /* =========================================
     VIDÉO
  ========================================= */

  const [videoFile, setVideoFile] =
    useState(null);

  const [videoPreview, setVideoPreview] =
    useState("");


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
     NETTOYER LES APERÇUS
  ========================================= */

  useEffect(() => {

    return () => {

      imagePreviews.forEach(
        (url) => URL.revokeObjectURL(url)
      );

      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }

    };

  }, [imagePreviews, videoPreview]);


  /* =========================================
     CHOISIR LES PHOTOS
  ========================================= */

  const handleImagesChange = (event) => {

    const files =
      Array.from(
        event.target.files || []
      );


    if (files.length === 0) {
      return;
    }


    if (files.length > 10) {

      alert(
        "Vous pouvez sélectionner au maximum 10 photos."
      );

      event.target.value = "";

      return;
    }


    const invalidFile =
      files.find(
        (file) =>
          !file.type.startsWith("image/")
      );


    if (invalidFile) {

      alert(
        "Veuillez sélectionner uniquement des photos."
      );

      event.target.value = "";

      return;
    }


    const tooLarge =
      files.find(
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


    imagePreviews.forEach(
      (url) =>
        URL.revokeObjectURL(url)
    );


    const previews =
      files.map(
        (file) =>
          URL.createObjectURL(file)
      );


    setImageFiles(files);
    setImagePreviews(previews);

  };


  /* =========================================
     SUPPRIMER UNE PHOTO
  ========================================= */

  const removeImage = (index) => {

    const previewToRemove =
      imagePreviews[index];


    if (previewToRemove) {
      URL.revokeObjectURL(
        previewToRemove
      );
    }


    setImageFiles(
      (previous) =>
        previous.filter(
          (_, fileIndex) =>
            fileIndex !== index
        )
    );


    setImagePreviews(
      (previous) =>
        previous.filter(
          (_, previewIndex) =>
            previewIndex !== index
        )
    );

  };


  /* =========================================
     CHOISIR VIDÉO
  ========================================= */

  const handleVideoChange = (event) => {

    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    if (
      !file.type.startsWith("video/")
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


    if (videoPreview) {

      URL.revokeObjectURL(
        videoPreview
      );

    }


    setVideoFile(file);

    setVideoPreview(
      URL.createObjectURL(file)
    );

  };


  /* =========================================
     SUPPRIMER VIDÉO
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
          "Impossible d'envoyer le fichier."
        );

      }


      if (!data.secure_url) {

        throw new Error(
          "Cloudinary n'a pas retourné l'adresse du fichier."
        );

      }


      return data.secure_url;

    };


  /* =========================================
     PUBLIER
  ========================================= */

  const handleSubmit =
    async (event) => {

      event.preventDefault();


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


      if (!price.trim()) {

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


      if (imageFiles.length === 0) {

        alert(
          "Veuillez ajouter au moins une photo."
        );

        return;
      }


      try {

        setIsSaving(true);


        /* =====================================
           PHOTOS CLOUDINARY
        ===================================== */

        setUploadStatus(
          "Envoi des photos..."
        );


        const uploadedImages = [];


        for (
          let index = 0;
          index < imageFiles.length;
          index++
        ) {

          setUploadStatus(
            `Envoi de la photo ${
              index + 1
            }/${imageFiles.length}...`
          );


          const imageUrl =
            await uploadToCloudinary(
              imageFiles[index],
              "image"
            );


          uploadedImages.push(
            imageUrl
          );

        }


        /* =====================================
           VIDÉO CLOUDINARY
        ===================================== */

        let uploadedVideoUrl = "";


        if (videoFile) {

          setUploadStatus(
            "Envoi de la vidéo..."
          );


          uploadedVideoUrl =
            await uploadToCloudinary(
              videoFile,
              "video"
            );

        }


        /* =====================================
           DONNÉES MACHINE
        ===================================== */

        setUploadStatus(
          "Publication de la machine..."
        );


        const machineData = {

          name:
            name.trim(),

          category,

          price:
            price.trim(),

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
            year.toString().trim(),

          warranty:
            warranty.trim(),

          location:
            location.trim(),

          description:
            description.trim(),

          imageUrl:
            uploadedImages[0],

          images:
            uploadedImages,

          videoUrl:
            uploadedVideoUrl,

          createdAt:
            serverTimestamp(),

        };


        /* =====================================
           FIREBASE
        ===================================== */

        const documentReference =
          await addDoc(
            collection(
              db,
              "machines"
            ),
            machineData
          );


        /* =====================================
           MACHINE POUR APP.JSX
        ===================================== */

        const newMachine = {

          id:
            documentReference.id,

          ...machineData,

        };


        alert(
          "Machine publiée avec succès !"
        );


        if (onSaveMachine) {

          onSaveMachine(
            newMachine
          );

        }


      } catch (error) {

        console.error(
          "Erreur publication machine :",
          error
        );


        alert(
          `Erreur lors de la publication.\n\n${
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

    <div className="add-machine-page">


      {/* =====================================
          BANNIÈRE
      ===================================== */}

      <header className="add-machine-header">

        <button
          type="button"
          className="add-machine-back"
          onClick={onBack}
          disabled={isSaving}
          aria-label="Retour"
        >
          ←
        </button>


        <div className="add-machine-brand">

          <div className="add-machine-header-title">
            AJOUTER UNE MACHINE
          </div>

          <div className="add-machine-header-subtitle">
            Administration UMI
          </div>

        </div>


        <img
          src={logoUmi}
          alt="UMI"
          className="add-machine-logo"
        />

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="add-machine-content">


        <div className="add-machine-intro">

          <h1>
            Nouvelle machine
          </h1>

          <p>
            Ajoutez les informations,
            les photos et éventuellement
            une vidéo de la machine.
          </p>

        </div>


        <form
          className="add-machine-form"
          onSubmit={handleSubmit}
        >


          {/* =================================
              PHOTOS
          ================================= */}

          <section className="machine-form-section">

            <div className="form-section-title">

              <span className="form-section-icon">
                📷
              </span>

              <div>

                <h2>
                  Photos de la machine
                </h2>

                <p>
                  Ajoutez jusqu'à 10 photos.
                </p>

              </div>

            </div>


            <label
              htmlFor="machine-images"
              className="machine-photo-upload"
            >

              <div className="photo-upload-icon">
                +
              </div>

              <strong>
                Ajouter des photos
              </strong>

              <span>
                JPG, PNG ou WEBP · Maximum 10 MB par photo
              </span>

            </label>


            <input
              id="machine-images"
              className="machine-file-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              disabled={isSaving}
            />


            {imagePreviews.length > 0 && (

              <>

                <div className="machine-images-preview">

                  {imagePreviews.map(
                    (preview, index) => (

                      <div
                        className="machine-image-preview-item"
                        key={`${preview}-${index}`}
                      >

                        <img
                          src={preview}
                          alt={`Photo ${index + 1}`}
                        />

                        <span>
                          {index + 1}
                        </span>

                        <button
                          type="button"
                          className="remove-machine-media"
                          onClick={() =>
                            removeImage(index)
                          }
                          disabled={isSaving}
                        >
                          ×
                        </button>

                      </div>

                    )
                  )}

                </div>


                <p className="machine-media-count">
                  {imageFiles.length} photo
                  {imageFiles.length > 1
                    ? "s"
                    : ""}{" "}
                  sélectionnée
                  {imageFiles.length > 1
                    ? "s"
                    : ""}
                </p>

              </>

            )}

          </section>


          {/* =================================
              VIDÉO
          ================================= */}

          <section className="machine-form-section">

            <div className="form-section-title">

              <span className="form-section-icon">
                🎥
              </span>

              <div>

                <h2>
                  Vidéo de la machine
                </h2>

                <p>
                  Facultatif · Présentez la machine en fonctionnement.
                </p>

              </div>

            </div>


            <label
              htmlFor="machine-video"
              className="machine-photo-upload"
            >

              <div className="photo-upload-icon">
                ▶
              </div>

              <strong>
                Ajouter une vidéo
              </strong>

              <span>
                Maximum 100 MB
              </span>

            </label>


            <input
              id="machine-video"
              className="machine-file-input"
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              disabled={isSaving}
            />


            {videoPreview && (

              <div className="machine-video-preview">

                <video
                  src={videoPreview}
                  controls
                />

                <p>
                  {videoFile?.name}
                </p>

                <button
                  type="button"
                  className="remove-video-button"
                  onClick={removeVideo}
                  disabled={isSaving}
                >
                  Supprimer la vidéo
                </button>

              </div>

            )}

          </section>


          {/* =================================
              INFORMATIONS PRINCIPALES
          ================================= */}

          <section className="machine-form-section">

            <div className="form-section-title">

              <span className="form-section-icon">
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


            <div className="machine-form-field">

              <label htmlFor="machine-name">
                Nom de la machine
                <span className="required-star">
                  *
                </span>
              </label>

              <input
                id="machine-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="Exemple : Machine d'emballage automatique"
                disabled={isSaving}
                required
              />

            </div>


            <div className="machine-form-field">

              <label htmlFor="machine-category">
                Catégorie
                <span className="required-star">
                  *
                </span>
              </label>

              <select
                id="machine-category"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value
                  )
                }
                disabled={isSaving}
                required
              >

                <option
                  value=""
                  disabled
                >
                  Sélectionnez une catégorie
                </option>

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


            <div className="machine-form-field">

              <label htmlFor="machine-price">
                Prix
                <span className="required-star">
                  *
                </span>
              </label>

              <input
                id="machine-price"
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


            <div className="machine-form-field">

              <label htmlFor="machine-condition">
                État de la machine
                <span className="required-star">
                  *
                </span>
              </label>

              <select
                id="machine-condition"
                value={condition}
                onChange={(event) =>
                  setCondition(
                    event.target.value
                  )
                }
                disabled={isSaving}
                required
              >

                <option
                  value=""
                  disabled
                >
                  Sélectionnez l'état
                </option>

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

          <section className="machine-form-section">

            <div className="form-section-title">

              <span className="form-section-icon">
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


            <div className="machine-form-field">

              <label htmlFor="machine-brand">
                Marque
              </label>

              <input
                id="machine-brand"
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


            <div className="machine-form-field">

              <label htmlFor="machine-model">
                Modèle
              </label>

              <input
                id="machine-model"
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


            <div className="machine-form-field">

              <label htmlFor="machine-capacity">
                Capacité de production
              </label>

              <input
                id="machine-capacity"
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


            <div className="machine-form-field">

              <label htmlFor="machine-power">
                Puissance
              </label>

              <input
                id="machine-power"
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


            <div className="machine-form-field">

              <label htmlFor="machine-year">
                Année de fabrication
              </label>

              <input
                id="machine-year"
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


            <div className="machine-form-field">

              <label htmlFor="machine-warranty">
                Garantie
              </label>

              <input
                id="machine-warranty"
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

          <section className="machine-form-section">

            <div className="form-section-title">

              <span className="form-section-icon">
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


            <div className="machine-form-field">

              <label htmlFor="machine-location">
                Ville / Pays
              </label>

              <input
                id="machine-location"
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

          <section className="machine-form-section">

            <div className="form-section-title">

              <span className="form-section-icon">
                📝
              </span>

              <div>

                <h2>
                  Description
                </h2>

                <p>
                  Présentez la machine aux clients.
                </p>

              </div>

            </div>


            <div className="machine-form-field">

              <label htmlFor="machine-description">
                Description de la machine
              </label>

              <textarea
                id="machine-description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Décrivez la machine, son utilisation, ses avantages..."
                rows="6"
                disabled={isSaving}
              />

            </div>

          </section>


          {/* =================================
              PUBLIER
          ================================= */}

          <button
            type="submit"
            className="publish-machine-button"
            disabled={isSaving}
          >

            {isSaving
              ? uploadStatus ||
                "Publication..."
              : "✓ Publier la machine"}

          </button>


          <button
            type="button"
            className="cancel-machine-button"
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


export default AddMachine;