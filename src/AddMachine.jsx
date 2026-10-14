import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import { useState } from "react";
import { getAuth } from "firebase/auth";
import {

  addDoc,

  collection,

  serverTimestamp,

} from "firebase/firestore";

import { db } from "./firebase";

import "./AddMachine.css";

import logoUmi from "./assets/logo-umi.jpeg";
const createModelId = () => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `model-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};
function AddMachine({

  onBack,

  onSaveMachine,

}) {

  /* =========================================

     INFORMATIONS

  ========================================= */
const [importLink, setImportLink] = useState("");
const [isImporting, setIsImporting] = useState(false);
const [importNotice, setImportNotice] = useState("");

const handleImportMachine = async () => {
  if (isImporting || isSaving) return;

  // Accepte aussi un message partagé contenant un lien.
  const foundLink = importLink.match(
    /https?:\/\/[^\s<>"“”]+/i
  );

  if (!foundLink) {
    await umiNotify("Collez le lien de la fiche produit.");
    return;
  }

  const currentUser = getAuth().currentUser;

  if (!currentUser) {
    await umiNotify(
      "Veuillez vous connecter avec votre compte administrateur."
    );
    return;
  }

  const serverUrl = String(
    import.meta.env.VITE_API_URL || ""
  ).trim().replace(/\/+$/, "");

  if (!serverUrl) {
    await umiNotify(
      "L'adresse du serveur d'importation n'est pas configurée."
    );
    return;
  }

  if (
    name.trim() ||
    description.trim() ||
    machineModels.length > 0
  ) {
    const confirmed = await umiAsk(
      "Remplacer les informations et les modèles actuels par ceux du lien ?"
    );

    if (!confirmed) return;
  }

  setIsImporting(true);
  setImportNotice("Récupération des informations…");

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    65000
  );

  try {
    const token = await currentUser.getIdToken();

    const response = await fetch(
      `${serverUrl}/import-machine`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: foundLink[0],
        }),
        signal: controller.signal,
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || !data) {
      throw new Error(
        data?.error || "Impossible de récupérer cette fiche."
      );
    }

    const validMedia = (values, maximum) =>
      [...new Set(
        (Array.isArray(values) ? values : []).filter(
          (value) => {
            if (typeof value !== "string") return false;

            try {
              const url = new URL(value);
              return ["https:", "http:"].includes(url.protocol);
            } catch {
              return false;
            }
          }
        )
      )].slice(0, maximum);

    const images = validMedia(data.images, 6);
    const videos = validMedia(data.videos, 3);
    const importedName =
      typeof data.name === "string" ? data.name : "";

    if (
      !importedName &&
      !data.description &&
      !images.length &&
      !videos.length
    ) {
      throw new Error(
        "Aucune information produit exploitable trouvée sur cette page."
      );
    }

    const importedPrice = Number(data.price);

    setName(importedName);
    setDescription(
      typeof data.description === "string"
        ? data.description
        : ""
    );
    setBrand(
      typeof data.brand === "string" ? data.brand : ""
    );
    setModel(
      typeof data.model === "string" ? data.model : ""
    );

    // La catégorie reste à sélectionner manuellement.
    setMachineModels([
      {
        id: createModelId(),
        name:
          typeof data.model === "string" && data.model.trim()
            ? data.model
            : importedName,
        capacity: "",
        price:
          Number.isFinite(importedPrice) && importedPrice > 0
            ? String(importedPrice)
            : "",
        power: "",
        year: "",
        warranty: "",
        availability: "",
        imageFiles: [],
        videoFiles: [],
        images,
        videos,
      },
    ]);

    const warnings = Array.isArray(data.warnings)
      ? data.warnings.filter(
          (item) => typeof item === "string"
        )
      : [];

    setImportNotice(
      [
        "Fiche préremplie. Vérifiez le nom, le modèle, le prix et les médias, puis sélectionnez une catégorie.",
        ...warnings,
      ].join("\n")
    );
  } catch (error) {
    const message =
      error.name === "AbortError"
        ? "Le site met trop de temps à répondre. Réessayez."
        : error.message || "Importation impossible.";

    setImportNotice(message);
    await umiNotify(message);
  } finally {
    clearTimeout(timeout);
    setIsImporting(false);
  }
};
  const [name, setName] = useState("");

const [category, setCategory] = useState("");

const [price, setPrice] = useState("");

const [condition] = useState("");

/* MODÈLES DE LA MACHINE ET LEURS PRIX */

const [machineModels, setMachineModels] = useState([]);

const addMachineModel = () => {

  setMachineModels((current) => [

    ...current,

    {

     id: createModelId(),

      name: "",

      capacity: "",

      price: "",

      power: "",

      year: "",

      warranty: "",

      availability: "",

      imageFiles: [],

      videoFiles: [],

      images: [],

      videos: [],

    },

  ]);

};

const updateMachineModel = (modelId, field, value) => {

  setMachineModels((current) =>

    current.map((item) =>

      item.id === modelId

        ? {

            ...item,

            [field]: value,

          }

        : item

    )

  );

};

const removeMachineModel = (modelId) => {

  setMachineModels((current) =>

    current.filter((item) => item.id !== modelId)

  );

};

  const [brand, setBrand] = useState("");

  const [model, setModel] = useState("");

  const [capacity, setCapacity] = useState("");

  const [power, setPower] = useState("");

  const [year, setYear] = useState("");

  const [warranty, setWarranty] = useState("");

  const [location, setLocation] = useState("");

  const [description, setDescription] = useState("");

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
if (isImporting || isSaving) return;
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

        if (

  !machineModels.some(

   (item) =>
  item.imageFiles?.length > 0 ||
  item.images?.length > 0

  )

) {

  await umiNotify("Veuillez ajouter au moins une photo dans un modèle.");

  return;

}

      try {

        setIsSaving(true);

        /* =====================================

           DONNÉES MACHINE

        ===================================== */

        setUploadStatus(

          "Publication de la machine..."

        );

const uploadedModels = [];

for (const item of machineModels) {

const modelImages = [...(item.images || [])];
const modelVideos = [...(item.videos || [])];

  for (const [index, file] of (item.imageFiles || []).entries()) {

    setUploadStatus(

      `Modèle ${item.name} : envoi de la photo ${index + 1}...`

    );

    const url = await uploadToCloudinary(file, "image");

    modelImages.push(url);

  }

  for (const [index, file] of (item.videoFiles || []).entries()) {

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

        const machineData = {

  name: name.trim(),

  category,

  condition,

  brand: brand.trim(),

  model: model.trim(),

  models: uploadedModels,

  capacity: capacity.trim(),

  power: power.trim(),

  year: year.toString().trim(),

  warranty: warranty.trim(),

  location: location.trim(),

  description: description.trim(),

  imageUrl:

  uploadedModels.find(

    (item) => item.images?.length > 0

  )?.images[0] || "",

images: uploadedModels.flatMap(

  (item) => item.images || []

),

videoUrl:

  uploadedModels.find(

    (item) => item.videos?.length > 0

  )?.videos[0] || "",

  createdAt: serverTimestamp(),

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

        await umiNotify(

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

        await umiNotify(

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

          EN-TÊTE

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

            Ajouter une machine

          </h1>

          <p>

            Ajoutez les informations,

            les photos et la vidéo de la machine.

          </p>

        </div>

        <form

          className="add-machine-form"

          onSubmit={handleSubmit}

        >
<section className="add-form-section">
  <div className="add-section-title">
    <div>
      <h2>Importer depuis un lien</h2>
      <p>
        Collez le lien ou le message partagé du produit.
      </p>
    </div>
  </div>

  <div className="add-form-field">
    <label htmlFor="machine-import-link">
      Lien du produit
    </label>

    <textarea
      id="machine-import-link"
      value={importLink}
      onChange={(event) =>
        setImportLink(event.target.value)
      }
      placeholder="https://..."
      rows={3}
      disabled={isSaving || isImporting}
    />
  </div>

  <button
    type="button"
    className="add-cancel-button"
    onClick={handleImportMachine}
    disabled={
      isSaving ||
      isImporting ||
      !importLink.trim()
    }
  >
    {isImporting
      ? "Récupération en cours…"
      : "Importer les informations"}
  </button>

  {importNotice && (
    <p
      role="status"
      style={{
        whiteSpace: "pre-line",
        lineHeight: 1.5,
        overflowWrap: "anywhere",
      }}
    >
      {importNotice}
    </p>
  )}
</section>
          {/* =================================

              INFORMATIONS PRINCIPALES

          ================================= */}

          <section className="add-form-section">

            <div className="add-section-title">

              <span className="add-section-icon">

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

            

          </section>

<section className="add-form-section">

  <div className="add-section-title">

    <span className="add-section-icon">⚙️</span>

    <div>

      <h2>Machine et modèles</h2>

      <p>Ajoutez les informations de chaque modèle.</p>

    </div>

  </div>

  <div
  className="add-form-field"
  style={{ gridColumn: "1 / -1" }}
>
  <label htmlFor="add-machine-name">
    Nom de la machine
  </label>

  <input
    id="add-machine-name"
    type="text"
    value={name}
    onChange={(event) => setName(event.target.value)}
    disabled={isSaving}
    required
  />
</div>

<div
  className="add-form-field"
  style={{ gridColumn: "1 / -1" }}
>
  <label htmlFor="add-category">
    Catégorie
    <span className="add-required">*</span>
  </label>

  <select
    id="add-category"
    value={category}
    onChange={(event) =>
      setCategory(event.target.value)
    }
    disabled={isSaving}
    required
  >
    {!category && (
      <option value="" disabled>
        Sélectionnez une catégorie
      </option>
    )}

    {categories.map((item) => (
      <option key={item} value={item}>
        {item}
      </option>
    ))}
  </select>
</div>

  {machineModels.map((item, index) => (

    <div key={item.id} className="add-model-card">

      <div className="add-model-header">

        <strong>Modèle {index + 1}</strong>

        <button

          type="button"

          disabled={isSaving}

          onClick={() => removeMachineModel(item.id)}

        >

          Retirer ce modèle

        </button>

      </div>

      <div className="add-model-fields">

        {[

          ["name", "Nom du modèle"],

          ["capacity", "Capacité de production"],

          ["price", "Prix en FCFA"],

          ["power", "Puissance"],

          ["year", "Année de fabrication"],

          ["warranty", "Garantie"],

          
          ["availability", "Disponibilité"],
        ].map(([field, label]) => (
          <div className="add-form-field" key={field}>
            <label htmlFor={`model-${field}-${item.id}`}>
              {label}
            </label>

            {field === "availability" ? (
              <select
                id={`model-${field}-${item.id}`}
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

                <option value="Disponible en stock">
                  Disponible en stock
                </option>

                <option value="Acheter en chine">
                  Acheter en chine
                </option>
              </select>
            ) : (
              <input
                id={`model-${field}-${item.id}`}
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

      <div className="add-form-field">

        <label>Photos enregistrées</label>

        <div className="add-images-grid">

          {(item.images || []).map((url, photoIndex) => (

            <div className="add-image-item" key={url}>

              <img

                src={url}

                alt={`Modèle ${index + 1}, photo ${photoIndex + 1}`}

              />

              <button

                type="button"

                className="add-remove-media"

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

        <label htmlFor={`add-model-photos-${item.id}`}>

          Ajouter des photos — 6 au total maximum

        </label>

        <input

          id={`add-model-photos-${item.id}`}

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

      <div className="add-form-field">

        <label>Vidéos enregistrées</label>

        {(item.videos || []).map((url, videoIndex) => (

          <div className="add-video-box" key={url}>

            <video src={url} controls preload="metadata" />

            <button

              type="button"

              className="add-delete-video"

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

        <label htmlFor={`add-model-videos-${item.id}`}>

          Ajouter des vidéos — 3 au total maximum

        </label>

        <input

          id={`add-model-videos-${item.id}`}

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

    className="add-cancel-button"

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

          <section className="add-form-section">

            <div className="add-section-title">

              <span className="add-section-icon">

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

            <div className="add-form-field">

              <label htmlFor="add-description">

                Description de la machine

              </label>

              <textarea

                id="add-description"

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

            className="add-save-button"

            disabled={isSaving || isImporting}

          >

            {isSaving

              ? uploadStatus ||

                "Publication..."

              : "✓ Publier la machine"}

          </button>

          <button

            type="button"

            className="add-cancel-button"

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