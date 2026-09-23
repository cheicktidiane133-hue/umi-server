import { useEffect, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "./firebase";
import "./ClientLive.css";


function ClientLive({ onBack, onCreateClientLive }) {
  const [lives, setLives] = useState([]);


  // ========================================
  // RÉCUPÉRER LES LIVE CLIENTS
  // ========================================

  useEffect(() => {
    const liveQuery = query(
      collection(db, "live"),
      where("isLive", "==", true)
    );

    const unsubscribe = onSnapshot(
      liveQuery,

      (snapshot) => {
        const clientLives = snapshot.docs
          .map((liveDoc) => ({
            id: liveDoc.id,
            ...liveDoc.data(),
          }))
          .filter(
            (live) =>
              live.liveType === "client" &&
              typeof live.roomName === "string" &&
              live.roomName.trim() !== ""
          );

        clientLives.sort((a, b) => {
          const aTime =
            a.startedAt?.seconds || 0;

          const bTime =
            b.startedAt?.seconds || 0;

          return bTime - aTime;
        });

        setLives(clientLives);
      },

      (error) => {
        console.error(
          "Erreur LIVE Clients :",
          error
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);


  return (
    <div className="client-live-page">

      {/* EN-TÊTE */}

      <header className="client-live-header">

        <button
          type="button"
          className="client-live-back"
          onClick={onBack}
        >
          ←
        </button>


        <div className="client-live-header-text">

          <h1>LIVE CLIENTS</h1>

          <p>
            Achetez directement auprès des vendeurs
          </p>

        </div>

      </header>


      {/* INTRODUCTION */}

      <main className="client-live-content">

        <section className="client-live-intro">

          <div className="client-live-intro-icon">
            📱
          </div>

          <div className="client-live-intro-text">

            <h2>
              Vendez en direct
            </h2>

            <p>
              Présentez vos produits en LIVE
              et échangez directement avec
              vos clients.
            </p>

          </div>

        </section>


        {/* BOUTON CRÉER LIVE */}

        <button
          type="button"
          className="create-client-live-button"
          onClick={onCreateClientLive}
        >
          <span>＋</span>

          Créer mon LIVE
        </button>


        {/* TITRE DES DIRECTS */}

        <div className="client-live-section-heading">

          <div>

            <h2>
              En direct maintenant
            </h2>

            <p>
              Découvrez les produits présentés
              par nos vendeurs.
            </p>

          </div>


          {lives.length > 0 && (

            <div className="client-live-number">

              <span></span>

              {lives.length} LIVE

            </div>

          )}

        </div>


        {/* AUCUN LIVE */}

        {lives.length === 0 ? (

          <section className="client-no-live">

            <div className="client-no-live-icon">
              📹
            </div>

            <h3>
              Aucun LIVE Client actuellement
            </h3>

            <p>
              Soyez le premier vendeur à
              présenter un produit en direct.
            </p>

          </section>

        ) : (

          /* LISTE DES LIVE CLIENTS */

          <div className="client-live-list">

            {lives.map((live) => (

              <article
                className="client-live-card"
                key={live.id}
              >

                <div className="client-live-video">

                  <div className="client-live-badge">

                    <span></span>

                    EN DIRECT

                  </div>


                  <div className="client-live-play">
                    ▶
                  </div>

                </div>


                <div className="client-live-card-body">

                  <div className="client-live-seller">

                    <div className="client-live-avatar">

                      {live.sellerName
                        ? live.sellerName
                            .charAt(0)
                            .toUpperCase()
                        : "V"}

                    </div>


                    <div>

                      <strong>
                        {live.sellerName ||
                          "Vendeur UMI"}
                      </strong>

                      <span>
                        Vendeur
                      </span>

                    </div>

                  </div>


                  <h3>
                    {live.productName ||
                      live.title ||
                      "Produit en LIVE"}
                  </h3>


                  {live.price && (

                    <div className="client-live-price">
                      {live.price}
                    </div>

                  )}


                  <div className="client-live-actions">

                    <button type="button">
                      💬 Question
                    </button>

                    <button type="button">
                      🛒 Acheter
                    </button>

                  </div>

                </div>

              </article>

            ))}

          </div>

        )}

      </main>

    </div>
  );
}

export default ClientLive;