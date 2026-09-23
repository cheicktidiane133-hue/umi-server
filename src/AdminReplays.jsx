import { useEffect, useMemo, useState } from "react";

import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

import "./AdminReplays.css";


/* =========================================
   OUTILS
========================================= */

function isUmiLive(live) {
  return (
    !live.liveType ||
    live.liveType === "umi"
  );
}


function getDateValue(live) {
  return (
    live.stoppedAt?.seconds ||
    live.startedAt?.seconds ||
    live.createdAt?.seconds ||
    0
  );
}


/* =========================================
   PAGE REDIFFUSIONS
========================================= */

function AdminReplays({
  onBack,
}) {

  const [lives, setLives] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [deleting, setDeleting] =
    useState(null);

  const [search, setSearch] =
    useState("");


  /* =========================================
     CHARGER LES REDIFFUSIONS
  ========================================= */

  useEffect(() => {

    const unsubscribe =
      onSnapshot(
        collection(db, "live"),

        (snapshot) => {

          const data =
            snapshot.docs
              .map((document) => ({
                id: document.id,
                ...document.data(),
              }))
              .filter((live) => {

                const hasReplay =
                  typeof live.recordingUrl ===
                    "string" &&
                  live.recordingUrl.trim() !== "";

                const hasHighlight =
                  typeof live.highlightUrl ===
                    "string" &&
                  live.highlightUrl.trim() !== "";

                return (
                  hasReplay ||
                  hasHighlight
                );

              })
              .sort(
                (a, b) =>
                  getDateValue(b) -
                  getDateValue(a)
              );


          setLives(data);
          setLoading(false);

        },

        (error) => {

          console.error(
            "Erreur chargement rediffusions :",
            error
          );

          setLoading(false);

        }
      );


    return () => {
      unsubscribe();
    };

  }, []);


  /* =========================================
     RECHERCHE
  ========================================= */

  const filteredLives =
    useMemo(() => {

      const searchValue =
        search
          .trim()
          .toLowerCase();


      if (!searchValue) {
        return lives;
      }


      return lives.filter(
        (live) => {

          const umi =
            isUmiLive(live);


          const values = [

            live.title,
            live.machineName,
            live.productName,
            live.sellerName,
            live.clientName,
            live.userName,
            live.name,
            live.liveType,

            umi
              ? "umi"
              : "client",

            umi
              ? "umi live"
              : "live client",

            live.recordingUrl,
            live.highlightUrl,

          ];


          const searchableText =
            values
              .filter(Boolean)
              .join(" ")
              .toLowerCase();


          return searchableText.includes(
            searchValue
          );

        }
      );

    }, [lives, search]);


  /* =========================================
     SUPPRIMER REPLAY
  ========================================= */

  const deleteReplay =
    async (live) => {

      if (
        !live.recordingFilePath
      ) {

        alert(
          "Le fichier du Replay est introuvable."
        );

        return;

      }


      const confirmation =
        window.confirm(
          "Supprimer définitivement ce Replay ?"
        );


      if (!confirmation) {
        return;
      }


      try {

        setDeleting(
          `replay-${live.id}`
        );


        const response =
          await fetch(
            "/delete-replay",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({

                recordingFilePath:
                  live.recordingFilePath,

              }),
            }
          );


        const result =
          await response.json();


        if (!response.ok) {

          throw new Error(
            result?.error ||
            "Impossible de supprimer le Replay."
          );

        }


        await updateDoc(
          doc(
            db,
            "live",
            live.id
          ),
          {

            recordingUrl: null,

            recordingFilePath: null,

            hasReplay: false,

            replayPublished: false,

            recordingStatus:
              "deleted",

          }
        );


      } catch (error) {

        console.error(
          "Erreur suppression Replay :",
          error
        );

        alert(
          error.message ||
          "Erreur pendant la suppression du Replay."
        );

      } finally {

        setDeleting(null);

      }

    };


  /* =========================================
     SUPPRIMER TEMPS FORT
  ========================================= */

  const deleteHighlight =
    async (live) => {

      if (
        !live.highlightFilePath
      ) {

        alert(
          "Le fichier du Temps fort est introuvable."
        );

        return;

      }


      const confirmation =
        window.confirm(
          "Supprimer définitivement ce Temps fort ?"
        );


      if (!confirmation) {
        return;
      }


      try {

        setDeleting(
          `highlight-${live.id}`
        );


        const response =
          await fetch(
            "/delete-highlight",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({

                highlightFilePath:
                  live.highlightFilePath,

                liveId:
                  live.id,

              }),
            }
          );


        const result =
          await response.json();


        if (!response.ok) {

          throw new Error(
            result?.error ||
            "Impossible de supprimer le Temps fort."
          );

        }


        await updateDoc(
          doc(
            db,
            "live",
            live.id
          ),
          {

            highlightUrl: null,

            highlightFilePath: null,

            highlightPublished: false,

            highlightStatus:
              "deleted",

          }
        );


      } catch (error) {

        console.error(
          "Erreur suppression Temps fort :",
          error
        );

        alert(
          error.message ||
          "Erreur pendant la suppression du Temps fort."
        );

      } finally {

        setDeleting(null);

      }

    };


  /* =========================================
     EFFACER RECHERCHE
  ========================================= */

  const clearSearch = () => {
    setSearch("");
  };


  /* =========================================
     AFFICHAGE
  ========================================= */

  return (

    <div className="admin-replays-page">


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="admin-replays-header">

        <button
          type="button"
          className="admin-replays-back"
          onClick={onBack}
        >
          ←
        </button>


        <div>

          <h1>
            🎬 Rediffusions
          </h1>

          <p>
            Replay et Temps forts UMI + Clients
          </p>

        </div>

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="admin-replays-content">


        {/* ===================================
            BARRE DE RECHERCHE
        =================================== */}

        <div
          style={{
            width: "100%",
            marginBottom: "14px",
          }}
        >

          <div
            style={{
              width: "100%",

              display: "flex",
              alignItems: "center",

              background: "#ffffff",

              border:
                "1px solid #dbe5ef",

              borderRadius: "14px",

              overflow: "hidden",

              boxShadow:
                "0 4px 14px rgba(25, 53, 88, 0.06)",
            }}
          >

            <div
              style={{
                paddingLeft: "15px",
                fontSize: "18px",
              }}
            >
              🔍
            </div>


            <input
              type="text"
              value={search}

              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }

              placeholder="Rechercher une vidéo, machine, produit, vendeur..."

              style={{
                flex: "1",

                minWidth: "0",
                minHeight: "52px",

                padding:
                  "10px 12px",

                border: "none",
                outline: "none",

                background:
                  "transparent",

                color: "#10213d",

                fontFamily:
                  "Arial, Helvetica, sans-serif",

                fontSize: "14px",
                fontWeight: "600",
              }}
            />


            {search && (

              <button
                type="button"
                onClick={clearSearch}
                title="Effacer la recherche"

                style={{
                  width: "42px",
                  height: "42px",

                  marginRight: "5px",

                  border: "none",
                  borderRadius: "50%",

                  background:
                    "#f0f4f8",

                  color: "#526477",

                  fontSize: "17px",
                  fontWeight: "800",

                  cursor: "pointer",
                }}
              >
                ×
              </button>

            )}

          </div>


          {search.trim() !== "" && (

            <div
              style={{
                marginTop: "8px",

                paddingLeft: "4px",

                color: "#667085",

                fontSize: "12px",
                fontWeight: "600",
              }}
            >

              {filteredLives.length} résultat
              {filteredLives.length > 1
                ? "s"
                : ""}

              {" "}pour « {search} »

            </div>

          )}

        </div>


        {/* ===================================
            COMPTEUR
        =================================== */}

        <div className="admin-replays-summary">

          <strong>
            {search.trim()
              ? filteredLives.length
              : lives.length}
          </strong>

          <span>

            {search.trim()
              ? "vidéo trouvée"
              : "rediffusion"}

            {(search.trim()
              ? filteredLives.length
              : lives.length) > 1
              ? "s"
              : ""}

          </span>

        </div>


        {/* ===================================
            CHARGEMENT
        =================================== */}

        {loading && (

          <div className="admin-replays-empty">

            <div>
              ⏳
            </div>

            <h2>
              Chargement...
            </h2>

          </div>

        )}


        {/* ===================================
            AUCUNE REDIFFUSION
        =================================== */}

        {!loading &&
          lives.length === 0 && (

            <div className="admin-replays-empty">

              <div>
                🎬
              </div>

              <h2>
                Aucune rediffusion
              </h2>

              <p>
                Les Replay et Temps forts
                apparaîtront ici.
              </p>

            </div>

          )}


        {/* ===================================
            AUCUN RÉSULTAT
        =================================== */}

        {!loading &&
          lives.length > 0 &&
          filteredLives.length === 0 && (

            <div className="admin-replays-empty">

              <div>
                🔍
              </div>

              <h2>
                Aucune vidéo trouvée
              </h2>

              <p>
                Aucun Replay ou Temps fort
                ne correspond à
                « {search} ».
              </p>


              <button
                type="button"
                onClick={clearSearch}

                style={{
                  marginTop: "15px",

                  padding:
                    "10px 18px",

                  border: "none",
                  borderRadius: "10px",

                  background:
                    "#087fc1",

                  color: "#ffffff",

                  fontSize: "12px",
                  fontWeight: "800",

                  cursor: "pointer",
                }}
              >
                Effacer la recherche
              </button>

            </div>

          )}


        {/* ===================================
            LISTE
        =================================== */}

        {!loading &&
          filteredLives.length > 0 && (

            <div className="admin-replays-list">

              {filteredLives.map(
                (live) => {

                  const umi =
                    isUmiLive(live);


                  const hasReplay =
                    typeof live.recordingUrl ===
                      "string" &&
                    live.recordingUrl.trim() !== "";


                  const hasHighlight =
                    typeof live.highlightUrl ===
                      "string" &&
                    live.highlightUrl.trim() !== "";


                  return (

                    <article
                      className="admin-replay-card"
                      key={live.id}
                    >


                      <div className="admin-replay-top">

                        <span
                          className={
                            umi
                              ? "admin-replay-type umi"
                              : "admin-replay-type client"
                          }
                        >

                          {umi
                            ? "UMI LIVE"
                            : "LIVE CLIENT"}

                        </span>

                      </div>


                      <h2>

                        {live.title ||
                          live.productName ||
                          "Rediffusion"}

                      </h2>


                      <p className="admin-replay-info">

                        {umi
                          ? `Machine : ${
                              live.machineName ||
                              "Non renseignée"
                            }`
                          : `Vendeur : ${
                              live.sellerName ||
                              "Non renseigné"
                            }`}

                      </p>


                      {!umi &&
                        live.productName && (

                          <p className="admin-replay-info">

                            Produit :{" "}

                            <strong>
                              {live.productName}
                            </strong>

                          </p>

                        )}


                      {/* =====================
                          TEMPS FORT
                      ===================== */}

                      {hasHighlight && (

                        <div className="admin-replay-video-block">

                          <div className="admin-replay-label">
                            🎬 Temps fort
                          </div>


                          <video
                            src={
                              live.highlightUrl
                            }
                            controls
                            playsInline
                            preload="metadata"
                          />


                          <button
                            type="button"
                            className="admin-delete-video"

                            disabled={
                              deleting ===
                              `highlight-${live.id}`
                            }

                            onClick={() =>
                              deleteHighlight(
                                live
                              )
                            }
                          >

                            {deleting ===
                            `highlight-${live.id}`
                              ? "Suppression..."
                              : "🗑 Supprimer le Temps fort"}

                          </button>

                        </div>

                      )}


                      {/* =====================
                          REPLAY COMPLET
                      ===================== */}

                      {hasReplay && (

                        <div className="admin-replay-video-block">

                          <div className="admin-replay-label">
                            ▶ Replay complet
                          </div>


                          <video
                            src={
                              live.recordingUrl
                            }
                            controls
                            playsInline
                            preload="metadata"
                          />


                          <button
                            type="button"
                            className="admin-delete-video"

                            disabled={
                              deleting ===
                              `replay-${live.id}`
                            }

                            onClick={() =>
                              deleteReplay(
                                live
                              )
                            }
                          >

                            {deleting ===
                            `replay-${live.id}`
                              ? "Suppression..."
                              : "🗑 Supprimer le Replay"}

                          </button>

                        </div>

                      )}

                    </article>

                  );

                }
              )}

            </div>

          )}

      </main>

    </div>

  );

}


export default AdminReplays;