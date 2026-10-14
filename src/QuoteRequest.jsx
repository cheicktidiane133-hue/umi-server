import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import { useState } from "react";

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import {
  auth,
  db,
} from "./firebase";

import "./CommerceModule.css";


function QuoteRequest({
  user,
  userPhoto,
  product,
  onBack,
  onOpenQuotes,

  /* BARRE DES TÂCHES */
  onHome,
  onMachines,
  onLive,
  onCart,
  onAccount,
}) {

  /* =========================================
     INFORMATIONS CLIENT
  ========================================= */

  const [fullName, setFullName] =
    useState(
      user?.nom ||
      user?.name ||
      ""
    );

  const [phone, setPhone] =
    useState(
      user?.telephone ||
      user?.phone ||
      ""
    );

  const [email, setEmail] =
    useState(
      user?.email ||
      ""
    );

  const [companyName, setCompanyName] =
    useState("");


  /* =========================================
     INFORMATIONS DEVIS
  ========================================= */

  const [subject, setSubject] =
    useState(
      product?.name
        ? `Demande de devis - ${product.name}`
        : ""
    );

  const [quantity, setQuantity] =
    useState("");

  const [country, setCountry] =
    useState("");

  const [budget, setBudget] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [
    showNewQuoteForm,
    setShowNewQuoteForm,
  ] = useState(true);


  /* =========================================
     FERMER LA FENÊTRE NOUVEAU DEVIS
  ========================================= */

  const closeNewQuoteForm = () => {
  if (saving) {
    return;
  }

  onBack?.();
};



  /* =========================================
     ENVOYER LA DEMANDE
  ========================================= */

  const handleSubmit = async (event) => {

    event.preventDefault();


    /* =====================================
       VÉRIFIER CONNEXION
    ===================================== */

    const currentUserId =
      auth.currentUser?.uid ||
      user?.uid ||
      user?.userId ||
      "";

    if (!currentUserId) {

      await umiNotify(
        "Vous devez être connecté."
      );

      return;
    }


    /* =====================================
       NOM ET PRÉNOM
    ===================================== */

    if (!fullName.trim()) {

      await umiNotify(
        "Indiquez votre nom et prénom."
      );

      return;
    }


    /* =====================================
       TÉLÉPHONE
    ===================================== */

    if (!phone.trim()) {

      await umiNotify(
        "Indiquez votre numéro de téléphone."
      );

      return;
    }


    /* =====================================
       EMAIL
    ===================================== */

    if (!email.trim()) {

      await umiNotify(
        "Indiquez votre adresse e-mail."
      );

      return;
    }


    /* =====================================
       OBJET
    ===================================== */

    if (!subject.trim()) {

      await umiNotify(
        "Indiquez l'objet de votre demande."
      );

      return;
    }


    /* =====================================
       BESOIN
    ===================================== */

    if (!message.trim()) {

      await umiNotify(
        "Décrivez votre besoin."
      );

      return;
    }


    try {

      setSaving(true);


      /* =====================================
         ENREGISTRER DANS FIRESTORE
      ===================================== */

      await addDoc(
        collection(
          db,
          "quotes"
        ),
        {

          /* UTILISATEUR */

          userId:
            currentUserId,


          /* INFORMATIONS CLIENT */

          clientName:
            fullName.trim(),

          email:
            email.trim(),

          phone:
            phone.trim(),

          companyName:
            companyName.trim(),


          /* INFORMATIONS DEVIS */

          subject:
            subject.trim(),

          quantity:
            quantity.trim(),

          country:
            country.trim(),

          budget:
            budget.trim(),

          message:
            message.trim(),


          /* PRODUIT */

          productId:
            product?.originalId ||
            product?.id ||
            "",

          productName:
            product?.name ||
            "",

          productType:
            product?.productType ||
            "",


          /* STATUT */

          status:
            "Nouvelle",

          adminResponse:
            "",


          /* DATE */

          createdAt:
            serverTimestamp(),
        }
      );


      /* =====================================
         CONFIRMATION
      ===================================== */

      await umiNotify(
        "Votre demande de devis a été envoyée avec succès.\n\nVotre devis vous sera envoyé par e-mail dans les 24 heures."
      );


      /*
        On ferme seulement la fenêtre.
        On ne quitte plus automatiquement
        la page Demander un devis.
      */

      setShowNewQuoteForm(false);

      setCompanyName("");
      setQuantity("");
      setCountry("");
      setBudget("");
      setMessage("");

      setSubject(
        product?.name
          ? `Demande de devis - ${product.name}`
          : ""
      );


    } catch (error) {

      console.error(
        "Erreur devis :",
        error
      );

      await umiNotify(
        "Impossible d'envoyer votre demande de devis."
      );

    } finally {

      setSaving(false);
    }
  };


  /* =========================================
     STYLE COMMUN DES DEUX BOUTONS
  ========================================= */

  const quoteTopButtonStyle = {

    flex: "1 1 0",

    minWidth: 0,

    height: "58px",

    padding: "0 12px",

    border: "none",

    borderRadius: "15px",

    background: "#174b91",

    color: "#ffffff",

    cursor:
      saving
        ? "not-allowed"
        : "pointer",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    gap: "8px",

    fontSize: "14px",

    fontWeight: "800",

    boxShadow:
      "0 4px 14px rgba(23,75,145,0.18)",

    opacity:
      saving
        ? 0.7
        : 1,
  };


  /* =========================================
     AFFICHAGE
  ========================================= */

  return (

    <div style={{ display: "contents" }}>


      

      {/* =========================================
          FENÊTRE NOUVEAU DEVIS
      ========================================= */}

      {showNewQuoteForm && (

        <div
          onClick={closeNewQuoteForm}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background:
              "rgba(0, 0, 0, 0.48)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            boxSizing: "border-box",
          }}
        >

          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "560px",
              maxHeight: "88vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "20px",
              boxShadow:
                "0 18px 50px rgba(0,0,0,0.25)",
              boxSizing: "border-box",
            }}
          >


            {/* =================================
                EN-TÊTE DE LA FENÊTRE
            ================================= */}

            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: "12px",
                padding: "16px 18px",
                borderBottom:
                  "1px solid #e7ebf0",
                borderRadius:
                  "20px 20px 0 0",
              }}
            >

              <div>

                <h2
                  style={{
                    margin: 0,
                    color: "#174b91",
                    fontSize: "20px",
                  }}
                >
                  Nouveau devis
                </h2>

                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#6b7280",
                    fontSize: "12px",
                  }}
                >
                  UMI
                </p>

              </div>


              <button
                type="button"
                onClick={
                  closeNewQuoteForm
                }
                disabled={saving}
                aria-label="Fermer"
                style={{
                  width: "38px",
                  height: "38px",
                  border: "none",
                  borderRadius: "50%",
                  background: "#f1f4f8",
                  color: "#222222",
                  cursor:
                    saving
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "22px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  flexShrink: 0,
                }}
              >
                ×
              </button>

            </div>


            {/* =================================
                CONTENU DE LA FENÊTRE
            ================================= */}

            <div
              style={{
                padding: "18px",
              }}
            >

              <div className="commerce-intro">

                <h2>
                  Parlez-nous de votre besoin
                </h2>

                <p>
                  Remplissez le formulaire
                  ci-dessous. L'administration UMI
                  étudiera votre demande et votre
                  devis vous sera envoyé par e-mail
                  dans les 24 heures.
                </p>

              </div>


              {/* =================================
                  FORMULAIRE
              ================================= */}

              <form
                className="quote-form"
                onSubmit={handleSubmit}
              >


                {/* =================================
                    NOM ET PRÉNOM
                ================================= */}

                <label>

                  Nom et prénom *

                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(
                        event.target.value
                      )
                    }
                    placeholder="Votre nom et prénom"
                    autoComplete="name"
                    required
                  />

                </label>


                {/* =================================
                    TÉLÉPHONE
                ================================= */}

                <label>

                  Téléphone / WhatsApp *

                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value
                      )
                    }
                    placeholder="+223..."
                    autoComplete="tel"
                    required
                  />

                </label>


                {/* =================================
                    EMAIL
                ================================= */}

                <label>

                  Adresse e-mail *

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="exemple@email.com"
                    autoComplete="email"
                    required
                  />

                </label>
                                {/* =================================
                    SOCIÉTÉ
                ================================= */}

                <label>

                  Société / entreprise

                  <input
                    type="text"
                    value={companyName}
                    onChange={(event) =>
                      setCompanyName(
                        event.target.value
                      )
                    }
                    placeholder="Nom de votre société"
                    autoComplete="organization"
                  />

                </label>


                {/* =================================
                    OBJET DE LA DEMANDE
                ================================= */}

                <label>

                  Objet de la demande *

                  <input
                    type="text"
                    value={subject}
                    onChange={(event) =>
                      setSubject(
                        event.target.value
                      )
                    }
                    placeholder="Ex. Demande de devis pour une machine"
                    required
                  />

                </label>


                {/* =================================
                    QUANTITÉ
                ================================= */}

                <label>

                  Quantité souhaitée

                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(
                        event.target.value
                      )
                    }
                    placeholder="Ex. 1"
                  />

                </label>


                {/* =================================
                    PAYS / DESTINATION
                ================================= */}

                <label>

                  Pays / lieu de livraison

                  <input
                    type="text"
                    value={country}
                    onChange={(event) =>
                      setCountry(
                        event.target.value
                      )
                    }
                    placeholder="Ex. Bamako, Mali"
                  />

                </label>


                {/* =================================
                    BUDGET
                ================================= */}

                <label>

                  Budget estimatif

                  <input
                    type="text"
                    value={budget}
                    onChange={(event) =>
                      setBudget(
                        event.target.value
                      )
                    }
                    placeholder="Ex. 5 000 000 FCFA"
                  />

                </label>


                {/* =================================
                    BESOIN DU CLIENT
                ================================= */}

                <label>

                  Décrivez votre besoin *

                  <textarea
                    value={message}
                    onChange={(event) =>
                      setMessage(
                        event.target.value
                      )
                    }
                    placeholder="Décrivez précisément votre besoin, les caractéristiques souhaitées, la capacité, les dimensions ou toute autre information utile."
                    rows={7}
                    required
                  />

                </label>


                {/* =================================
                    PRODUIT SÉLECTIONNÉ
                ================================= */}

                {product && (

                  <div
                    style={{
                      marginTop: "14px",
                      padding: "14px",
                      borderRadius: "12px",
                      background: "#f5f8fb",
                      border:
                        "1px solid #e2e8ee",
                    }}
                  >

                    <div
                      style={{
                        marginBottom: "5px",
                        color: "#6b7280",
                        fontSize: "12px",
                        fontWeight: "700",
                      }}
                    >
                      Produit concerné
                    </div>

                    <div
                      style={{
                        color: "#173e59",
                        fontSize: "14px",
                        fontWeight: "800",
                      }}
                    >
                      {product.name ||
                        "Produit UMI"}
                    </div>

                  </div>

                )}


                {/* =================================
                    BOUTON ENVOYER
                ================================= */}

                <button
                  type="submit"
                  className="quote-submit-button"
                  disabled={saving}
                  style={{
                    width: "100%",
                    marginTop: "20px",
                    padding: "15px",
                    border: "none",
                    borderRadius: "13px",
                    background: "#174b91",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: "800",
                    cursor:
                      saving
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      saving
                        ? 0.7
                        : 1,
                  }}
                >

                  {saving
                    ? "Envoi en cours..."
                    : "📄 Envoyer ma demande"}

                </button>

              </form>

            </div>

          </div>

        </div>

      )}


      {/* =========================================
          BARRE DES TÂCHES
      ========================================= */}

      

    </div>

  );
}


export default QuoteRequest;