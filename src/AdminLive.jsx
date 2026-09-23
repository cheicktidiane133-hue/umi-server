import { useEffect, useState } from "react";

import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

import "./AdminLive.css";
import logoUmi from "./assets/logo-umi.jpeg";


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
    live.startedAt?.seconds ||
    live.createdAt?.seconds ||
    0
  );

}


/* =========================================
   PAGE GÉRER UMI LIVE
========================================= */

function AdminLive({
  onBack,
  onCreateLive,
  onScheduleLive,
  onOpenReplays,

  /* BARRE DE TÂCHES */

  onHome,
  onOpenCart,
  onLogout,
}) {

  const [
    activeLives,
    setActiveLives,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    stoppingLiveId,
    setStoppingLiveId,
  ] = useState(null);


  /* =========================================
     CHARGER UNIQUEMENT LES LIVE EN COURS
  ========================================= */

  useEffect(() => {

    const unsubscribe =
      onSnapshot(

        collection(
          db,
          "live"
        ),

        (snapshot) => {

          const allLives =
            snapshot.docs.map(
              (document) => ({

                id: document.id,

                ...document.data(),

              })
            );


          const active =
            allLives

              .filter(
                (live) =>
                  live.isLive === true
              )

              .sort(
                (a, b) =>
                  getDateValue(b) -
                  getDateValue(a)
              );


          setActiveLives(
            active
          );


          setLoading(
            false
          );

        },

        (error) => {

          console.error(
            "Erreur chargement LIVE :",
            error
          );


          setActiveLives(
            []
          );


          setLoading(
            false
          );

        }

      );


    return () => {

      unsubscribe();

    };

  }, []);


  /* =========================================
     ARRÊTER UN LIVE CLIENT
  ========================================= */

  const stopClientLive =
    async (live) => {

      if (!live?.id) {

        alert(
          "Identifiant du LIVE manquant."
        );

        return;

      }


      if (!live?.roomName) {

        alert(
          "La salle LiveKit de ce LIVE est introuvable."
        );

        return;

      }


      const confirmation =
        window.confirm(
          "Voulez-vous vraiment arrêter ce LIVE client ?"
        );


      if (!confirmation) {

        return;

      }


      try {

        setStoppingLiveId(
          live.id
        );


        /* =================================
           1. ARRÊTER LIVEKIT
           + ENREGISTREMENT
        ================================= */

        const response =
          await fetch(
            "/admin-stop-live",
            {

              method: "POST",

              headers: {

                "Content-Type":
                  "application/json",

              },

              body: JSON.stringify({

                roomName:
                  live.roomName,

                egressId:
                  live.egressId ||
                  null,

                recordingFilePath:
                  live.recordingFilePath ||
                  null,

                liveId:
                  live.id,

                liveType:
                  live.liveType ||
                  "client",

              }),

            }
          );


        const result =
          await response.json();


        if (!response.ok) {

          throw new Error(
            result?.error ||
            "Impossible d'arrêter le LIVE."
          );

        }


        /* =================================
           2. FIRESTORE
        ================================= */

        await updateDoc(

          doc(
            db,
            "live",
            live.id
          ),

          {

            isLive: false,

            stoppedAt:
              serverTimestamp(),

            recordingStatus:
              live.egressId
                ? "stopped"
                : (
                    live.recordingStatus ||
                    "stopped"
                  ),

            highlightStatus:
              result?.highlightStarted
                ? "processing"
                : (
                    live.highlightStatus ||
                    null
                  ),

          }

        );


        alert(
          "LIVE client arrêté avec succès."
        );


      } catch (error) {

        console.error(
          "Erreur arrêt LIVE client :",
          error
        );


        alert(
          error?.message ||
          "Impossible d'arrêter le LIVE client."
        );


      } finally {

        setStoppingLiveId(
          null
        );

      }

    };


  /* =========================================
     AFFICHAGE
  ========================================= */

  return (

    <div className="admin-live-page">


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="admin-live-header">

        <button
          type="button"
          className="admin-live-back"
          onClick={onBack}
        >
          ←
        </button>


        <div className="admin-live-brand">

          <div className="admin-live-title">

            GÉRER{" "}

            <span>
              UMI LIVE
            </span>

          </div>


          <div className="admin-live-subtitle">

            Gestion des directs en cours

          </div>

        </div>


        <img
          src={logoUmi}
          alt="UMI"
          className="admin-live-logo"
        />

      </header>


      {/* =====================================
          ACTIONS UMI
      ===================================== */}

      <section
        style={{

          width:
            "calc(100% - 24px)",

          maxWidth:
            "626px",

          margin:
            "20px auto",

        }}
      >

        <div
          style={{

            marginBottom:
              "10px",

            color:
              "#163d59",

            fontSize:
              "14px",

            fontWeight:
              "800",

          }}
        >

          Actions UMI

        </div>


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

          {/* CRÉER LIVE */}

          <button
            type="button"
            className="create-live-button"
            onClick={
              onCreateLive
            }
          >

            ＋ Créer un LIVE

          </button>


          {/* PROGRAMMER LIVE */}

          <button
            type="button"
            onClick={
              onScheduleLive
            }

            style={{

              width:
                "100%",

              minHeight:
                "52px",

              padding:
                "10px 8px",

              border:
                "1px solid #087fc1",

              borderRadius:
                "12px",

              background:
                "#ffffff",

              color:
                "#087fc1",

              fontFamily:
                "Arial, Helvetica, sans-serif",

              fontSize:
                "13px",

              fontWeight:
                "800",

              cursor:
                "pointer",

            }}
          >

            📅 Programmer un LIVE

          </button>

        </div>


        {/* =================================
            REDIFFUSIONS
        ================================= */}

        <button
          type="button"
          onClick={
            onOpenReplays
          }

          style={{

            width:
              "100%",

            minHeight:
              "58px",

            marginTop:
              "10px",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            padding:
              "12px 16px",

            border:
              "none",

            borderRadius:
              "14px",

            background:
              "#087fc1",

            color:
              "#ffffff",

            fontFamily:
              "Arial, Helvetica, sans-serif",

            cursor:
              "pointer",

            boxShadow:
              "0 5px 16px rgba(8, 127, 193, 0.18)",

          }}
        >

          <span
            style={{

              display:
                "flex",

              alignItems:
                "center",

              gap:
                "10px",

            }}
          >

            <span
              style={{
                fontSize:
                  "23px",
              }}
            >
              🎬
            </span>


            <span
              style={{
                textAlign:
                  "left",
              }}
            >

              <span
                style={{

                  display:
                    "block",

                  fontSize:
                    "14px",

                  fontWeight:
                    "800",

                }}
              >

                Rediffusions

              </span>


              <span
                style={{

                  display:
                    "block",

                  marginTop:
                    "2px",

                  fontSize:
                    "10px",

                  fontWeight:
                    "500",

                  opacity:
                    "0.9",

                }}
              >

                Replay et Temps forts UMI + Clients

              </span>

            </span>

          </span>


          <span
            style={{

              fontSize:
                "22px",

              fontWeight:
                "700",

            }}
          >

            ›

          </span>

        </button>

      </section>


      {/* =====================================
          CHARGEMENT
      ===================================== */}

      {loading && (

        <div
          style={{

            width:
              "calc(100% - 32px)",

            maxWidth:
              "626px",

            margin:
              "35px auto",

            textAlign:
              "center",

            color:
              "#64748b",

            fontSize:
              "14px",

            fontWeight:
              "700",

          }}
        >

          Chargement des directs...

        </div>

      )}


      {/* =====================================
          AUCUN LIVE EN COURS
      ===================================== */}

      {!loading &&
        activeLives.length === 0 && (

        <div
          style={{

            width:
              "calc(100% - 32px)",

            maxWidth:
              "626px",

            margin:
              "45px auto",

            textAlign:
              "center",

            color:
              "#64748b",

          }}
        >

          <div
            style={{

              fontSize:
                "42px",

              marginBottom:
                "12px",

            }}
          >
            📡
          </div>


          <div
            style={{

              fontSize:
                "17px",

              fontWeight:
                "800",

              color:
                "#334155",

            }}
          >

            Aucun live en cours

          </div>

        </div>

      )}


      {/* =====================================
          LIVE ACTUELLEMENT EN COURS
      ===================================== */}

      {!loading &&
        activeLives.length > 0 && (

        <section className="active-lives-section">

          <div className="active-lives-title">

            <h2>
              🔴 LIVE actuellement en cours
            </h2>


            <span className="active-live-count">

              {activeLives.length}

            </span>

          </div>


          <div className="admin-live-list">

            {activeLives.map(
              (live) => {

                const umi =
                  isUmiLive(
                    live
                  );


                return (

                  <div
                    className="admin-live-card"
                    key={
                      live.id
                    }
                  >

                    {/* =========================
                        HAUT DE CARTE
                    ========================= */}

                    <div className="admin-live-card-top">

                      <span className="admin-live-status">

                        {umi
                          ? "● LIVE UMI"
                          : "● LIVE CLIENT"}

                      </span>


                      <span className="admin-viewer-count">

                        🔴 EN DIRECT

                      </span>

                    </div>


                    {/* =========================
                        TITRE
                    ========================= */}

                    <h3>

                      {live.title ||
                        live.productName ||
                        "LIVE"}

                    </h3>


                    {/* =========================
                        INFORMATIONS
                    ========================= */}

                    {umi ? (

                      <p className="admin-machine-name">

                        Machine :{" "}

                        <strong>

                          {live.machineName ||
                            "Non renseignée"}

                        </strong>

                      </p>

                    ) : (

                      <>

                        <p className="admin-machine-name">

                          Vendeur :{" "}

                          <strong>

                            {live.sellerName ||
                              live.userName ||
                              "Non renseigné"}

                          </strong>

                        </p>


                        <p className="admin-machine-name">

                          Produit :{" "}

                          <strong>

                            {live.productName ||
                              "Non renseigné"}

                          </strong>

                        </p>

                      </>

                    )}


                    {/* =========================
                        ENREGISTREMENT
                    ========================= */}

                    <div
                      style={{

                        marginTop:
                          "12px",

                        padding:
                          "10px",

                        borderRadius:
                          "9px",

                        background:
                          "#f4f7f9",

                        fontSize:
                          "13px",

                        fontWeight:
                          "700",

                        color:
                          "#44515a",

                      }}
                    >

                      🎥 Enregistrement :{" "}

                      {live.recordingStatus ||
                        "non démarré"}

                    </div>


              

                  </div>

                );

              }
            )}

          </div>

        </section>

      )}


      {/* =====================================
          BARRE DE TÂCHES DU BAS
      ===================================== */}

      <nav className="admin-live-bottom-nav">


        {/* ACCUEIL */}

        <button
          type="button"
          onClick={
            onHome
          }
        >

          <span className="admin-live-nav-icon">
            🏠
          </span>

          <small>
            Accueil
          </small>

        </button>


        {/* PANIER */}

        <button
          type="button"
          onClick={
            onOpenCart
          }
        >

          <span className="admin-live-nav-icon">
            🛒
          </span>

          <small>
            Panier
          </small>

        </button>


        {/* DÉCONNEXION */}

        <button
          type="button"
          className="admin-live-nav-logout"
          onClick={
            onLogout
          }
        >

          <span className="admin-live-nav-icon">
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


export default AdminLive;