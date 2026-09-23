import { useEffect, useState } from "react";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "./firebase";

import "./CommerceModule.css";


function AdminQuotes({
  onBack,
}) {

  const [quotes, setQuotes] =
    useState([]);

  const [loading, setLoading] =
    useState(true);


  /* =========================================
     CHARGER LES DEMANDES DE DEVIS
  ========================================= */

  useEffect(() => {

    const quotesRef =
      collection(
        db,
        "quotes"
      );

    const quotesQuery =
      query(
        quotesRef,
        orderBy(
          "createdAt",
          "desc"
        )
      );


    const unsubscribe =
      onSnapshot(

        quotesQuery,

        (snapshot) => {

          const quotesData =
            snapshot.docs.map(
              (document) => ({
                id: document.id,
                ...document.data(),
              })
            );

          setQuotes(
            quotesData
          );

          setLoading(
            false
          );

        },

        (error) => {

          console.error(
            "Erreur chargement devis :",
            error
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
     DATE
  ========================================= */

  const formatDate = (
    createdAt
  ) => {

    if (!createdAt) {
      return "";
    }

    try {

      const date =
        createdAt.toDate
          ? createdAt.toDate()
          : new Date(
              createdAt
            );

      return date.toLocaleString(
        "fr-FR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );

    } catch {

      return "";

    }

  };


  /* =========================================
     PAGE
  ========================================= */

  return (

    <div
      style={{
        minHeight: "100vh",
        background: "#f3f7fb",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header
        style={{
          minHeight: "85px",
          background:
            "linear-gradient(135deg, #064a7a, #0787df)",
          display: "flex",
          alignItems: "center",
          gap: "15px",
          padding: "15px",
          color: "#ffffff",
          position: "sticky",
          top: "0",
          zIndex: "100",
        }}
      >

        <button
          type="button"
          onClick={onBack}
          style={{
            width: "42px",
            height: "42px",
            border: "none",
            borderRadius: "50%",
            background:
              "rgba(255,255,255,0.18)",
            color: "#ffffff",
            fontSize: "24px",
            cursor: "pointer",
          }}
        >
          ←
        </button>


        <div>

          <h1
            style={{
              margin: "0",
              fontSize: "21px",
              fontWeight: "800",
            }}
          >
            Demandes de devis
          </h1>

          <p
            style={{
              margin: "4px 0 0",
              fontSize: "12px",
              opacity: "0.9",
            }}
          >
            Administration UMI
          </p>

        </div>

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main
        style={{
          width: "100%",
          maxWidth: "700px",
          margin: "0 auto",
          padding: "18px 12px 40px",
        }}
      >


        {/* =================================
            TITRE
        ================================= */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "18px",
            marginBottom: "15px",
            boxShadow:
              "0 3px 14px rgba(18,63,95,0.08)",
          }}
        >

          <div
            style={{
              fontSize: "32px",
              marginBottom: "8px",
            }}
          >
            📄
          </div>

          <h2
            style={{
              margin: "0 0 5px",
              color: "#173e59",
              fontSize: "19px",
            }}
          >
            Devis clients
          </h2>

          <p
            style={{
              margin: "0",
              color: "#758596",
              fontSize: "13px",
              lineHeight: "1.5",
            }}
          >
            Consultez les demandes de
            devis envoyées par les clients.
          </p>

        </div>


        {/* =================================
            CHARGEMENT
        ================================= */}

        {loading && (

          <div
            style={{
              padding: "35px 15px",
              textAlign: "center",
              color: "#758596",
            }}
          >
            Chargement des devis...
          </div>

        )}


        {/* =================================
            AUCUN DEVIS
        ================================= */}

        {!loading &&
          quotes.length === 0 && (

            <div
              style={{
                background:
                  "#ffffff",
                borderRadius:
                  "16px",
                padding:
                  "35px 20px",
                textAlign:
                  "center",
                boxShadow:
                  "0 3px 14px rgba(18,63,95,0.08)",
              }}
            >

              <div
                style={{
                  fontSize:
                    "42px",
                  marginBottom:
                    "10px",
                }}
              >
                📄
              </div>

              <h3
                style={{
                  margin:
                    "0 0 7px",
                  color:
                    "#173e59",
                }}
              >
                Aucun devis
              </h3>

              <p
                style={{
                  margin: "0",
                  color:
                    "#81909e",
                  fontSize:
                    "13px",
                }}
              >
                Les nouvelles demandes
                apparaîtront ici.
              </p>

            </div>

          )}


        {/* =================================
            LISTE DES DEVIS
        ================================= */}

        {!loading &&
          quotes.map(
            (quote) => (

              <div
                key={
                  quote.id
                }
                style={{
                  background:
                    "#ffffff",
                  borderRadius:
                    "16px",
                  padding:
                    "16px",
                  marginBottom:
                    "12px",
                  border:
                    "1px solid #e5edf3",
                  boxShadow:
                    "0 3px 12px rgba(18,63,95,0.06)",
                }}
              >


                {/* CLIENT */}

                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    gap: "10px",
                    marginBottom:
                      "12px",
                  }}
                >

                  <div>

                    <strong
                      style={{
                        display:
                          "block",
                        color:
                          "#173e59",
                        fontSize:
                          "15px",
                      }}
                    >
                      {quote.userName ||
                        quote.name ||
                        quote.nom ||
                        "Client UMI"}
                    </strong>

                    <span
                      style={{
                        color:
                          "#81909e",
                        fontSize:
                          "11px",
                      }}
                    >
                      {formatDate(
                        quote.createdAt
                      )}
                    </span>

                  </div>


                  <span
                    style={{
                      padding:
                        "6px 10px",
                      borderRadius:
                        "20px",
                      background:
                        "#e8f4ff",
                      color:
                        "#0877c2",
                      fontSize:
                        "11px",
                      fontWeight:
                        "700",
                    }}
                  >
                    {quote.status ||
                      "Nouveau"}
                  </span>

                </div>


                {/* PRODUIT */}

                {(quote.productName ||
                  quote.product?.name) && (

                  <div
                    style={{
                      padding:
                        "11px",
                      marginBottom:
                        "10px",
                      borderRadius:
                        "10px",
                      background:
                        "#f4f8fb",
                    }}
                  >

                    <span
                      style={{
                        display:
                          "block",
                        color:
                          "#81909e",
                        fontSize:
                          "10px",
                        marginBottom:
                          "3px",
                      }}
                    >
                      PRODUIT
                    </span>

                    <strong
                      style={{
                        color:
                          "#173e59",
                        fontSize:
                          "13px",
                      }}
                    >
                      {quote.productName ||
                        quote.product?.name}
                    </strong>

                  </div>

                )}


                {/* EMAIL */}

                {quote.email && (

                  <p
                    style={{
                      margin:
                        "7px 0",
                      color:
                        "#536777",
                      fontSize:
                        "13px",
                    }}
                  >
                    <strong>
                      Email :
                    </strong>{" "}
                    {quote.email}
                  </p>

                )}


                {/* TÉLÉPHONE */}

                {quote.telephone && (

                  <p
                    style={{
                      margin:
                        "7px 0",
                      color:
                        "#536777",
                      fontSize:
                        "13px",
                    }}
                  >
                    <strong>
                      Téléphone :
                    </strong>{" "}
                    {quote.telephone}
                  </p>

                )}


                {/* QUANTITÉ */}

                {quote.quantity && (

                  <p
                    style={{
                      margin:
                        "7px 0",
                      color:
                        "#536777",
                      fontSize:
                        "13px",
                    }}
                  >
                    <strong>
                      Quantité :
                    </strong>{" "}
                    {quote.quantity}
                  </p>

                )}


                {/* MESSAGE */}

                {quote.message && (

                  <div
                    style={{
                      marginTop:
                        "12px",
                      padding:
                        "12px",
                      borderRadius:
                        "10px",
                      background:
                        "#f8fafc",
                    }}
                  >

                    <strong
                      style={{
                        display:
                          "block",
                        color:
                          "#173e59",
                        fontSize:
                          "12px",
                        marginBottom:
                          "5px",
                      }}
                    >
                      Message du client
                    </strong>

                    <p
                      style={{
                        margin:
                          "0",
                        color:
                          "#657786",
                        fontSize:
                          "13px",
                        lineHeight:
                          "1.5",
                        whiteSpace:
                          "pre-wrap",
                      }}
                    >
                      {quote.message}
                    </p>

                  </div>

                )}

              </div>

            )
          )}

      </main>

    </div>

  );

}


export default AdminQuotes;