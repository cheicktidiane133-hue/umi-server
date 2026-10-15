import { getProductPrice } from "./productPrice";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "./firebase";

import "./Home.css";

import logoUmi from "./assets/logo-umi.jpeg";
import vid1 from "./assets/vid1.mp4";
function getVideoEmbedUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    const isDomain = (domain) =>
      host === domain ||
      host.endsWith(`.${domain}`);

    if (
      isDomain("youtube.com") ||
      isDomain("youtu.be")
    ) {
      const videoId = isDomain("youtu.be")
        ? url.pathname.split("/").filter(Boolean)[0]
        : url.searchParams.get("v") ||
          url.pathname.match(
            /^\/(?:shorts|embed|live)\/([^/]+)/
          )?.[1];

      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId || "")) {
        return "";
      }

      return (
  `https://www.youtube.com/embed/${videoId}` +
  "?autoplay=1&mute=0&playsinline=1&controls=1"
);
    }

    if (isDomain("tiktok.com")) {
      const videoId = url.pathname.match(
        /\/(?:video|player\/v1)\/(\d+)/
      )?.[1];

      return videoId
        ? `https://www.tiktok.com/player/v1/${videoId}`
        : "";
    }

    if (isDomain("facebook.com")) {
      return (
        "https://www.facebook.com/plugins/video.php" +
        `?href=${encodeURIComponent(url.href)}` +
        "&show_text=false"
      );
    }

    return "";
  } catch {
    return "";
  }
}
function Home({

  user = null,

  machines = [],

  isProductFavorite = () => false,

  onToggleFavorite = async () => false,

  onOpenProduct,

  onOpenMachines,

  onOpenCategories,

  onOpenUmiLive,

  onOpenAccount,

  onOpenQuote,

  onOpenCart,

  onOpenRawMaterials,

  onOpenChat,

  onOpenPackaging,

  quoteUnreadCount = 0,

  chatUnreadCount = 0,

}) {
  const [homeVideoMuted, setHomeVideoMuted] = useState(true);
  /* =========================================
     PHOTO UTILISATEUR
  ========================================= */

  const [userPhoto, setUserPhoto] =
    useState("");

  useEffect(() => {
    let active = true;

    const loadUserPhoto = async () => {
      /*
       * 1. On regarde d'abord les informations
       * déjà disponibles dans l'application.
       */

      let savedUser = null;

      try {
        savedUser = JSON.parse(
          localStorage.getItem("umiCurrentUser") ||
            "null"
        );
      } catch (error) {
        console.error(
          "Erreur lecture utilisateur local :",
          error
        );
      }

      const localPhoto =
        user?.photoURL ||
        savedUser?.photoURL ||
        auth.currentUser?.photoURL ||
        "";

      if (active && localPhoto) {
        setUserPhoto(localPhoto);
      }

      /*
       * 2. Ensuite on récupère la version
       * officielle du profil dans Firestore.
       */

      const userId =
        auth.currentUser?.uid ||
        user?.userId ||
        savedUser?.userId;

      if (!userId) {
        if (active && !localPhoto) {
          setUserPhoto("");
        }

        return;
      }

      try {
        const snapshot = await getDoc(
          doc(db, "users", userId)
        );

        if (!snapshot.exists()) {
          return;
        }

        const data = snapshot.data();

        const firestorePhoto =
          data?.photoURL ||
          auth.currentUser?.photoURL ||
          localPhoto ||
          "";

        if (active) {
          setUserPhoto(firestorePhoto);
        }

        /*
         * On remet également la photo dans
         * umiCurrentUser pour les prochaines pages.
         */

        if (firestorePhoto) {
          const updatedUser = {
            ...(savedUser || {}),
            ...(user || {}),
            userId,
            photoURL: firestorePhoto,
          };

          localStorage.setItem(
            "umiCurrentUser",
            JSON.stringify(updatedUser)
          );
        }
      } catch (error) {
        console.error(
          "Erreur chargement photo accueil :",
          error
        );

        /*
         * Si Firestore échoue, on conserve
         * quand même la photo locale.
         */

        if (active && localPhoto) {
          setUserPhoto(localPhoto);
        }
      }
    };

    loadUserPhoto();

    return () => {
      active = false;
    };
  }, [user]);
/* =========================================
   MÉDIA D'ACCUEIL
   PHOTO OU VIDÉO
========================================= */
const [homeMedias, setHomeMedias] = useState([
  {
    id: "default",
    type: "video",
       url: "https://res.cloudinary.com/ytsurq7u/video/upload/v1791562814/sdrh2xkavcblfdnkpnlp.mp4",
    text: "",
    duration: 5,
    isLive: false,
  },
]);

const [mediaIndex, setMediaIndex] = useState(0);

const homeMedia = homeMedias[mediaIndex] || homeMedias[0];

const nextHomeMedia = () => {
  setMediaIndex(
    (current) => (current + 1) % homeMedias.length
  );
};

/* CHARGER LES MÉDIAS */

useEffect(() => {
  let active = true;

  const loadHomeMedia = async () => {
    try {
      const snapshot = await getDoc(
        doc(db, "settings", "homeMedia")
      );

      if (!active || !snapshot.exists()) return;

      const data = snapshot.data();

      const savedMedias = Array.isArray(data.medias)
        ? data.medias
        : data.url
          ? [data]
          : [];

      const validMedias = savedMedias
        .filter(
          (media) =>
            media.url &&
            ["image", "video"].includes(media.type)
        )
        .slice(0, 12);

      if (validMedias.length > 0) {
        setHomeMedias(validMedias);
        setMediaIndex(0);
      }
    } catch (error) {
      console.error(
        "Erreur chargement médias accueil :",
        error
      );
    }
  };

  loadHomeMedia();

  return () => {
    active = false;
  };
}, []);

/* DÉFILEMENT AUTOMATIQUE DES PHOTOS */

useEffect(() => {
  if (homeMedia.type !== "image") return;

  const duration = Math.min(
    60,
    Math.max(2, Number(homeMedia.duration) || 5)
  );

  const timer = setTimeout(() => {
    setMediaIndex(
      (current) => (current + 1) % homeMedias.length
    );
  }, duration * 1000);

  return () => clearTimeout(timer);
}, [homeMedia, mediaIndex, homeMedias.length]);
  /* =========================================
     RECHERCHE TEXTE
  ========================================= */

  const [searchText, setSearchText] =
    useState("");

  const filteredMachines = useMemo(() => {
    const search =
      searchText.trim().toLowerCase();

    if (!search) {
      return [];
    }

    return machines.filter((machine) => {
      const information = [
        machine?.name,
        machine?.category,
        machine?.brand,
        machine?.model,
        machine?.description,
        machine?.condition,
        machine?.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return information.includes(search);
    });
  }, [machines, searchText]);

  /* =========================================
     RECHERCHE PAR IMAGE
  ========================================= */

  const fileInputRef = useRef(null);

  const [
    imageSearchLoading,
    setImageSearchLoading,
  ] = useState(false);

  const handleImageSearch = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setImageSearchLoading(true);

    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        const response = await fetch(
          "https://umi-server.onrender.com/search-machine-image",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              image: reader.result,
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          console.error(
            "Erreur recherche image :",
            data
          );

          return;
        }

        const keywords =
          data.keywords ||
          data.search ||
          data.result ||
          "";

        if (keywords) {
          setSearchText(keywords);
        }
      } catch (error) {
        console.error(
          "Erreur recherche image :",
          error
        );
      } finally {
        setImageSearchLoading(false);
      }
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  };

  /* =========================================
     MACHINES POPULAIRES
     TOUTES LES MACHINES
  ========================================= */

  const [
    popularStart,
    setPopularStart,
  ] = useState(0);

  useEffect(() => {
    if (machines.length <= 2) {
      return;
    }

    const interval =
      setInterval(() => {
        setPopularStart(
          (current) => {
            return (
              (current + 2) %
              machines.length
            );
          }
        );
      }, 5000);

    return () =>
      clearInterval(interval);
  }, [machines.length]);

  const popularMachines =
    useMemo(() => {
      if (
        !Array.isArray(machines) ||
        machines.length === 0
      ) {
        return [];
      }

      if (machines.length <= 2) {
        return machines;
      }

      const firstMachine =
        machines[popularStart];

      const secondMachine =
        machines[
          (popularStart + 1) %
            machines.length
        ];

      const rotatingIds =
        new Set([
          firstMachine?.id,
          secondMachine?.id,
        ]);

      const otherMachines =
        machines.filter(
          (machine) =>
            !rotatingIds.has(
              machine?.id
            )
        );

      return [
        firstMachine,
        secondMachine,
        ...otherMachines,
      ].filter(Boolean);
    }, [machines, popularStart]);

  /* =========================================
     CARTE MACHINE
  ========================================= */

  const renderMachineCard = (
    machine,
    index,
    showPopularBadge = false
  ) => {
    return (
      <article
        className="machine-card"
        key={machine?.id || index}
        onClick={() =>
          onOpenProduct?.(machine)
        }
      >
        <div className="machine-photo">
          {machine?.imageUrl ||
          machine?.image ? (
            <img
              src={
                machine.imageUrl ||
                machine.image
              }
              alt={
                machine?.name ||
                "Machine industrielle"
              }
            />
          ) : (
            <div className="machine-no-image">
              ⚙️
            </div>
          )}

          {showPopularBadge && (
            <span className="machine-badge">
              Populaire
            </span>
          )}

          <button
  type="button"
  className={`favorite-button ${
    isProductFavorite?.(
      machine,
      "machine"
    )
      ? "active"
      : ""
  }`}
  onClick={async (event) => {

    event.stopPropagation();

    await onToggleFavorite?.(
      machine
    );

  }}
  aria-label={
    isProductFavorite?.(
      machine,
      "machine"
    )
      ? "Retirer des favoris"
      : "Ajouter aux favoris"
  }
>
  {isProductFavorite?.(
    machine,
    "machine"
  )
    ? "♥"
    : "♡"}
</button>
        </div>

        <div className="machine-info">
          <h3>
            {machine?.name ||
              "Machine industrielle"}
          </h3>

         <p className="machine-price">
  {getProductPrice(machine)}
</p>
        </div>
      </article>
    );
  };

  return (
    <div className="home-page">

      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="home-header">
        <div className="home-brand">
          <img
            src={logoUmi}
            alt="Logo UMI Group"
            className="home-logo"
          />

          <div className="home-brand-text">
            <h2>
              <span className="brand-umi">
                UMI
              </span>

              <span className="brand-group">
                Group
              </span>
            </h2>

            <span>
              UNIVERS DES MACHINES
              INDUSTRIELLES
            </span>
          </div>
        </div>

        <button
          type="button"
          className="home-profile"
          onClick={onOpenAccount}
          aria-label="Ouvrir mon compte"
        >
          {userPhoto ? (
            <img
              src={userPhoto}
              alt="Photo du compte"
              className="home-profile-photo"
            />
          ) : (
            <span className="home-profile-placeholder">
              👤
            </span>
          )}
        </button>
      </header>

      {/* =====================================
          BARRE DE RECHERCHE
      ===================================== */}

      <section className="home-search-section">
        <div className="home-search-box">
          <span className="search-icon">
            🔍
          </span>

          <input
            type="text"
            value={searchText}
            onChange={(event) =>
              setSearchText(
                event.target.value
              )
            }
            placeholder="Rechercher une machine..."
          />

          {searchText && (
            <button
              type="button"
              className="search-clear-button"
              onClick={() =>
                setSearchText("")
              }
              aria-label="Effacer"
            >
              ×
            </button>
          )}

          <button
            type="button"
            className="image-search-button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={
              imageSearchLoading
            }
            aria-label="Recherche par image"
          >
            {imageSearchLoading
              ? "..."
              : "📷"}
          </button>

          <input
            ref={fileInputRef}
            className="image-search-input"
            type="file"
            accept="image/*"
            onChange={
              handleImageSearch
            }
          />
        </div>
      </section>

      {/* =====================================
          RÉSULTATS DE RECHERCHE
      ===================================== */}

      {searchText.trim() ? (
        <section className="search-results-section">
          <div className="search-results-header">
            <div>
              <h2>
                Résultats de recherche
              </h2>

              <p>
                {filteredMachines.length}
                {" machine"}
                {filteredMachines.length >
                1
                  ? "s"
                  : ""}
                {" trouvée"}
                {filteredMachines.length >
                1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>

          {filteredMachines.length >
          0 ? (
            <div className="machines-grid">
              {filteredMachines.map(
                (machine, index) =>
                  renderMachineCard(
                    machine,
                    index,
                    false
                  )
              )}
            </div>
          ) : (
            <div className="no-machine-result">
              <div className="no-result-icon">
                🔍
              </div>

              <p>
                Aucune machine trouvée
                pour{" "}
                <strong>
                  « {searchText} »
                </strong>
              </p>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* ===============================
    MÉDIA D'ACCUEIL
    PHOTO OU VIDÉO
=============================== */}

<section className="home-video-banner">
  {homeMedia.type === "image" ? (
    <img
      key={`image-${mediaIndex}-${homeMedia.url}`}
      className="home-video"
      src={homeMedia.url}
      alt={homeMedia.text || "UMI"}
    />
  ) : getVideoEmbedUrl(homeMedia.url) ? (
    <iframe
      key={`embed-${mediaIndex}-${homeMedia.url}`}
      src={getVideoEmbedUrl(homeMedia.url)}
      title="Vidéo d’accueil UMI"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        border: "none",
        background: "#000",
      }}
    />
  ) : (
        <video
      key={`video-${mediaIndex}-${homeMedia.url}`}
      className="home-video"
      src={homeMedia.url}
      poster={
        homeMedia.url?.startsWith(
          "https://res.cloudinary.com/"
        )
          ? homeMedia.url.replace(
              /\.(mp4|mov|webm)(\?.*)?$/i,
              ".jpg"
            )
          : undefined
      }
      autoPlay
      muted={homeVideoMuted}
      loop={homeMedias.length === 1}
      playsInline
      controls
      preload="auto"
      onLoadedData={(event) => {
        const video = event.currentTarget;

        video.play().catch((error) => {
          console.warn(
            "Lecture automatique refusée :",
            error
          );
        });
      }}
      onError={(event) => {
        console.error(
          "Erreur vidéo accueil :",
          event.currentTarget.error?.code,
          event.currentTarget.error?.message
        );
      }}
      onEnded={nextHomeMedia}
    />
  )}

  {homeMedia.type === "video" && homeMedia.isLive && (
    <span
      className="home-media-live"
      style={{ pointerEvents: "none" }}
    >
      <span className="home-media-live-dot" />
      EN DIRECT
    </span>
  )}

  {homeMedia.text && (
    <div
      key={`text-${mediaIndex}-${homeMedia.url}`}
      className="home-media-caption"
      style={{ pointerEvents: "none" }}
    >
      <p>{homeMedia.text}</p>
    </div>
  )}

  {homeMedia.type === "video" &&
    !getVideoEmbedUrl(homeMedia.url) && (
      <button
        type="button"
        onClick={() =>
          setHomeVideoMuted((current) => !current)
        }
        aria-label={
          homeVideoMuted
            ? "Activer le son"
            : "Couper le son"
        }
        style={{
          position: "absolute",
          top: "7px",
          right: "7px",
          zIndex: 4,
          width: "34px",
          height: "34px",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(255,255,255,0.4)",
          borderRadius: "50%",
          background: "rgba(0,0,0,0.5)",
          color: "#fff",
          fontSize: "17px",
          cursor: "pointer",
        }}
      >
        {homeVideoMuted ? "🔇" : "🔊"}
      </button>
    )}

  {homeMedias.length > 1 && (
    <button
      type="button"
      onClick={nextHomeMedia}
      aria-label="Afficher le média suivant"
      style={{
        position: "absolute",
        right: "8px",
        bottom: "42px",
        zIndex: 5,
        width: "32px",
        height: "32px",
        border: "1px solid rgba(255,255,255,0.4)",
        borderRadius: "50%",
        background: "rgba(0,0,0,0.6)",
        color: "#fff",
        fontSize: "22px",
        cursor: "pointer",
      }}
    >
      ›
    </button>
  )}
</section>

          {/* ===============================
              6 SERVICES
          =============================== */}
<section className="home-services">

  <div className="home-menu-grid">


    {/* ===============================
        MACHINES
    =============================== */}

    <button
      type="button"
      className="home-menu-button"
      onClick={
        onOpenMachines
      }
    >

      <div className="home-menu-icon">
        ⚙️
      </div>

      <span>
        Machines
      </span>

    </button>


    {/* ===============================
        UMI LIVE
    =============================== */}

    <button
      type="button"
      className="home-menu-button"
      onClick={
        onOpenUmiLive
      }
    >

      <div className="home-menu-icon live-menu-icon">
        ▶
      </div>

      <span>
        UMI LIVE
      </span>

    </button>


    {/* ===============================
        MATIÈRE PREMIÈRE
    =============================== */}

    <button
      type="button"
      className="home-menu-button"
      onClick={
        onOpenRawMaterials
      }
    >

      <div className="home-menu-icon">
        🌾
      </div>

      <span>
        Matière première
      </span>

    </button>


    {/* ===============================
        DEVIS
    =============================== */}

    <button
      type="button"
      className="home-menu-button"
      onClick={
        onOpenQuote
      }
    >

      <div
        className="home-menu-icon"
        style={{
          position: "relative",
        }}
      >

        📄

                {quoteUnreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-9px",
              right: "-9px",
              width: "24px",
              minWidth: "24px",
              maxWidth: "24px",
              height: "24px",
              minHeight: "24px",
              maxHeight: "24px",
              padding: 0,
              margin: 0,
              borderRadius: "50%",
              background: "#e11d48",
              color: "#ffffff",
              border: "2px solid #ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              fontSize: quoteUnreadCount > 99
                ? "8px"
                : "10px",
              fontWeight: "800",
              lineHeight: "1",
            }}
          >
            {quoteUnreadCount > 99
              ? "99+"
              : quoteUnreadCount}
          </span>
        )}

      </div>

      <span>
        Devis
      </span>

    </button>


    {/* ===============================
        CHAT
    =============================== */}

    <button
      type="button"
      className="home-menu-button"
      onClick={
        onOpenChat
      }
    >

      <div
        className="home-menu-icon"
        style={{
          position: "relative",
        }}
      >

        💬

        {chatUnreadCount > 0 && (
  <span
    style={{
      position: "absolute",
      top: "-9px",
      right: "-13px",

      width: "24px",
      height: "24px",
      padding: 0,
      borderRadius: "50%",

      background: "#e11d48",
      color: "#ffffff",
      border: "2px solid #ffffff",

      display: "flex",
      alignItems: "center",
      justifyContent: "center",

      boxSizing: "border-box",
      fontSize: chatUnreadCount > 99 ? "8px" : "10px",
      fontWeight: "800",
      lineHeight: 1,
    }}
  >
    {chatUnreadCount > 99
      ? "99+"
      : chatUnreadCount}
  </span>
)}

      </div>

      <span>
        Chat
      </span>

    </button>


    {/* ===============================
        EMBALLAGE
    =============================== */}

    <button
      type="button"
      className="home-menu-button"
      onClick={
        onOpenPackaging
      }
    >

      <div className="home-menu-icon">
        📦
      </div>

      <span>
        Emballage
      </span>

    </button>


  </div>

</section>
          {/* ===============================
              MACHINES POPULAIRES
          =============================== */}

          <section className="popular-section">
            <div className="popular-header">
              <div>
                <h2>
                  Machines populaires
                </h2>

                <p>
                  Découvrez nos machines
                  industrielles
                </p>
              </div>
            </div>

            {popularMachines.length >
            0 ? (
              <div className="machines-grid popular-machines-grid">
                {popularMachines
  
  .map(
    (machine, index) =>
      renderMachineCard(
        machine,
        index,
        true
      )
  )}
              </div>
            ) : (
              <div className="no-machine-result">
                Aucune machine
                disponible.
              </div>
            )}
          </section>
        </>
      )}

      {/* =====================================
          NAVIGATION DU BAS
      ===================================== */}

      <nav className="bottom-nav">

        <button
          type="button"
          className="nav-item active"
          onClick={() =>
            setSearchText("")
          }
        >
          <span>🏠</span>
          <p>Accueil</p>
        </button>

        <button
          type="button"
          className="nav-item"
          onClick={onOpenCategories}
        >
          <span>▦</span>
          <p>Catégories</p>
        </button>

        <button
          type="button"
          className="nav-item live-nav"
          onClick={onOpenUmiLive}
        >
          <span className="bottom-live-icon">
            ▶
          </span>

          <p>UMI LIVE</p>
        </button>

        <button
          type="button"
          className="nav-item"
          onClick={onOpenCart}
        >
          <span>🛒</span>
          <p>Panier</p>
        </button>

        <button
          type="button"
          className="nav-item"
          onClick={onOpenAccount}
        >
          <span className="bottom-account-photo-wrapper">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt="Compte"
                className="bottom-account-photo"
              />
            ) : (
              <span className="bottom-account-placeholder">
                👤
              </span>
            )}
          </span>

          <p>Compte</p>
        </button>

      </nav>
    </div>
  );
}

export default Home;