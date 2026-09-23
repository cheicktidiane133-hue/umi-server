import {
  useEffect,
  useState,
} from "react";

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
import "./ScheduleLive.css";


function ScheduleLive({ onBack }) {
  const [title, setTitle] =
    useState("");

  const [machineName, setMachineName] =
    useState("");

  const [date, setDate] =
    useState("");

  const [time, setTime] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [editingId, setEditingId] =
    useState("");

  const [scheduledLives, setScheduledLives] =
    useState([]);

  const [deletingId, setDeletingId] =
    useState("");

  const [now, setNow] =
    useState(Date.now());


  /* =====================================
     HORLOGE
  ===================================== */

  useEffect(() => {
    const interval =
      setInterval(() => {
        setNow(Date.now());
      }, 15000);

    return () =>
      clearInterval(interval);
  }, []);


  /* =====================================
     CHARGER LES PROGRAMMATIONS
  ===================================== */

  useEffect(() => {
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
                  live.isScheduled === true &&
                  live.isLive !== true &&
                  live.scheduledAt
              );

          setScheduledLives(items);
        },

        (error) => {
          console.error(
            "Erreur chargement programmations :",
            error
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);


  /* =====================================
     PROGRAMMATIONS FUTURES
     UMI TOUJOURS EN PREMIER
  ===================================== */

  const futureLives =
    scheduledLives
      .filter(
        (live) =>
          live.scheduledAt.toMillis() >
          now
      )
      .sort((a, b) => {
        const aUmi =
          !a.liveType ||
          a.liveType === "umi";

        const bUmi =
          !b.liveType ||
          b.liveType === "umi";

        if (aUmi && !bUmi) {
          return -1;
        }

        if (!aUmi && bUmi) {
          return 1;
        }

        return (
          a.scheduledAt.toMillis() -
          b.scheduledAt.toMillis()
        );
      });


  /* =====================================
     ENREGISTRER
  ===================================== */

  const scheduleLive =
    async (event) => {
      event.preventDefault();

      setMessage("");

      if (!title.trim()) {
        setMessage(
          "Veuillez saisir le titre du LIVE."
        );
        return;
      }

      if (!machineName.trim()) {
        setMessage(
          "Veuillez saisir le nom de la machine."
        );
        return;
      }

      if (!date || !time) {
        setMessage(
          "Veuillez choisir la date et l'heure du LIVE."
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
        setMessage(
          "La date ou l'heure est incorrecte."
        );
        return;
      }

      if (
        scheduledDate.getTime() <=
        Date.now()
      ) {
        setMessage(
          "La date du LIVE doit être dans le futur."
        );
        return;
      }

      try {
        setIsSaving(true);

        const liveId =
          editingId ||
          crypto.randomUUID?.() ||
          `scheduled-${Date.now()}`;

        const data = {
          liveType: "umi",

          title:
            title.trim(),

          machineName:
            machineName.trim(),

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

          broadcasterIdentity:
            null,

          recordingStatus:
            null,

          recordingFilePath:
            null,

          recordingUrl:
            null,

          hasReplay: false,

          replayPublished:
            false,

          highlightStatus:
            null,

          highlightPublished:
            false,

          highlightUrl:
            null,

          stoppedBy:
            null,
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

        setTitle("");
        setMachineName("");
        setDate("");
        setTime("");
        setDescription("");
        setEditingId("");

        setMessage(
          editingId
            ? "✅ Le LIVE programmé a été modifié."
            : "✅ Le LIVE a été programmé avec succès."
        );
      } catch (error) {
        console.error(
          "Erreur programmation LIVE :",
          error
        );

        setMessage(
          "Impossible de programmer le LIVE."
        );
      } finally {
        setIsSaving(false);
      }
    };


  /* =====================================
     MODIFIER UMI
  ===================================== */

  const editLive = (live) => {
    if (
      live.liveType === "client"
    ) {
      return;
    }

    const scheduledDate =
      live.scheduledAt.toDate();

    setTitle(
      live.title || ""
    );

    setMachineName(
      live.machineName || ""
    );

    setDescription(
      live.description || ""
    );

    setDate(
      `${scheduledDate.getFullYear()}-${String(
        scheduledDate.getMonth() + 1
      ).padStart(2, "0")}-${String(
        scheduledDate.getDate()
      ).padStart(2, "0")}`
    );

    setTime(
      `${String(
        scheduledDate.getHours()
      ).padStart(2, "0")}:${String(
        scheduledDate.getMinutes()
      ).padStart(2, "0")}`
    );

    setEditingId(live.id);
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };


  /* =====================================
     ANNULER MODIFICATION
  ===================================== */

  const cancelEdit = () => {
    setEditingId("");
    setTitle("");
    setMachineName("");
    setDate("");
    setTime("");
    setDescription("");
    setMessage("");
  };


  /* =====================================
     SUPPRIMER PROGRAMMATION
     ADMIN PEUT AUSSI SUPPRIMER CLIENT
  ===================================== */

  const deleteScheduledLive =
    async (live) => {
      const type =
        live.liveType === "client"
          ? "LIVE Client"
          : "LIVE UMI";

      const confirmed =
        window.confirm(
          `Supprimer ce ${type} programmé ?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(live.id);

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
      } catch (error) {
        console.error(
          "Erreur suppression programmation :",
          error
        );

        alert(
          "Impossible de supprimer cette programmation."
        );
      } finally {
        setDeletingId("");
      }
    };


  /* =====================================
     FORMAT DATE
  ===================================== */

  const formatDate =
    (timestamp) => {
      const value =
        timestamp?.toDate?.();

      if (!value) {
        return "";
      }

      return value.toLocaleString(
        "fr-FR",
        {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    };


  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7f9",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >

      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          padding: "16px",
          background: "#ffffff",
          borderBottom:
            "1px solid #e5e8eb",
        }}
      >

        <button
          type="button"
          onClick={onBack}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            border:
              "1px solid #dce3e8",
            background: "#ffffff",
            fontSize: "21px",
            cursor: "pointer",
          }}
        >
          ←
        </button>

        <div>
          <h1
            style={{
              margin: 0,
              color: "#087fc1",
              fontSize: "20px",
              fontWeight: "700",
            }}
          >
            PROGRAMMER UN LIVE
          </h1>

          <p
            style={{
              margin: "4px 0 0",
              color: "#7a8790",
              fontSize: "13px",
            }}
          >
            Planifiez les prochains UMI LIVE
          </p>
        </div>

      </header>


      <main
        style={{
          maxWidth: "650px",
          margin: "0 auto",
          padding:
            "20px 16px 40px",
        }}
      >

        {/* FORMULAIRE */}

        <form
          onSubmit={scheduleLive}
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "18px",
            boxShadow:
              "0 3px 14px rgba(0,0,0,0.06)",
          }}
        >

          <h2
            style={{
              margin:
                "0 0 18px",
              color: "#173e59",
              fontSize: "18px",
            }}
          >
            {editingId
              ? "Modifier le LIVE programmé"
              : "Nouveau LIVE UMI"}
          </h2>


          <label className="schedule-live-label">
            Titre du LIVE

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              placeholder="Ex : Présentation nouvelle machine"
              className="schedule-live-input"
            />
          </label>


          <label className="schedule-live-label">
            Machine présentée

            <input
              type="text"
              value={machineName}
              onChange={(event) =>
                setMachineName(
                  event.target.value
                )
              }
              placeholder="Ex : Machine d'emballage automatique"
              className="schedule-live-input"
            />
          </label>


          <div className="schedule-live-date-row">

            <label className="schedule-live-label">
              Date

              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
                    event.target.value
                  )
                }
                className="schedule-live-input"
              />
            </label>


            <label className="schedule-live-label">
              Heure

              <input
                type="time"
                value={time}
                onChange={(event) =>
                  setTime(
                    event.target.value
                  )
                }
                className="schedule-live-input"
              />
            </label>

          </div>


          <label className="schedule-live-label">
            Description

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Décrivez ce qui sera présenté..."
              className="schedule-live-input schedule-live-textarea"
            />
          </label>


          {message && (
            <div
              style={{
                marginBottom:
                  "16px",
                padding: "12px",
                borderRadius:
                  "10px",
                background:
                  "#f1f7fb",
                color:
                  "#087fc1",
                fontSize:
                  "14px",
                fontWeight:
                  "600",
              }}
            >
              {message}
            </div>
          )}


          <button
            type="submit"
            disabled={isSaving}
            style={{
              width: "100%",
              border: "none",
              borderRadius:
                "12px",
              padding: "14px",
              background:
                "#087fc1",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              opacity:
                isSaving
                  ? 0.7
                  : 1,
            }}
          >
            {isSaving
              ? "Enregistrement..."
              : editingId
                ? "✓ Enregistrer les modifications"
                : "📅 Programmer le LIVE"}
          </button>


          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              style={{
                width: "100%",
                marginTop:
                  "9px",
                padding: "12px",
                border:
                  "1px solid #d6e0e6",
                borderRadius:
                  "11px",
                background:
                  "#ffffff",
                color:
                  "#60727e",
                fontWeight:
                  "700",
                cursor:
                  "pointer",
              }}
            >
              Annuler
            </button>
          )}

        </form>


        {/* =================================
            LISTE DES PROGRAMMATIONS
        ================================= */}

        <section
          style={{
            marginTop: "28px",
          }}
        >

          <h2
            style={{
              margin:
                "0 0 14px",
              color: "#173e59",
              fontSize: "19px",
            }}
          >
            LIVE à venir ({futureLives.length})
          </h2>


          {futureLives.length ===
            0 && (

            <div
              style={{
                padding:
                  "30px 20px",
                background:
                  "#ffffff",
                borderRadius:
                  "15px",
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  fontSize:
                    "35px",
                }}
              >
                📅
              </div>

              <h3>
                Aucun LIVE programmé
              </h3>
            </div>

          )}


          {futureLives.map(
            (live) => {

              const client =
                live.liveType ===
                "client";

              return (

                <article
                  key={live.id}
                  style={{
                    marginBottom:
                      "12px",
                    padding:
                      "16px",
                    background:
                      "#ffffff",
                    borderRadius:
                      "15px",
                    boxShadow:
                      "0 3px 12px rgba(18,63,95,0.07)",
                  }}
                >

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: "8px",
                    }}
                  >

                    <span
                      style={{
                        padding:
                          "6px 9px",
                        borderRadius:
                          "7px",
                        background:
                          client
                            ? "#f0f3f5"
                            : "#e8f5fd",
                        color:
                          client
                            ? "#526673"
                            : "#087fc1",
                        fontSize:
                          "11px",
                        fontWeight:
                          "800",
                      }}
                    >
                      {client
                        ? "👤 LIVE CLIENT"
                        : "UMI LIVE"}
                    </span>

                    <span
                      style={{
                        color:
                          "#087fc1",
                        fontSize:
                          "12px",
                        fontWeight:
                          "700",
                      }}
                    >
                      {formatDate(
                        live.scheduledAt
                      )}
                    </span>

                  </div>


                  <h3
                    style={{
                      margin:
                        "14px 0 6px",
                      color:
                        "#173e59",
                    }}
                  >
                    {client
                      ? live.productName ||
                        live.title
                      : live.title}
                  </h3>


                  <p
                    style={{
                      margin:
                        "0 0 7px",
                      color:
                        "#657987",
                      fontSize:
                        "14px",
                    }}
                  >
                    {client
                      ? `Vendeur : ${
                          live.sellerName ||
                          "Vendeur UMI"
                        }`
                      : `Machine : ${
                          live.machineName ||
                          ""
                        }`}
                  </p>


                  {live.description && (
                    <p
                      style={{
                        color:
                          "#748590",
                        fontSize:
                          "13px",
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
                        client
                          ? "1fr"
                          : "1fr 1fr",
                      gap: "8px",
                      marginTop:
                        "14px",
                    }}
                  >

                    {!client && (
                      <button
                        type="button"
                        onClick={() =>
                          editLive(
                            live
                          )
                        }
                        style={{
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
                        }}
                      >
                        ✏️ Modifier
                      </button>
                    )}


                    <button
                      type="button"
                      disabled={
                        deletingId ===
                        live.id
                      }
                      onClick={() =>
                        deleteScheduledLive(
                          live
                        )
                      }
                      style={{
                        minHeight:
                          "42px",
                        border:
                          "1px solid #ffd3d3",
                        borderRadius:
                          "9px",
                        background:
                          "#fff2f2",
                        color:
                          "#d51e1e",
                        fontWeight:
                          "700",
                        cursor:
                          "pointer",
                      }}
                    >
                      {deletingId ===
                      live.id
                        ? "Suppression..."
                        : client
                          ? "🗑 Supprimer ce LIVE Client"
                          : "🗑 Supprimer"}
                    </button>

                  </div>

                </article>

              );
            }
          )}

        </section>

      </main>

    </div>
  );
}


export default ScheduleLive;