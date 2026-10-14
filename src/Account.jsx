import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import Cropper from "react-easy-crop";

import {
  updateEmail,
  updateProfile,
} from "firebase/auth";

import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "./firebase";

import "./Account.css";


function Account({
  user,
  onBack,
  onLogout,
  onOpenOrders,
  onOpenQuotes,
  onOpenCart,
  onOpenAdmin,
  onHome,
  onCategories,
  onOpenFavorites,
  onUserChanged,
  onOpenPrivacy,
  onOpenSellerSales,
  onOpenClientVideos,
}) {

  const isAdmin =
    user?.role === "admin";


  /* =========================================
     ÉTATS
  ========================================= */

  const [editing, setEditing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);


  /* =========================================
     ROGNAGE PHOTO
  ========================================= */

  const [cropImage, setCropImage] =
    useState("");

  const [crop, setCrop] =
    useState({
      x: 0,
      y: 0,
    });

  const [zoom, setZoom] =
    useState(1);

  const [
    croppedAreaPixels,
    setCroppedAreaPixels,
  ] = useState(null);


  /* =========================================
     INPUT PHOTO
  ========================================= */

  const photoInputRef =
    useRef(null);


  /* =========================================
     INFORMATIONS UTILISATEUR
  ========================================= */

  const [profile, setProfile] =
    useState({
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      photoURL: "",
    });


  /* =========================================
     CHARGER LE PROFIL
  ========================================= */

  useEffect(() => {

    const loadProfile =
      async () => {

        const firebaseUser =
          auth.currentUser;

        const userId =
          firebaseUser?.uid ||
          user?.userId;


        if (!userId) {

          setProfile({
            nom:
              user?.nom || "",

            prenom:
              user?.prenom || "",

            email:
              user?.email || "",

            telephone:
              user?.telephone || "",

            photoURL:
              user?.photoURL || "",
          });

          return;
        }


        try {

          const userReference =
            doc(
              db,
              "users",
              userId
            );


          const snapshot =
            await getDoc(
              userReference
            );


          if (snapshot.exists()) {

            const data =
              snapshot.data();


            setProfile({

              nom:
                data?.nom ||
                user?.nom ||
                "",

              prenom:
                data?.prenom ||
                user?.prenom ||
                "",

              email:
                data?.email ||
                firebaseUser?.email ||
                user?.email ||
                "",

              telephone:
                data?.telephone ||
                user?.telephone ||
                "",

              photoURL:
                data?.photoURL ||
                firebaseUser?.photoURL ||
                user?.photoURL ||
                "",

            });

          } else {

            setProfile({

              nom:
                user?.nom || "",

              prenom:
                user?.prenom || "",

              email:
                firebaseUser?.email ||
                user?.email ||
                "",

              telephone:
                user?.telephone || "",

              photoURL:
                firebaseUser?.photoURL ||
                user?.photoURL ||
                "",

            });

          }

        } catch (error) {

          console.error(
            "Erreur chargement profil :",
            error
          );


          setProfile({

            nom:
              user?.nom || "",

            prenom:
              user?.prenom || "",

            email:
              auth.currentUser?.email ||
              user?.email ||
              "",

            telephone:
              user?.telephone || "",

            photoURL:
              auth.currentUser?.photoURL ||
              user?.photoURL ||
              "",

          });

        }

      };


    loadProfile();

  }, [user]);


  /* =========================================
     MODIFIER UN CHAMP
  ========================================= */

  const handleChange =
    (event) => {

      const {
        name,
        value,
      } = event.target;


      setProfile(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );

    };


  /* =========================================
     CLOUDINARY
  ========================================= */

  const uploadPhotoToCloudinary =
    async (file) => {

      const cloudName =
        import.meta.env
          .VITE_CLOUDINARY_CLOUD_NAME;

      const uploadPreset =
        import.meta.env
          .VITE_CLOUDINARY_UPLOAD_PRESET;


      if (!cloudName) {

        throw new Error(
          "Configuration Cloudinary manquante."
        );

      }


      if (!uploadPreset) {

        throw new Error(
          "Configuration Cloudinary manquante."
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
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
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


      if (!data?.secure_url) {

        throw new Error(
          "Cloudinary n'a pas retourné l'adresse de la photo."
        );

      }


      return data.secure_url;

    };


  /* =========================================
     FIN DU ROGNAGE
  ========================================= */

  const handleCropComplete =
    (
      croppedArea,
      croppedAreaPixelsResult
    ) => {

      setCroppedAreaPixels(
        croppedAreaPixelsResult
      );

    };


  /* =========================================
     CRÉER LA PHOTO ROGNÉE
  ========================================= */

  const createCroppedImage =
    async (
      imageSource,
      cropPixels
    ) => {

      const image =
        new Image();


      image.src =
        imageSource;


      await new Promise(
        (resolve, reject) => {

          image.onload =
            resolve;

          image.onerror =
            reject;

        }
      );


      const canvas =
        document.createElement(
          "canvas"
        );


      const context =
        canvas.getContext(
          "2d"
        );


      if (!context) {

        throw new Error(
          "Impossible de préparer la photo."
        );

      }


      canvas.width =
        800;

      canvas.height =
        800;


      context.drawImage(

        image,

        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,

        0,
        0,
        800,
        800

      );


      const blob =
        await new Promise(
          (resolve, reject) => {

            canvas.toBlob(
              (result) => {

                if (!result) {

                  reject(
                    new Error(
                      "Impossible de rogner la photo."
                    )
                  );

                  return;

                }


                resolve(
                  result
                );

              },

              "image/jpeg",
              0.9

            );

          }
        );


      return new File(
        [blob],
        "photo-profil.jpg",
        {
          type:
            "image/jpeg",
        }
      );

    };


  /* =========================================
     FERMER LE ROGNAGE
  ========================================= */

  const closePhotoCrop =
    () => {

      if (cropImage) {

        URL.revokeObjectURL(
          cropImage
        );

      }


      setCropImage("");

      setCrop({
        x: 0,
        y: 0,
      });

      setZoom(1);

      setCroppedAreaPixels(
        null
      );

    };


  /* =========================================
     CHOISIR UNE PHOTO
  ========================================= */

  const handlePhotoChange =
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
          "Veuillez sélectionner une photo."
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


      const imageURL =
        URL.createObjectURL(
          file
        );


      setCrop({
        x: 0,
        y: 0,
      });

      setZoom(1);

      setCroppedAreaPixels(
        null
      );

      setCropImage(
        imageURL
      );

    };


  /* =========================================
     VALIDER LA PHOTO ROGNÉE
  ========================================= */

  const confirmPhotoCrop =
    async () => {

      if (
        !cropImage ||
        !croppedAreaPixels
      ) {

        await umiNotify(
          "Veuillez ajuster la photo."
        );

        return;

      }


      const firebaseUser =
        auth.currentUser;


      if (!firebaseUser) {

        await umiNotify(
          "Votre session a expiré. Veuillez vous reconnecter."
        );

        return;

      }


      try {

        setUploadingPhoto(
          true
        );


        const croppedFile =
          await createCroppedImage(
            cropImage,
            croppedAreaPixels
          );


        const photoURL =
          await uploadPhotoToCloudinary(
            croppedFile
          );


        await updateProfile(
          firebaseUser,
          {
            photoURL,
          }
        );


        await updateDoc(
          doc(
            db,
            "users",
            firebaseUser.uid
          ),
          {
            photoURL,
          }
        );


        setProfile(
          (previous) => ({
            ...previous,
            photoURL,
          })
        );


        let currentLocalUser =
          {};


        try {

          currentLocalUser =
            JSON.parse(
              localStorage.getItem(
                "umiCurrentUser"
              ) || "{}"
            );

        } catch (error) {

          console.error(
            "Erreur lecture utilisateur local :",
            error
          );

          currentLocalUser =
            {};

        }


        const updatedLocalUser = {

          ...currentLocalUser,

          userId:
            firebaseUser.uid,

          nom:
            profile.nom,

          prenom:
            profile.prenom,

          email:
            profile.email,

          telephone:
            profile.telephone,

          photoURL,

          role:
            currentLocalUser?.role ||
            user?.role ||
            "client",

        };


        localStorage.setItem(
          "umiCurrentUser",
          JSON.stringify(
            updatedLocalUser
          )
        );


        if (onUserChanged) {

          onUserChanged(
            updatedLocalUser
          );

        }


        closePhotoCrop();


      } catch (error) {

        console.error(
          "Erreur modification photo :",
          error
        );


        await umiNotify(
          error?.message ||
          "Impossible de modifier la photo."
        );


      } finally {

        setUploadingPhoto(
          false
        );

      }

    };
      /* =========================================
     ENREGISTRER LES INFORMATIONS
  ========================================= */

  const handleSave =
    async () => {

      const nom =
        profile.nom.trim();

      const prenom =
        profile.prenom.trim();

      const email =
        profile.email
          .trim()
          .toLowerCase();

      const telephone =
        profile.telephone.trim();


      if (
        !nom ||
        !prenom ||
        !email ||
        !telephone
      ) {

        await umiNotify(
          "Veuillez remplir le nom, le prénom, l'e-mail et le téléphone."
        );

        return;

      }


      if (!email.includes("@")) {

        await umiNotify(
          "Veuillez entrer une adresse e-mail valide."
        );

        return;

      }


      const firebaseUser =
        auth.currentUser;


      if (!firebaseUser) {

        await umiNotify(
          "Votre session a expiré. Veuillez vous reconnecter."
        );

        return;

      }


      setSaving(true);


      try {

        /* ================================
           E-MAIL FIREBASE AUTH
        ================================ */

        if (
          firebaseUser.email !==
          email
        ) {

          await updateEmail(
            firebaseUser,
            email
          );

        }


        /* ================================
           NOM + PHOTO FIREBASE AUTH
        ================================ */

        const fullName =
          `${prenom} ${nom}`.trim();


        await updateProfile(
          firebaseUser,
          {
            displayName:
              fullName,

            photoURL:
              profile.photoURL ||
              null,
          }
        );


        /* ================================
           FIRESTORE
        ================================ */

        await updateDoc(
          doc(
            db,
            "users",
            firebaseUser.uid
          ),
          {
            nom,
            prenom,
            email,
            telephone,

            photoURL:
              profile.photoURL ||
              "",
          }
        );


        /* ================================
           SESSION LOCALE
        ================================ */

        let currentLocalUser =
          {};


        try {

          currentLocalUser =
            JSON.parse(
              localStorage.getItem(
                "umiCurrentUser"
              ) || "{}"
            );

        } catch (error) {

          console.error(
            "Erreur lecture utilisateur local :",
            error
          );

          currentLocalUser =
            {};

        }


        const updatedLocalUser = {

          ...currentLocalUser,

          userId:
            firebaseUser.uid,

          nom,

          prenom,

          email,

          telephone,

          photoURL:
            profile.photoURL ||
            "",

          role:
            currentLocalUser?.role ||
            user?.role ||
            "client",

        };


        localStorage.setItem(
          "umiCurrentUser",
          JSON.stringify(
            updatedLocalUser
          )
        );


        if (onUserChanged) {

          onUserChanged(
            updatedLocalUser
          );

        }


        setProfile({
          nom,
          prenom,
          email,
          telephone,

          photoURL:
            profile.photoURL ||
            "",
        });


        setEditing(false);


        await umiNotify(
          "Vos informations ont été mises à jour."
        );


      } catch (error) {

        console.error(
          "Erreur modification profil :",
          error
        );


        if (
          error.code ===
          "auth/requires-recent-login"
        ) {

          await umiNotify(
            "Pour modifier votre adresse e-mail, Firebase demande une connexion récente. Déconnectez-vous, reconnectez-vous puis réessayez."
          );

        }

        else if (
          error.code ===
          "auth/email-already-in-use"
        ) {

          await umiNotify(
            "Cette adresse e-mail est déjà utilisée par un autre compte."
          );

        }

        else if (
          error.code ===
          "auth/invalid-email"
        ) {

          await umiNotify(
            "L'adresse e-mail n'est pas valide."
          );

        }

        else {

          await umiNotify(
            "Impossible de modifier vos informations pour le moment."
          );

        }


      } finally {

        setSaving(false);

      }

    };


  /* =========================================
     ANNULER MODIFICATION
  ========================================= */

  const handleCancel =
    () => {

      setEditing(false);


      const loadOriginal =
        async () => {

          const firebaseUser =
            auth.currentUser;

          const userId =
            firebaseUser?.uid ||
            user?.userId;


          if (!userId) {
            return;
          }


          try {

            const snapshot =
              await getDoc(
                doc(
                  db,
                  "users",
                  userId
                )
              );


            if (snapshot.exists()) {

              const data =
                snapshot.data();


              setProfile({

                nom:
                  data?.nom ||
                  "",

                prenom:
                  data?.prenom ||
                  "",

                email:
                  data?.email ||
                  firebaseUser?.email ||
                  "",

                telephone:
                  data?.telephone ||
                  "",

                photoURL:
                  data?.photoURL ||
                  firebaseUser?.photoURL ||
                  "",

              });

            }


          } catch (error) {

            console.error(
              "Erreur annulation :",
              error
            );

          }

        };


      loadOriginal();

    };


  /* =========================================
     NOM AFFICHÉ
  ========================================= */

  const displayedName =
    [
      profile.prenom,
      profile.nom,
    ]
      .filter(Boolean)
      .join(" ") ||
    user?.nom ||
    "Utilisateur UMI";


  /* =========================================
     AFFICHAGE
  ========================================= */

  return (

    <div className="account-page">


      {/* =====================================
          FENÊTRE DE ROGNAGE PHOTO
      ===================================== */}

      {cropImage && (

        <div className="account-crop-overlay">

          <div className="account-crop-modal">


            <div className="account-crop-header">

              <h2>
                Ajuster la photo
              </h2>


              <button
                type="button"
                className="account-crop-close"
                onClick={closePhotoCrop}
                disabled={uploadingPhoto}
                aria-label="Fermer"
              >
                ×
              </button>

            </div>


            <p className="account-crop-help">
              Déplacez la photo avec le doigt
              ou la souris et utilisez le zoom
              pour choisir la partie à afficher.
            </p>


            <div className="account-crop-area">

              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={
                  handleCropComplete
                }
              />

            </div>


            <div className="account-crop-zoom">

              <span>
                −
              </span>


              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) =>
                  setZoom(
                    Number(
                      event.target.value
                    )
                  )
                }
              />


              <span>
                +
              </span>

            </div>


            <div className="account-crop-actions">

              <button
                type="button"
                className="account-crop-cancel"
                onClick={closePhotoCrop}
                disabled={uploadingPhoto}
              >
                Annuler
              </button>


              <button
                type="button"
                className="account-crop-confirm"
                onClick={confirmPhotoCrop}
                disabled={
                  uploadingPhoto ||
                  !croppedAreaPixels
                }
              >

                {uploadingPhoto
                  ? "Enregistrement..."
                  : "Utiliser cette photo"}

              </button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="account-header">

        <button
          type="button"
          className="account-back"
          onClick={onBack}
          aria-label="Retour"
        >
          ←
        </button>


        <h1>
          Mon compte
        </h1>


        <div className="account-header-icon">

          {profile.photoURL ? (

            <img
              src={profile.photoURL}
              alt="Profil"
              className="account-header-photo"
            />

          ) : (

            <span>
              👤
            </span>

          )}

        </div>

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="account-content">


        {/* ===================================
            PROFIL
        =================================== */}

        <section className="account-profile">


          {/* PHOTO + CRAYON */}

          <div className="account-avatar-container">

            <div className="account-avatar">

              {profile.photoURL ? (

                <img
                  src={profile.photoURL}
                  alt="Photo de profil"
                  className="account-avatar-image"
                />

              ) : (

                <span className="account-avatar-placeholder">
                  👤
                </span>

              )}

            </div>


            {/* INPUT PHOTO UNIQUE ET CACHÉ */}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{
                display: "none",
              }}
            />


            {/* PETIT CRAYON UNIQUEMENT */}

            <button
              type="button"
              className="account-photo-edit"
              onClick={() =>
                photoInputRef.current?.click()
              }
              disabled={uploadingPhoto}
              aria-label="Modifier la photo"
            >

              <span
                className="account-pencil"
                aria-hidden="true"
              >
                <span className="account-pencil-body" />
                <span className="account-pencil-tip" />
              </span>

            </button>

          </div>


          {/* NOM + EMAIL */}

          <div className="account-profile-text">

            <h2>
              {displayedName}
            </h2>

            <p>
              {profile.email}
            </p>


            {isAdmin && (

              <span className="account-admin-badge">
                Administrateur
              </span>

            )}

          </div>

        </section>
                {/* ===================================
            INFORMATIONS
        =================================== */}

        <section className="account-info">

          <div className="account-info-title">

            <h3>
              Mes informations
            </h3>

            {!editing && (

              <button
                type="button"
                className="account-edit-button"
                onClick={() =>
                  setEditing(true)
                }
              >
                ✏️ Modifier
              </button>

            )}

          </div>


          {/* NOM */}

          <div className="account-info-row">

            <span>
              👤
            </span>

            <div className="account-field">

              <small>
                Nom
              </small>

              {editing ? (

                <input
                  type="text"
                  name="nom"
                  value={profile.nom}
                  onChange={handleChange}
                  placeholder="Votre nom"
                  autoComplete="family-name"
                />

              ) : (

                <strong>
                  {profile.nom ||
                    "Non renseigné"}
                </strong>

              )}

            </div>

          </div>


          {/* PRÉNOM */}

          <div className="account-info-row">

            <span>
              👤
            </span>

            <div className="account-field">

              <small>
                Prénom
              </small>

              {editing ? (

                <input
                  type="text"
                  name="prenom"
                  value={profile.prenom}
                  onChange={handleChange}
                  placeholder="Votre prénom"
                  autoComplete="given-name"
                />

              ) : (

                <strong>
                  {profile.prenom ||
                    "Non renseigné"}
                </strong>

              )}

            </div>

          </div>


          {/* EMAIL */}

          <div className="account-info-row">

            <span>
              📧
            </span>

            <div className="account-field">

              <small>
                E-mail
              </small>

              {editing ? (

                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  placeholder="Votre adresse e-mail"
                  autoComplete="email"
                />

              ) : (

                <strong>
                  {profile.email ||
                    "Non renseigné"}
                </strong>

              )}

            </div>

          </div>


          {/* TÉLÉPHONE */}

          <div className="account-info-row">

            <span>
              📱
            </span>

            <div className="account-field">

              <small>
                Téléphone
              </small>

              {editing ? (

                <input
                  type="tel"
                  name="telephone"
                  value={profile.telephone}
                  onChange={handleChange}
                  placeholder="+223 ..."
                  autoComplete="tel"
                />

              ) : (

                <strong>
                  {profile.telephone ||
                    "Non renseigné"}
                </strong>

              )}

            </div>

          </div>


          {/* ACTIONS MODIFICATION */}

          {editing && (

            <div className="account-edit-actions">

              <button
                type="button"
                className="account-cancel-button"
                onClick={handleCancel}
                disabled={saving}
              >
                Annuler
              </button>


              <button
                type="button"
                className="account-save-button"
                onClick={handleSave}
                disabled={saving}
              >

                {saving
                  ? "Enregistrement..."
                  : "Enregistrer"}

              </button>

            </div>

          )}

        </section>


        {/* ===================================
            MENU
        =================================== */}

        <section className="account-menu">
<button type="button" onClick={onOpenClientVideos}><span>🎥</span><div><strong>Vidéo live</strong></div><b>›</b></button>

<button type="button" className="account-privacy-button" onClick={onOpenPrivacy}><span>🔒</span><div><strong>Confidentialité</strong></div><b>›</b></button>


          {/* FAVORIS */}

          <button
            type="button"
            onClick={onOpenFavorites}
          >

            <span>
              ❤️
            </span>

            <div>

              <strong>
                Favoris
              </strong>

              <small>
                Voir mes articles favoris
              </small>

            </div>

            <b>
              ›
            </b>

          </button>


          {/* =================================
              CLIENT
          ================================= */}

          {!isAdmin && (
  <>
    {/* MES COMMANDES */}

    <button
      type="button"
      onClick={onOpenOrders}
    >
      <span>📦</span>

      <div>
        <strong>Mes commandes</strong>
        <small>Suivre mes commandes</small>
      </div>

      <b>›</b>
    </button>

    {/* MES DEVIS */}

    <button
      type="button"
      onClick={onOpenQuotes}
    >
      <span>📄</span>

      <div>
        <strong>Mes devis</strong>
        <small>
          Voir mes demandes et devis reçus
        </small>
      </div>

      <b>›</b>
    </button>

    {/* DEMANDE DE SUPPRESSION DU COMPTE */}

    <button
      type="button"
      onClick={() => {
        const accountEmail =
          auth.currentUser?.email ||
          user?.email ||
          "";

        const accountId =
          auth.currentUser?.uid ||
          user?.userId ||
          user?.uid ||
          "";

        const subject =
          "UMI — Demande de suppression de mon compte";

        const body = [
          "Bonjour UMI,",
          "",
          "Je demande la suppression définitive de mon compte UMI et des données personnelles associées.",
          "",
          `Adresse e-mail du compte : ${accountEmail}`,
          `Identifiant du compte : ${accountId}`,
          "",
          "Merci de me confirmer le traitement de ma demande.",
        ].join("\n");

        window.location.href =
          "mailto:umindustrielles.group@gmail.com" +
          "?subject=" +
          encodeURIComponent(subject) +
          "&body=" +
          encodeURIComponent(body);
      }}
    >
      <span style={{ color: "#dc2626" }}>
        🗑️
      </span>

      <div>
        <strong style={{ color: "#dc2626" }}>
          Demander la suppression de mon compte
        </strong>

        <small>
          Ouvrir un e-mail à envoyer à UMI
        </small>
      </div>

      <b>›</b>
    </button>

    {/* DÉCONNEXION */}

    <button
      type="button"
      className="account-menu-logout"
      onClick={onLogout}
    >
      <span>↪</span>

      <div>
        <strong>Se déconnecter</strong>
        <small>Quitter votre compte UMI</small>
      </div>

      <b>›</b>
    </button>
  </>
)}
          {/* =================================
              ADMIN
          ================================= */}

          {isAdmin && (

            <>

              <button
                type="button"
                className="account-admin-button"
                onClick={onOpenAdmin}
              >

                <span>
                  ⚙️
                </span>

                <div>

                  <strong>
                    Administration UMI
                  </strong>

                  <small>
                    Accéder à l'administration
                  </small>

                </div>

                <b>
                  ›
                </b>

              </button>


                            <button
                type="button"
                className="account-menu-logout"
                onClick={onLogout}
              >

                <span>
                  ↪
                </span>

                <div>

                  <strong>
                    Se déconnecter
                  </strong>

                  <small>
                    Quitter votre compte UMI
                  </small>

                </div>

                <b>
                  ›
                </b>

              </button>

            </>

          )}

        </section>

      </main>


      {/* =====================================
          BARRE DES TÂCHES
      ===================================== */}

      <nav className="account-bottom-nav">


        {/* ACCUEIL */}

        <button
          type="button"
          onClick={onHome}
        >

          <span className="account-nav-icon">
            🏠
          </span>

          <small>
            Accueil
          </small>

        </button>


        {/* CATÉGORIES */}

        <button
          type="button"
          onClick={onCategories}
        >

          <span className="account-nav-icon">
            ▦
          </span>

          <small>
            Catégories
          </small>

        </button>


        {/* PANIER */}

        <button
          type="button"
          onClick={onOpenCart}
        >

          <span className="account-nav-icon">
            🛒
          </span>

          <small>
            Panier
          </small>

        </button>


        {/* COMPTE */}

        <button
          type="button"
          className="account-nav-account-active"
        >

          <span className="account-nav-icon">

            {profile.photoURL ? (

              <img
                src={profile.photoURL}
                alt="Compte"
                className="account-bottom-profile-photo"
              />

            ) : (

              <span>
                👤
              </span>

            )}

          </span>

          <small>
            Compte
          </small>

        </button>

      </nav>

    </div>

  );

}


export default Account;