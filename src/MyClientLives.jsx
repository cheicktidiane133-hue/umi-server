import { useEffect, useState } from "react";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";

import { db } from "./firebase";
import "./MyClientLives.css";


function MyClientLives({
  onBack,
  onHome,
  onOpenCart,
  onLogout,
}) {

  const [myLives, setMyLives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [filter, setFilter] = useState("all");

  const [sellerName, setSellerName] = useState("");
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [savingSchedule, setSavingSchedule] =
    useState(false);

  const [editingId, setEditingId] =
    useState("");

  const [now, setNow] =
    useState(Date.now());


  /* ========================================
     UTILISATEUR
  ======================================== */

  const savedCurrentUser =
    localStorage.getItem("umiCurrentUser");

  let currentUser = null;

  try {

    if (savedCurrentUser) {

      currentUser =
        JSON.parse(savedCurrentUser);

    }

  } catch (err) {

    console.error(
      "Erreur lecture compte UMI :",
      err
    );

  }


  /* ========================================
     HORLOGE
  ======================================== */

  useEffect(() => {

    const interval =
      setInterval(() => {

        setNow(Date.now());

      }, 15000);


    return () =>
      clearInterval(interval);

  }, []);


  /* ========================================
     CHARGER MES LIVE
  ======================================== */

  useEffect(() => {

    if (!currentUser?.userId) {

      setError(
        "Vous devez être connecté pour voir vos LIVE."
      );

      setLoading(false);

      return;

    }


    const unsubscribe =
      onSnapshot(

        collection(db, "live"),

        (snapshot) => {

          const items =
            snapshot.docs

              .map((document) => ({

                id: document.id,

                ...document.data(),

              }))

              .filter(
                (live) =>
                  live.liveType === "client" &&
                  live.ownerId === currentUser.userId
              )

              .sort((a, b) => {

                const timeA =
                  a.scheduledAt?.seconds ||
                  a.startedAt?.seconds ||
                  a.createdAt?.seconds ||
                  0;

                const timeB =
                  b.scheduledAt?.seconds ||
                  b.startedAt?.seconds ||
                  b.createdAt?.seconds ||
                  0;

                return timeB - timeA;

              });


          setMyLives(items);

          setLoading(false);

        },

        (snapshotError) => {

          console.error(
            "Erreur chargement Mes LIVE :",
            snapshotError
          );

          setError(
            "Impossible de charger vos LIVE."
          );

          setLoading(false);

        }

      );


    return () =>
      unsubscribe();

  }, [currentUser?.userId]);


  /* ========================================
     PROPRIÉTAIRE
  ======================================== */

  const verifyOwner = (live) => {

    if (
      !currentUser?.userId ||
      live.ownerId !== currentUser.userId
    ) {

      alert(
        "Vous ne pouvez pas gérer ce LIVE."
      );

      return false;

    }

    return true;

  };


  /* ========================================
     LIVE PROGRAMMÉ ENCORE VALIDE ?
  ======================================== */

  const isUpcoming = (live) => {

    if (
      live.isScheduled !== true ||
      live.isLive === true ||
      !live.scheduledAt
    ) {

      return false;

    }

    return (
      live.scheduledAt.toMillis() > now
    );

  };


  /* ========================================
     PROGRAMMER / MODIFIER
  ======================================== */

  const saveScheduledLive =
    async (event) => {

      event.preventDefault();


      if (!currentUser?.userId) {

        alert(
          "Vous devez être connecté."
        );

        return;

      }


      if (!sellerName.trim()) {

        alert(
          "Entre le nom du vendeur."
        );

        return;

      }


      if (!productName.trim()) {

        alert(
          "Entre le nom du produit."
        );

        return;

      }


      if (!date || !time) {

        alert(
          "Choisis la date et l'heure."
        );

        return;

      }


      const scheduledDate =
        new Date(`${date}T${time}`);


      if (
        Number.isNaN(
          scheduledDate.getTime()
        )
      ) {

        alert(
          "Date ou heure incorrecte."
        );

        return;

      }


      if (
        scheduledDate.getTime() <=
        Date.now()
      ) {

        alert(
          "La date doit être dans le futur."
        );

        return;

      }


      try {

        setSavingSchedule(true);


        const liveId =
          editingId ||
          crypto.randomUUID?.() ||
          `client-scheduled-${Date.now()}`;


        const data = {

          liveType: "client",

          ownerId:
            currentUser.userId,

          ownerEmail:
            currentUser.email || "",

          sellerName:
            sellerName.trim(),

          productName:
            productName.trim(),

          price:
            price.trim(),

          title:
            productName.trim(),

          description:
            description.trim(),

          isLive: false,

          isScheduled: true,

          scheduledAt:
            Timestamp.fromDate(
              scheduledDate
            ),

          updatedAt:
            serverTimestamp(),

          roomName: null,

          broadcasterIdentity: null,

          hasReplay: false,

          replayPublished: false,

          highlightPublished: false,

        };


        if (!editingId) {

          data.createdAt =
            serverTimestamp();

          data.startedAt = null;

          data.stoppedAt = null;

        }


        await setDoc(

          doc(
            db,
            "live",
            liveId
          ),

          data,

          {
            merge: true,
          }

        );


        setSellerName("");
        setProductName("");
        setPrice("");
        setDescription("");
        setDate("");
        setTime("");
        setEditingId("");


        alert(
          editingId
            ? "LIVE programmé modifié."
            : "LIVE programmé avec succès."
        );


      } catch (saveError) {

        console.error(
          "Erreur programmation :",
          saveError
        );


        alert(
          "Impossible d'enregistrer le LIVE programmé."
        );


      } finally {

        setSavingSchedule(false);

      }

    };


  /* ========================================
     MODIFIER PROGRAMMATION
  ======================================== */

  const editScheduledLive =
    (live) => {

      if (!verifyOwner(live)) {

        return;

      }


      const scheduledDate =
        live.scheduledAt?.toDate?.();


      if (!scheduledDate) {

        return;

      }


      const localDate =
        `${scheduledDate.getFullYear()}-${String(
          scheduledDate.getMonth() + 1
        ).padStart(2, "0")}-${String(
          scheduledDate.getDate()
        ).padStart(2, "0")}`;


      const localTime =
        `${String(
          scheduledDate.getHours()
        ).padStart(2, "0")}:${String(
          scheduledDate.getMinutes()
        ).padStart(2, "0")}`;


      setSellerName(
        live.sellerName || ""
      );

      setProductName(
        live.productName ||
        live.title ||
        ""
      );

      setPrice(
        live.price || ""
      );

      setDescription(
        live.description || ""
      );

      setDate(localDate);

      setTime(localTime);

      setEditingId(
        live.id
      );


      window.scrollTo({

        top: 0,

        behavior: "smooth",

      });

    };


  /* ========================================
     ANNULER MODIFICATION
  ======================================== */

  const cancelEdit = () => {

    setEditingId("");

    setSellerName("");

    setProductName("");

    setPrice("");

    setDescription("");

    setDate("");

    setTime("");

  };


  /* ========================================
     SUPPRIMER LIVE PROGRAMMÉ
  ======================================== */

  const deleteScheduledLive =
    async (live) => {

      if (!verifyOwner(live)) {

        return;

      }


      const confirmed =
        window.confirm(
          "Supprimer définitivement ce LIVE programmé ?"
        );


      if (!confirmed) {

        return;

      }


      try {

        setDeletingId(
          `scheduled-${live.id}`
        );


        await deleteDoc(

          doc(
            db,
            "live",
            live.id
          )

        );


        if (
          editingId === live.id
        ) {

          cancelEdit();

        }


      } catch (deleteError) {

        console.error(
          "Erreur suppression programmation :",
          deleteError
        );


        alert(
          "Impossible de supprimer cette programmation."
        );


      } finally {

        setDeletingId("");

      }

    };


  /* ========================================
     SUPPRIMER TEMPS FORT
  ======================================== */

  const deleteHighlight =
    async (live) => {

      if (!verifyOwner(live)) {

        return;

      }


      if (!live.highlightFilePath) {

        alert(
          "Fichier du Temps fort introuvable."
        );

        return;

      }


      const confirmed =
        window.confirm(
          "Supprimer définitivement ce Temps fort ?\n\nLe Replay complet sera conservé."
        );


      if (!confirmed) {

        return;

      }


      try {

        setDeletingId(
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


        const data =
          await response.json();


        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.error ||
            "Impossible de supprimer le Temps fort."
          );

        }


        await setDoc(

          doc(
            db,
            "live",
            live.id
          ),

          {

            highlightStatus:
              "deleted",

            highlightFilePath:
              null,

            highlightUrl:
              null,

            highlightPublished:
              false,

          },

          {
            merge: true,
          }

        );


        alert(
          "Temps fort supprimé."
        );


      } catch (deleteError) {

        console.error(
          "Erreur suppression Temps fort :",
          deleteError
        );


        alert(
          deleteError.message ||
          "Impossible de supprimer le Temps fort."
        );


      } finally {

        setDeletingId("");

      }

    };


  /* ========================================
     SUPPRIMER REPLAY
  ======================================== */

  const deleteReplay =
    async (live) => {

      if (!verifyOwner(live)) {

        return;

      }


      if (!live.recordingFilePath) {

        alert(
          "Fichier du Replay introuvable."
        );

        return;

      }


      const hasHighlight =
        live.highlightPublished === true &&
        typeof live.highlightUrl ===
          "string" &&
        live.highlightUrl.trim() !== "";


      const message =
        hasHighlight
          ? "Supprimer définitivement le Replay complet ?\n\nLe Temps fort sera conservé."
          : "Supprimer définitivement le Replay complet ?\n\nCette rediffusion disparaîtra de UMI LIVE.";


      if (!window.confirm(message)) {

        return;

      }


      try {

        setDeletingId(
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


        const data =
          await response.json();


        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.error ||
            "Impossible de supprimer le Replay."
          );

        }


        await setDoc(

          doc(
            db,
            "live",
            live.id
          ),

          {

            recordingStatus:
              "deleted",

            recordingFilePath:
              null,

            recordingUrl:
              null,

            hasReplay: false,

            replayPublished:
              false,

          },

          {
            merge: true,
          }

        );


        alert(
          "Replay supprimé."
        );


      } catch (deleteError) {

        console.error(
          "Erreur suppression Replay :",
          deleteError
        );


        alert(
          deleteError.message ||
          "Impossible de supprimer le Replay."
        );


      } finally {

        setDeletingId("");

      }

    };


  /* ========================================
     FILTRES
  ======================================== */

  const filteredLives =
    myLives.filter((live) => {

      const hasHighlight =
        live.highlightPublished === true &&
        typeof live.highlightUrl ===
          "string" &&
        live.highlightUrl.trim() !== "";


      const hasReplay =
        live.replayPublished === true &&
        typeof live.recordingUrl ===
          "string" &&
        live.recordingUrl.trim() !== "";


      const liveNow =
        live.isLive === true;


      const upcoming =
        isUpcoming(live);


      if (filter === "live") {

        return liveNow;

      }


      if (filter === "upcoming") {

        return upcoming;

      }


      if (filter === "highlights") {

        return hasHighlight;

      }


      if (filter === "all") {

        if (liveNow) {

          return true;

        }


        if (hasHighlight) {

          return true;

        }


        if (hasReplay) {

          return true;

        }


        return false;

      }


      return false;

    });


  /* ========================================
     PROGRAMMATIONS À VENIR
  ======================================== */

  const upcomingLives =
    myLives

      .filter(isUpcoming)

      .sort(
        (a, b) =>
          a.scheduledAt.toMillis() -
          b.scheduledAt.toMillis()
      );


  /* ========================================
     DATE
  ======================================== */

  const formatDate = (timestamp) => {

    if (!timestamp) {

      return "";

    }


    const date =
      timestamp.toDate
        ? timestamp.toDate()
        : timestamp.seconds
          ? new Date(
              timestamp.seconds * 1000
            )
          : null;


    if (!date) {

      return "";

    }


    return date.toLocaleString(
      "fr-FR",
      {

        day: "2-digit",

        month: "short",

        year: "numeric",

        hour: "2-digit",

        minute: "2-digit",

      }
    );

  };


  /* ========================================
     AFFICHAGE
  ======================================== */

  return (

    <div className="my-live-page">


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="my-live-header">

        <button
          type="button"
          className="my-live-back"
          onClick={onBack}
        >
          ‹
        </button>


        <div>

          <h1>
            MES LIVE
          </h1>

          <p>
            Gérez vos LIVE et vos programmations
          </p>

        </div>

      </header>


      <main className="my-live-content">


        {/* =====================================
            PROFIL
        ===================================== */}

        {currentUser && (

          <section className="my-live-profile">

            <div className="my-live-avatar">
              👤
            </div>


            <div className="my-live-profile-info">

              <h2>

                {currentUser.nom ||
                  "Vendeur UMI"}

              </h2>

              <p>
                Vendeur UMI
              </p>

              <span>
                Gérez vos LIVE et vos vidéos
              </span>

            </div>

          </section>

        )}


        {/* =====================================
            FILTRES
        ===================================== */}

        <div className="my-live-filters">

          <button
            type="button"
            className={
              filter === "all"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("all")
            }
          >
            Tous
          </button>


          <button
            type="button"
            className={
              filter === "live"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("live")
            }
          >
            En direct
          </button>


          <button
            type="button"
            className={
              filter === "upcoming"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("upcoming")
            }
          >
            À venir
          </button>


          <button
            type="button"
            className={
              filter === "highlights"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("highlights")
            }
          >
            Temps forts
          </button>

        </div>


        {/* =====================================
            PROGRAMMER UN LIVE
        ===================================== */}

        {filter === "upcoming" && (

          <section
            style={{

              marginBottom:
                "24px",

              padding:
                "18px",

              background:
                "#ffffff",

              borderRadius:
                "16px",

              boxShadow:
                "0 3px 12px rgba(18,63,95,0.08)",

            }}
          >

            <h2
              style={{

                margin:
                  "0 0 16px",

                color:
                  "#123653",

                fontSize:
                  "19px",

              }}
            >

              {editingId
                ? "Modifier le LIVE programmé"
                : "📅 Programmer un LIVE"}

            </h2>


            <form
              onSubmit={
                saveScheduledLive
              }
            >

              <input
                type="text"
                placeholder="Nom du vendeur"
                value={sellerName}
                onChange={(e) =>
                  setSellerName(
                    e.target.value
                  )
                }
                style={inputStyle}
              />


              <input
                type="text"
                placeholder="Produit présenté"
                value={productName}
                onChange={(e) =>
                  setProductName(
                    e.target.value
                  )
                }
                style={inputStyle}
              />


              <input
                type="text"
                placeholder="Prix du produit"
                value={price}
                onChange={(e) =>
                  setPrice(
                    e.target.value
                  )
                }
                style={inputStyle}
              />


              <div
                style={{

                  display:
                    "grid",

                  gridTemplateColumns:
                    "1fr 1fr",

                  gap:
                    "10px",

                }}
              >

                <input
                  type="date"
                  value={date}
                  onChange={(e) =>
                    setDate(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />


                <input
                  type="time"
                  value={time}
                  onChange={(e) =>
                    setTime(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />

              </div>


              <textarea
                placeholder="Description du LIVE"
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                style={{

                  ...inputStyle,

                  minHeight:
                    "100px",

                  resize:
                    "vertical",

                }}
              />


              <button
                type="submit"
                disabled={
                  savingSchedule
                }
                style={
                  primaryButton
                }
              >

                {savingSchedule
                  ? "Enregistrement..."
                  : editingId
                    ? "✓ Enregistrer les modifications"
                    : "📅 Programmer le LIVE"}

              </button>


              {editingId && (

                <button
                  type="button"
                  onClick={
                    cancelEdit
                  }
                  style={
                    secondaryButton
                  }
                >

                  Annuler la modification

                </button>

              )}

            </form>

          </section>

        )}


        {/* =====================================
            CHARGEMENT / ERREUR
        ===================================== */}

        {loading && (

          <div className="my-live-message">

            Chargement de vos LIVE...

          </div>

        )}


        {error && (

          <div className="my-live-message error">

            ⚠️ {error}

          </div>

        )}


        {/* =====================================
            PROGRAMMATIONS
        ===================================== */}

        {filter === "upcoming" &&
          !loading &&
          !error && (

          <section
            style={{
              marginBottom:
                "25px",
            }}
          >

            <h2
              style={{

                color:
                  "#123653",

                fontSize:
                  "18px",

              }}
            >

              Mes LIVE à venir ({upcomingLives.length})

            </h2>


            {upcomingLives.length === 0 && (

              <div className="my-live-empty">

                <div>
                  📅
                </div>

                <h2>
                  Aucun LIVE à venir
                </h2>

                <p>
                  Programmez votre prochain LIVE ci-dessus.
                </p>

              </div>

            )}


            {upcomingLives.map(
              (live) => (

                <article
                  key={live.id}
                  className="my-live-card"
                  style={{
                    marginBottom:
                      "12px",
                  }}
                >

                  <div className="my-live-card-body">

                    <div
                      style={{

                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        gap:
                          "10px",

                        alignItems:
                          "center",

                        marginBottom:
                          "10px",

                      }}
                    >

                      <span
                        style={{

                          padding:
                            "6px 9px",

                          borderRadius:
                            "7px",

                          background:
                            "#eaf6fd",

                          color:
                            "#087fc1",

                          fontSize:
                            "11px",

                          fontWeight:
                            "800",

                        }}
                      >

                        📅 À VENIR

                      </span>


                      <strong
                        style={{

                          color:
                            "#087fc1",

                          fontSize:
                            "13px",

                        }}
                      >

                        {formatDate(
                          live.scheduledAt
                        )}

                      </strong>

                    </div>


                    <h2>

                      {live.productName ||
                        live.title ||
                        "LIVE Client"}

                    </h2>


                    {live.price && (

                      <div className="my-live-price">

                        {live.price}

                      </div>

                    )}


                    <p className="my-live-seller">

                      Vendeur :{" "}

                      <strong>
                        {live.sellerName}
                      </strong>

                    </p>


                    {live.description && (

                      <p
                        style={{

                          color:
                            "#66788a",

                          fontSize:
                            "14px",

                        }}
                      >

                        {live.description}

                      </p>

                    )}


                    <div
                      style={{

                        display:
                          "grid",

                        gridTemplateColumns:
                          "1fr 1fr",

                        gap:
                          "8px",

                        marginTop:
                          "14px",

                      }}
                    >

                      <button
                        type="button"
                        onClick={() =>
                          editScheduledLive(
                            live
                          )
                        }
                        style={
                          editButton
                        }
                      >

                        ✏️ Modifier

                      </button>


                      <button
                        type="button"
                        disabled={
                          deletingId ===
                          `scheduled-${live.id}`
                        }
                        onClick={() =>
                          deleteScheduledLive(
                            live
                          )
                        }
                        style={
                          deleteButton
                        }
                      >

                        {deletingId ===
                        `scheduled-${live.id}`
                          ? "Suppression..."
                          : "🗑 Supprimer"}

                      </button>

                    </div>

                  </div>

                </article>

              )
            )}

          </section>

        )}


        {/* =====================================
            AUTRES LIVE
        ===================================== */}

        {filter !== "upcoming" && (

          <section className="my-live-list">

            {!loading &&
              !error &&
              filteredLives.length === 0 && (

                <div className="my-live-empty">

                  <div>
                    📹
                  </div>

                  <h2>
                    Aucun LIVE
                  </h2>

                  <p>
                    Aucun contenu dans cette catégorie.
                  </p>

                </div>

              )}


            {filteredLives.map(
              (live) => {

                const hasHighlight =
                  live.highlightPublished === true &&
                  typeof live.highlightUrl ===
                    "string" &&
                  live.highlightUrl.trim() !== "";


                const hasReplay =
                  live.replayPublished === true &&
                  typeof live.recordingUrl ===
                    "string" &&
                  live.recordingUrl.trim() !== "";


                const videoUrl =
                  hasHighlight
                    ? live.highlightUrl
                    : hasReplay
                      ? live.recordingUrl
                      : null;


                const deletingHighlight =
                  deletingId ===
                  `highlight-${live.id}`;


                const deletingReplay =
                  deletingId ===
                  `replay-${live.id}`;


                return (

                  <article
                    key={live.id}
                    className="my-live-card"
                  >

                    {videoUrl ? (

                      <div className="my-live-video-box">

                        <video
                          src={videoUrl}
                          controls
                          playsInline
                          preload="metadata"
                        />


                        <span
                          className={
                            live.isLive
                              ? "status-live"
                              : "status-finished"
                          }
                        >

                          {live.isLive
                            ? "● EN DIRECT"
                            : "■ LIVE TERMINÉ"}

                        </span>

                      </div>

                    ) : live.isLive ? (

                      <div className="my-live-no-video">

                        📹

                        <span>
                          LIVE en cours
                        </span>

                      </div>

                    ) : null}


                    <div className="my-live-card-body">

                      <div className="my-live-date">

                        {formatDate(
                          live.stoppedAt ||
                          live.startedAt
                        )}

                      </div>


                      <h2>

                        {live.productName ||
                          live.title ||
                          "Mon LIVE"}

                      </h2>


                      {live.price && (

                        <div className="my-live-price">

                          {live.price}

                        </div>

                      )}


                      <p className="my-live-seller">

                        Vendeur :{" "}

                        <strong>

                          {live.sellerName ||
                            currentUser?.nom ||
                            "Vendeur UMI"}

                        </strong>

                      </p>


                      <div className="my-live-tags">

                        {hasHighlight && (

                          <span>
                            Temps fort
                          </span>

                        )}


                        {hasReplay && (

                          <span>
                            Replay
                          </span>

                        )}

                      </div>


                      {!live.isLive && (

                        <div className="my-live-delete-actions">

                          {hasHighlight && (

                            <button
                              type="button"
                              disabled={
                                deletingHighlight ||
                                deletingReplay
                              }
                              onClick={() =>
                                deleteHighlight(
                                  live
                                )
                              }
                            >

                              {deletingHighlight
                                ? "Suppression..."
                                : "🗑 Supprimer le Temps fort"}

                            </button>

                          )}


                          {hasReplay && (

                            <button
                              type="button"
                              disabled={
                                deletingReplay ||
                                deletingHighlight
                              }
                              onClick={() =>
                                deleteReplay(
                                  live
                                )
                              }
                            >

                              {deletingReplay
                                ? "Suppression..."
                                : "🗑 Supprimer le Replay"}

                            </button>

                          )}

                        </div>

                      )}

                    </div>

                  </article>

                );

              }
            )}

          </section>

        )}

      </main>


      {/* =====================================
          BARRE DE TÂCHES EN BAS
      ===================================== */}

      <nav className="my-live-bottom-nav">


        {/* ACCUEIL */}

        <button
          type="button"
          onClick={onHome}
        >

          <span className="my-live-nav-icon">
            🏠
          </span>

          <small>
            Accueil
          </small>

        </button>


        {/* PANIER */}

        <button
          type="button"
          onClick={onOpenCart}
        >

          <span className="my-live-nav-icon">
            🛒
          </span>

          <small>
            Panier
          </small>

        </button>


        {/* DÉCONNEXION */}

        <button
          type="button"
          className="my-live-nav-logout"
          onClick={onLogout}
        >

          <span className="my-live-nav-icon">
            ↪
          </span>

          <small>
            Déconnexion
          </small>

        </button>

      </nav>

    </div>

  );

}


/* ========================================
   STYLES DU FORMULAIRE
======================================== */

const inputStyle = {

  width:
    "100%",

  boxSizing:
    "border-box",

  marginBottom:
    "12px",

  padding:
    "13px",

  border:
    "1px solid #d9e3ea",

  borderRadius:
    "10px",

  fontFamily:
    "Arial, Helvetica, sans-serif",

  fontSize:
    "14px",

  outline:
    "none",

};


const primaryButton = {

  width:
    "100%",

  minHeight:
    "48px",

  border:
    "none",

  borderRadius:
    "10px",

  background:
    "#087fc1",

  color:
    "#ffffff",

  fontWeight:
    "800",

  cursor:
    "pointer",

};


const secondaryButton = {

  width:
    "100%",

  minHeight:
    "45px",

  marginTop:
    "8px",

  border:
    "1px solid #ccd9e2",

  borderRadius:
    "10px",

  background:
    "#ffffff",

  color:
    "#526674",

  fontWeight:
    "700",

  cursor:
    "pointer",

};


const editButton = {

  minHeight:
    "42px",

  border:
    "1px solid #087fc1",

  borderRadius:
    "9px",

  background:
    "#ffffff",

  color:
    "#087fc1",

  fontWeight:
    "700",

  cursor:
    "pointer",

};


const deleteButton = {

  minHeight:
    "42px",

  border:
    "1px solid #ffd4d4",

  borderRadius:
    "9px",

  background:
    "#fff3f3",

  color:
    "#d72020",

  fontWeight:
    "700",

  cursor:
    "pointer",

};


export default MyClientLives;