import { useEffect, useRef, useState } from "react";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

import "./AdminHomeMedia.css";
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
        "?playsinline=1"
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
function AdminHomeMedia({ onBack }) {
  const fileInputRef = useRef(null);
  const temporaryUrls = useRef(new Set());

  const [medias, setMedias] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
const [videoLink, setVideoLink] = useState("");

/* AJOUTER UNE VIDÉO PAR SON LIEN */

const handleAddVideoLink = () => {
  if (loading || initialLoading) return;

  if (medias.length >= 12) {
    setMessage("Vous pouvez ajouter jusqu’à 12 médias.");
    return;
  }

  const cleanLink = videoLink.trim();

  let parsedUrl;

  try {
    parsedUrl = new URL(cleanLink);
  } catch {
    setMessage("Veuillez saisir un lien vidéo valide.");
    return;
  }

  if (parsedUrl.protocol !== "https:") {
    setMessage("Le lien doit commencer par https://.");
    return;
  }

  const host = parsedUrl.hostname.toLowerCase();

  const isDomain = (domain) =>
    host === domain || host.endsWith(`.${domain}`);

  const isYouTube =
    isDomain("youtube.com") ||
    isDomain("youtu.be");

  const isTikTok = isDomain("tiktok.com");

  const isFacebook =
    isDomain("facebook.com") ||
    isDomain("fb.watch");

  const isDirectVideo =
    /\.(mp4|webm|ogg|mov)$/i.test(parsedUrl.pathname);

  if (
    !isYouTube &&
    !isTikTok &&
    !isFacebook &&
    !isDirectVideo
  ) {
    setMessage(
      "Ajoutez un lien YouTube, TikTok, Facebook ou un lien vidéo direct (.mp4, .webm…)."
    );
    return;
  }

  if (
    isTikTok &&
    !/\/(?:video|player\/v1)\/\d+/.test(parsedUrl.pathname)
  ) {
    setMessage(
      "Pour TikTok, ouvrez la vidéo et copiez son lien complet contenant /video/. Les liens courts ne sont pas encore pris en charge."
    );
    return;
  }

  if (
    isDomain("fb.watch") ||
    (isFacebook && parsedUrl.pathname.startsWith("/share/"))
  ) {
    setMessage(
      "Pour Facebook, ouvrez la vidéo et copiez son adresse complète, plutôt que le lien court de partage."
    );
    return;
  }

  setMedias((current) => [
    ...current,
    {
      id: crypto.randomUUID(),
      type: "video",
      url: parsedUrl.href,
      text: "",
      duration: 5,
      isLive: false,
      file: null,
    },
  ]);

  setVideoLink("");
  setMessage(
    "Lien ajouté. Cliquez sur « Enregistrer les médias » pour le conserver."
  );
};

  /* CHARGER LES MÉDIAS EXISTANTS */

  useEffect(() => {
    let active = true;

    const loadMedias = async () => {
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

        setMedias(
          savedMedias
            .filter(
              (media) =>
                media.url &&
                ["image", "video"].includes(media.type)
            )
            .slice(0, 12)
            .map((media, index) => ({
              id: media.id || `existing-${index}`,
              type: media.type,
              url: media.url,
              text: media.text || "",
              duration: Number(media.duration) || 5,
              isLive:
                media.type === "video" &&
                media.isLive === true,
              file: null,
            }))
        );
      } catch (error) {
        if (active) {
          setMessage(
            "Impossible de charger les médias. Réouvrez cette page."
          );
        }
        console.error(error);
      } finally {
        if (active) setInitialLoading(false);
      }
    };

    loadMedias();

    return () => {
      active = false;

      temporaryUrls.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      temporaryUrls.current.clear();
    };
  }, []);

  /* AJOUTER DES PHOTOS OU VIDÉOS */

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    if (medias.length + files.length > 12) {
      setMessage(
        `Vous pouvez encore ajouter ${12 - medias.length} média(s).`
      );
      return;
    }

    const invalidFile = files.find(
      (file) =>
        !file.type.startsWith("image/") &&
        !file.type.startsWith("video/")
    );

    if (invalidFile) {
      setMessage("Choisissez uniquement des photos ou vidéos.");
      return;
    }

    const newMedias = files.map((file) => {
      const url = URL.createObjectURL(file);
      temporaryUrls.current.add(url);

      return {
        id: crypto.randomUUID(),
        type: file.type.startsWith("video/")
          ? "video"
          : "image",
        url,
        text: "",
        duration: 5,
        isLive: false,
        file,
      };
    });

    setMedias((current) => [...current, ...newMedias]);
    setMessage("");
  };

  /* MODIFIER UN MÉDIA */

  const updateMedia = (id, changes) => {
    setMedias((current) =>
      current.map((media) =>
        media.id === id
          ? { ...media, ...changes }
          : media
      )
    );
  };

  /* RETIRER UN MÉDIA DU DIAPORAMA */

  const removeMedia = (id) => {
    const media = medias.find((item) => item.id === id);

    if (media?.file) {
      URL.revokeObjectURL(media.url);
      temporaryUrls.current.delete(media.url);
    }

    setMedias((current) =>
      current.filter((item) => item.id !== id)
    );

    setMessage("");
  };

  /* CHANGER L'ORDRE */

  const moveMedia = (index, direction) => {
    setMedias((current) => {
      const next = [...current];
      const destination = index + direction;

      if (
        destination < 0 ||
        destination >= next.length
      ) {
        return current;
      }

      [next[index], next[destination]] = [
        next[destination],
        next[index],
      ];

      return next;
    });
  };

  /* ENVOYER UN FICHIER VERS CLOUDINARY */

  const uploadToCloudinary = async (media) => {
    const cloudName =
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    const uploadPreset =
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("La configuration Cloudinary est manquante.");
    }

    const formData = new FormData();
    formData.append("file", media.file);
    formData.append("upload_preset", uploadPreset);

    const resourceType =
      media.type === "video" ? "video" : "image";

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      throw new Error(
        data?.error?.message ||
          "Impossible d'envoyer le fichier."
      );
    }

    return data.secure_url;
  };

  /* ENREGISTRER LE DIAPORAMA */

  const handleSave = async () => {
    if (loading || initialLoading) return;

    if (!medias.length) {
      setMessage("Ajoutez au moins une photo ou une vidéo.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const savedMedias = [];

      for (let index = 0; index < medias.length; index++) {
        const media = medias[index];
        let url = media.url;

        if (media.file) {
          setMessage(
            `Envoi du média ${index + 1} sur ${medias.length}…`
          );

          url = await uploadToCloudinary(media);

          // Conserver l'URL envoyée même si la sauvegarde
          // Firestore échoue, pour éviter un nouvel envoi.
          setMedias((current) =>
            current.map((item) =>
              item.id === media.id
                ? { ...item, url, file: null }
                : item
            )
          );

          URL.revokeObjectURL(media.url);
          temporaryUrls.current.delete(media.url);
        }

        savedMedias.push({
          id: media.id,
          type: media.type,
          url,
          text: media.text.trim(),
          duration: Math.min(
            60,
            Math.max(2, Number(media.duration) || 5)
          ),
          isLive:
            media.type === "video" &&
            media.isLive === true,
        });
      }

      await setDoc(
        doc(db, "settings", "homeMedia"),
        {
          medias: savedMedias,

          // Compatibilité avec l'accueil actuel.
          type: savedMedias[0].type,
          url: savedMedias[0].url,

          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMedias(
        savedMedias.map((media) => ({
          ...media,
          file: null,
        }))
      );

      setMessage("Les médias d'accueil sont enregistrés.");
    } catch (error) {
      console.error("Erreur média accueil :", error);

      setMessage(
        error.message || "Impossible d'enregistrer les médias."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-home-media">
      <header className="admin-media-header">
        <button
          type="button"
          className="admin-media-back"
          onClick={onBack}
          disabled={loading}
          aria-label="Retour"
        >
          ←
        </button>

        <div>
          <h1>Média d'accueil</h1>
          <p>Jusqu'à 12 photos ou vidéos</p>
        </div>
      </header>

      <main className="admin-media-content">
        <section className="admin-media-card">
          <h2>Médias : {medias.length}/12</h2>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            className="admin-media-file-input"
            disabled={loading || initialLoading}
          />

          <button
            type="button"
            className="admin-media-select"
            onClick={() => fileInputRef.current?.click()}
            disabled={
              loading ||
              initialLoading ||
              medias.length >= 12
            }
          >
            Ajouter des photos ou vidéos
          </button>
<div
  style={{
    marginTop: "20px",
    marginBottom: "20px",
    padding: "16px",
    border: "1px solid #dce4ee",
    borderRadius: "14px",
    background: "#f7faff",
  }}
>
  <label
    htmlFor="home-video-link"
    style={{
      display: "block",
      marginBottom: "8px",
      color: "#174b91",
      fontWeight: "800",
    }}
  >
    Ajouter une vidéo par lien
  </label>

  <input
    id="home-video-link"
    type="url"
    value={videoLink}
    onChange={(event) =>
      setVideoLink(event.target.value)
    }
    placeholder="Collez le lien de la vidéo"
    disabled={loading || initialLoading}
    style={{
      display: "block",
      width: "100%",
      boxSizing: "border-box",
      padding: "12px",
      border: "1px solid #cad9e9",
      borderRadius: "10px",
      fontSize: "16px",
      marginBottom: "10px",
    }}
  />

  <p
    style={{
      margin: "0 0 12px",
      color: "#667085",
      fontSize: "13px",
      lineHeight: "1.5",
    }}
  >
    YouTube, TikTok, Facebook ou vidéo directe.
    Utilisez le lien complet d’une vidéo publique.
  </p>

  <button
    type="button"
    className="admin-media-select"
    onClick={handleAddVideoLink}
    disabled={
      loading ||
      initialLoading ||
      medias.length >= 12 ||
      !videoLink.trim()
    }
  >
    + Ajouter ce lien
  </button>
</div>
          {initialLoading && <p>Chargement…</p>}

          {medias.map((media, index) => (
            <div
              key={media.id}
              className="admin-media-item"
            >
              <h3>
                {index + 1}.{" "}
                {media.type === "video" ? "Vidéo" : "Photo"}
              </h3>

              <div className="admin-media-preview">
  {media.type === "image" ? (
    <img
      src={media.url}
      alt={`Aperçu ${index + 1}`}
    />
  ) : getVideoEmbedUrl(media.url) ? (
    <iframe
      key={media.url}
      src={getVideoEmbedUrl(media.url)}
      title={`Aperçu vidéo ${index + 1}`}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      style={{
        display: "block",
        width: "100%",
        height: "320px",
        border: "none",
        background: "#000",
      }}
    />
  ) : (
    <video
      key={media.url}
      src={media.url}
      controls
      playsInline
      preload="metadata"
      style={{
        display: "block",
        width: "100%",
        maxHeight: "320px",
        background: "#000",
      }}
    />
  )}
</div>

              <label>
                Texte affiché sur ce média
                <textarea
                  value={media.text}
                  onChange={(event) =>
                    updateMedia(media.id, {
                      text: event.target.value,
                    })
                  }
                  placeholder="Écrivez votre texte ici…"
                  maxLength={300}
                  rows={3}
                  disabled={loading}
                  style={{
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                    marginTop: "8px",
                    marginBottom: "12px",
                  }}
                />
              </label>

              {media.type === "image" ? (
                <label>
                  Durée d'affichage en secondes :{" "}
                  <input
                    type="number"
                    min="2"
                    max="60"
                    value={media.duration}
                    onChange={(event) =>
                      updateMedia(media.id, {
                        duration: event.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </label>
              ) : (
                <label>
                  <input
                    type="checkbox"
                    checked={media.isLive}
                    onChange={(event) =>
                      updateMedia(media.id, {
                        isLive: event.target.checked,
                      })
                    }
                    disabled={loading}
                  />{" "}
                  Afficher « EN DIRECT »
                </label>
              )}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "12px",
                  marginBottom: "24px",
                }}
              >
                <button
                  type="button"
                  onClick={() => moveMedia(index, -1)}
                  disabled={loading || index === 0}
                >
                  ↑ Monter
                </button>

                <button
                  type="button"
                  onClick={() => moveMedia(index, 1)}
                  disabled={
                    loading || index === medias.length - 1
                  }
                >
                  ↓ Descendre
                </button>

                <button
                  type="button"
                  onClick={() => removeMedia(media.id)}
                  disabled={loading}
                >
                  Retirer
                </button>
              </div>
            </div>
          ))}

          {message && (
            <div
              className="admin-media-message"
              role="status"
            >
              {message}
            </div>
          )}

          <button
            type="button"
            className="admin-media-save"
            onClick={handleSave}
            disabled={loading || initialLoading}
          >
            {loading
              ? "Enregistrement…"
              : "Enregistrer les médias"}
          </button>
        </section>
      </main>
    </div>
  );
}

export default AdminHomeMedia;