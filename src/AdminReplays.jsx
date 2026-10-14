import { useEffect, useMemo, useState } from "react";

import {

  collection,

  doc,

  onSnapshot,

  updateDoc,

} from "firebase/firestore";

import { db, auth } from "./firebase";
import { useUmiDialog } from "./UmiDialogProvider";

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

  const { umiAlert, umiConfirm } = useUmiDialog();

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

                ...document.data(),

                id: document.id,

              }))

              .filter((live) => {

                const hasHighlight =

                  typeof live.highlightUrl ===

                    "string" &&

                  live.highlightUrl.trim() !== "";

                return (

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

  const deleteHighlight =

    async (live) => {

      if (!live?.id) {
        await umiAlert("Identifiant de la rediffusion manquant.");
        return;
      }

      if (deleting) return;

      if (

        !live.highlightFilePath

      ) {

        await umiAlert(

          "Le fichier du Temps fort est introuvable."

        );

        return;

      }

      const confirmation =

        await umiConfirm("Supprimer définitivement ce Temps fort ?", {
          title: "Supprimer la vidéo ?",
          confirmText: "Supprimer",
          cancelText: "Annuler",
          danger: true,
        });

      if (!confirmation) {

        return;

      }

      try {

        setDeleting(

          `highlight-${live.id}`

        );

        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Connectez-vous au compte administrateur.");

        const response =

         await fetch(
  "https://umi-server.onrender.com/delete-highlight",

            {

              method: "POST",

              headers: {

                "Content-Type":

                  "application/json",
                Authorization: `Bearer ${token}`,

              },

              body: JSON.stringify({

                highlightFilePath:

                  live.highlightFilePath,

                liveId:

                  live.id,

              }),

            }

          );

        const responseText = await response.text();
        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(
            `Le serveur de suppression a renvoyé une réponse invalide (HTTP ${response.status}). Vérifiez que le serveur UMI est démarré et que la route de suppression est accessible.`
          );
        }

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

        await umiAlert(

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

            🎬 Temps forts

          </h1>

          <p>

            Temps forts UMI + Clients

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

              : "temps fort"}

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

                Aucun temps fort

              </h2>

              <p>

                Les temps forts

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

                Aucun temps fort

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

                            disabled={deleting !== null}

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