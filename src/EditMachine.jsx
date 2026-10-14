import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
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
const [machineModels, setMachineModels] = useState(() =>
  Array.isArray(machine?.models)
    ? machine.models.map((item) => ({
        ...item,
        id: item.id || crypto.randomUUID(),
        name: item.name ?? "",
        capacity: String(item.capacity ?? ""),
        price: String(item.price ?? ""),
        power: String(item.power ?? ""),
        year: String(item.year ?? ""),
        warranty: String(item.warranty ?? ""),
        availability: String(item.availability ?? ""),

        images: Array.from(
          new Set([
            ...(Array.isArray(item.images) ? item.images : []),
            ...(item.imageUrl ? [item.imageUrl] : []),
          ])
        ),

        videos: Array.from(
          new Set([
            ...(Array.isArray(item.videos) ? item.videos : []),
            ...(item.videoUrl ? [item.videoUrl] : []),
          ])
        ),

        imageFiles: [],
        videoFiles: [],
      }))
    : []
);

const addMachineModel = () => {
  setMachineModels((current) => [
    ...current,
    {
      id: crypto.randomUUID(),
      name: "",
      capacity: "",
      price: "",
      power: "",
      year: "",
      warranty: "",
      availability: "",
      images: [],
      videos: [],
      imageFiles: [],
      videoFiles: [],
    },
  ]);
};
const updateMachineModel = (modelId, field, value) => {
  setMachineModels((current) =>
    current.map((item) =>
      item.id === modelId
        ? { ...item, [field]: value }
        : item
    )
  );
};

const removeMachineModel = (modelId) => {
  setMachineModels((current) =>
    current.filter((item) => item.id !== modelId)
  );
};
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
    "Machine de fabrication plastique et recyclage",
    "Produits chimiques & entretien",
    "Cosmétiques",
    "Agriculture & élevage",
    "Construction & BTP",
    "Bois & menuiserie",
    "Textile & habillement",
    "Papier & impression",
    "Énergie & équipements",
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

      umiNotify(
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

      umiNotify(
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

      umiNotify(
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

      umiNotify(
        "Veuillez sélectionner une vidéo."
      );

      event.target.value = "";

      return;
    }


    if (
      file.size >
      100 * 1024 * 1024
    ) {

      umiNotify(
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

  const removeCurrentVideo = async () => {

    const confirmation =
      await umiAsk(
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

        await umiNotify(
          "Veuillez entrer le nom de la machine."
        );

        return;
      }


      if (!category) {

        await umiNotify(
          "Veuillez sélectionner une catégorie."
        );

        return;
      }


      if (machineModels.length === 0) {
  await umiNotify("Veuillez ajouter au moins un modèle.");
  return;
}

if (
  machineModels.some(
    (item) =>
      !item.name.trim() ||
      !String(item.price ?? "").trim() ||
      !Number.isFinite(Number(item.price)) ||
      Number(item.price) <= 0
  )
) {
  await umiNotify(
    "Veuillez renseigner le nom et un prix valide pour chaque modèle."
  );
  return;
}


      if (!machine?.id) {

        await umiNotify(
          "Identifiant de la machine introuvable."
        );

        return;
      }

if (
  currentImages.length === 0 &&
  !machineModels.some(
    (item) =>
      item.images?.length > 0 ||
      item.imageFiles?.length > 0
  )
) {
  await umiNotify("Veuillez ajouter au moins une photo dans un modèle.");
  return;
}

      try {

        setIsSaving(true);

        setUploadStatus(
          "Préparation..."
        );


        const finalImages = [...currentImages];
const finalVideoUrl = currentVideoUrl;
        /* =====================================
           PRÉPARER LES DONNÉES
        ===================================== */

        setUploadStatus(
          "Enregistrement de la machine..."
        );
const uploadedModels = [];

for (const item of machineModels) {
  const modelImages = [...(item.images || [])];
  const modelVideos = [...(item.videos || [])];
  const imageFiles = item.imageFiles || [];
  const videoFiles = item.videoFiles || [];

  if (modelImages.length + imageFiles.length > 6) {
    throw new Error(
      `Le modèle ${item.name} dépasse la limite de 6 photos.`
    );
  }

  if (modelVideos.length + videoFiles.length > 3) {
    throw new Error(
      `Le modèle ${item.name} dépasse la limite de 3 vidéos.`
    );
  }

  for (const [index, file] of imageFiles.entries()) {
    setUploadStatus(
      `Modèle ${item.name} : envoi de la photo ${index + 1}...`
    );

    const url = await uploadToCloudinary(file, "image");
    modelImages.push(url);
  }

  for (const [index, file] of videoFiles.entries()) {
    setUploadStatus(
      `Modèle ${item.name} : envoi de la vidéo ${index + 1}...`
    );

    const url = await uploadToCloudinary(file, "video");
    modelVideos.push(url);
  }

  uploadedModels.push({
    id: item.id,
    name: item.name.trim(),
    capacity: String(item.capacity ?? "").trim(),
    price: Number(item.price),
    power: String(item.power ?? "").trim(),
    year: String(item.year ?? "").trim(),
    warranty: String(item.warranty ?? "").trim(),
    availability: String(item.availability ?? "").trim(),
    images: modelImages,
    videos: modelVideos,
    imageUrl: modelImages[0] || "",
    videoUrl: modelVideos[0] || "",
  });
}
        const updatedMachine = {

          name:
            name.trim(),

          category,

          condition,

          brand:
            brand.trim(),

          model:
            model.trim(),
models: uploadedModels,
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
  uploadedModels.find(
    (item) => item.images?.length > 0
  )?.images[0] ||
  finalImages[0] ||
  "",

images: Array.from(
  new Set([
    ...finalImages,
    ...uploadedModels.flatMap(
      (item) => item.images || []
    ),
  ])
),

videoUrl:
  uploadedModels.find(
    (item) => item.videos?.length > 0
  )?.videos[0] ||
  finalVideoUrl ||
  "",

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


        await umiNotify(
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


        await umiNotify(
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

  

          </section>

<section className="edit-form-section">
  <div className="edit-section-title">
    <span className="edit-section-icon">⚙️</span>
    <div>
      <h2>Machine et modèles</h2>
      <p>Modifiez les informations de chaque modèle.</p>
    </div>
  </div>

  <div
    className="edit-form-field"
    style={{ gridColumn: "1 / -1" }}
  >
    <label htmlFor="edit-machine-name">
      Nom de la machine
    </label>

    <input
      id="edit-machine-name"
      type="text"
      value={name}
      onChange={(event) => setName(event.target.value)}
      disabled={isSaving}
      required
    />
  </div>

  {machineModels.map((item, index) => (
    <div key={item.id} className="edit-model-card">
      <div className="edit-model-header">
        <strong>Modèle {index + 1}</strong>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => removeMachineModel(item.id)}
        >
          Retirer ce modèle
        </button>
      </div>

      <div className="edit-model-fields">
        {[
          ["name", "Nom du modèle"],
          ["capacity", "Capacité de production"],
          ["price", "Prix en FCFA"],
          ["power", "Puissance"],
          ["year", "Année de fabrication"],
          ["warranty", "Garantie"],
                    ["availability", "Disponibilité"],
        ].map(([field, label]) => (
          <div className="edit-form-field" key={field}>
            <label htmlFor={`edit-model-${field}-${item.id}`}>
              {label}
            </label>

            {field === "availability" ? (
              <select
                id={`edit-model-${field}-${item.id}`}
                value={item[field] ?? ""}
                disabled={isSaving}
                onChange={(event) =>
                  updateMachineModel(
                    item.id,
                    field,
                    event.target.value
                  )
                }
              >
                <option value="">
                  Sélectionnez la disponibilité
                </option>

                {item[field] &&
                  ![
                    "Disponible en stock",
                    "Acheter en chine",
                  ].includes(item[field]) && (
                    <option value={item[field]}>
                      {item[field]}
                    </option>
                  )}

                <option value="Disponible en stock">
                  Disponible en stock
                </option>

                <option value="Acheter en chine">
                  Acheter en chine
                </option>
              </select>
            ) : (
              <input
                id={`edit-model-${field}-${item.id}`}
                type={field === "price" ? "number" : "text"}
                min={field === "price" ? "1" : undefined}
                step={field === "price" ? "1" : undefined}
                value={item[field] ?? ""}
                disabled={isSaving}
                required={field === "name" || field === "price"}
                onChange={(event) =>
                  updateMachineModel(
                    item.id,
                    field,
                    event.target.value
                  )
                }
              />
            )}
          </div>
        ))}
      </div>

      <div className="edit-form-field">
        <label>Photos enregistrées</label>

        <div className="edit-images-grid">
          {(item.images || []).map((url, photoIndex) => (
            <div className="edit-image-item" key={url}>
              <img
                src={url}
                alt={`Modèle ${index + 1}, photo ${photoIndex + 1}`}
              />

              <button
                type="button"
                className="edit-remove-media"
                aria-label={`Retirer la photo ${photoIndex + 1}`}
                disabled={isSaving}
                onClick={() =>
                  updateMachineModel(
                    item.id,
                    "images",
                    item.images.filter(
                      (_, position) => position !== photoIndex
                    )
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <label htmlFor={`edit-model-photos-${item.id}`}>
          Ajouter des photos — 6 au total maximum
        </label>

        <input
          id={`edit-model-photos-${item.id}`}
          type="file"
          accept="image/*"
          multiple
          disabled={isSaving}
          onChange={(event) => {
            const files = Array.from(event.target.files || []);

            if (
              files.some(
                (file) => !file.type.startsWith("image/")
              ) ||
              files.length + (item.images?.length || 0) > 6
            ) {
              umiNotify("Choisissez des photos, avec un maximum de 6 au total.");
              event.target.value = "";
              return;
            }

            updateMachineModel(item.id, "imageFiles", files);
          }}
        />

        <small>
          {item.imageFiles?.length || 0} nouvelle(s) photo(s)
        </small>
      </div>

      <div className="edit-form-field">
        <label>Vidéos enregistrées</label>

        {(item.videos || []).map((url, videoIndex) => (
          <div className="edit-video-box" key={url}>
            <video src={url} controls preload="metadata" />

            <button
              type="button"
              className="edit-delete-video"
              disabled={isSaving}
              onClick={() =>
                updateMachineModel(
                  item.id,
                  "videos",
                  item.videos.filter(
                    (_, position) => position !== videoIndex
                  )
                )
              }
            >
              Retirer cette vidéo
            </button>
          </div>
        ))}

        <label htmlFor={`edit-model-videos-${item.id}`}>
          Ajouter des vidéos — 3 au total maximum
        </label>

        <input
          id={`edit-model-videos-${item.id}`}
          type="file"
          accept="video/*"
          multiple
          disabled={isSaving}
          onChange={(event) => {
            const files = Array.from(event.target.files || []);

            if (
              files.some(
                (file) => !file.type.startsWith("video/")
              ) ||
              files.length + (item.videos?.length || 0) > 3
            ) {
              umiNotify("Choisissez des vidéos, avec un maximum de 3 au total.");
              event.target.value = "";
              return;
            }

            updateMachineModel(item.id, "videoFiles", files);
          }}
        />

        <small>
          {item.videoFiles?.length || 0} nouvelle(s) vidéo(s)
        </small>
      </div>
    </div>
  ))}

  <button
    type="button"
    className="edit-cancel-button"
    style={{ gridColumn: "1 / -1" }}
    onClick={addMachineModel}
    disabled={isSaving}
  >
    + Ajouter un modèle
  </button>
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