import { useState } from "react";

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

import "./CommerceModule.css";


function QuoteRequest({
  user,
  product,
  onBack,
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


  /* =========================================
     ENVOYER LA DEMANDE
  ========================================= */

  const handleSubmit = async (event) => {

    event.preventDefault();


    /* =====================================
       VÉRIFIER CONNEXION
    ===================================== */

    if (!user?.userId) {

      alert(
        "Vous devez être connecté."
      );

      return;

    }


    /* =====================================
       NOM ET PRÉNOM
    ===================================== */

    if (!fullName.trim()) {

      alert(
        "Indiquez votre nom et prénom."
      );

      return;

    }


    /* =====================================
       TÉLÉPHONE
    ===================================== */

    if (!phone.trim()) {

      alert(
        "Indiquez votre numéro de téléphone."
      );

      return;

    }


    /* =====================================
       EMAIL
    ===================================== */

    if (!email.trim()) {

      alert(
        "Indiquez votre adresse e-mail."
      );

      return;

    }


    /* =====================================
       OBJET
    ===================================== */

    if (!subject.trim()) {

      alert(
        "Indiquez l'objet de votre demande."
      );

      return;

    }


    /* =====================================
       BESOIN
    ===================================== */

    if (!message.trim()) {

      alert(
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
            user.userId,


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

      alert(
        "Votre demande de devis a été envoyée avec succès.\n\nVotre devis vous sera envoyé par e-mail dans les 24 heures."
      );


      onBack();


    } catch (error) {

      console.error(
        "Erreur devis :",
        error
      );


      alert(
        "Impossible d'envoyer votre demande de devis."
      );


    } finally {

      setSaving(false);

    }

  };


  /* =========================================
     AFFICHAGE
  ========================================= */

  return (

    <div className="commerce-page">


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="commerce-header">

        <button
          type="button"
          onClick={onBack}
          disabled={saving}
        >
          ←
        </button>


        <div>

          <h1>
            Demander un devis
          </h1>

          <p>
            UMI
          </p>

        </div>


        <span>
          📄
        </span>

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="commerce-content">


        {/* ===================================
            INTRODUCTION
        =================================== */}

        <div className="commerce-intro">

          <h2>
            Parlez-nous de votre besoin
          </h2>


          <p>
            Remplissez le formulaire ci-dessous.
            L'administration UMI étudiera votre
            demande et votre devis vous sera
            envoyé par e-mail dans les 24 heures.
          </p>

        </div>


        {/* ===================================
            FORMULAIRE
        =================================== */}

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

            Nom de la société

            <input
              type="text"
              value={companyName}
              onChange={(event) =>
                setCompanyName(
                  event.target.value
                )
              }
              placeholder="Facultatif"
              autoComplete="organization"
            />

          </label>


          {/* =================================
              OBJET
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
              placeholder="Exemple : Ligne de production"
              required
            />

          </label>


          {/* =================================
              QUANTITÉ
          ================================= */}

          <label>

            Quantité souhaitée

            <input
              type="text"
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  event.target.value
                )
              }
              placeholder="Exemple : 5 tonnes"
            />

          </label>


          {/* =================================
              PAYS
          ================================= */}

          <label>

            Pays de livraison

            <input
              type="text"
              value={country}
              onChange={(event) =>
                setCountry(
                  event.target.value
                )
              }
              placeholder="Exemple : Mali"
              autoComplete="country-name"
            />

          </label>


          {/* =================================
              BUDGET
          ================================= */}

          <label>

            Budget approximatif

            <input
              type="text"
              value={budget}
              onChange={(event) =>
                setBudget(
                  event.target.value
                )
              }
              placeholder="Facultatif"
            />

          </label>


          {/* =================================
              BESOIN
          ================================= */}

          <label>

            Votre besoin *

            <textarea
              rows="7"
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              placeholder="Décrivez précisément votre besoin..."
              required
            />

          </label>


          {/* =================================
              INFORMATION 24 HEURES
          ================================= */}

          <div
            style={{
              padding: "14px",
              borderRadius: "12px",
              background: "#eef7ff",
              color: "#163d59",
              fontSize: "13px",
              lineHeight: "1.5",
              fontWeight: "600",
            }}
          >

            📧 Après l'envoi de votre demande,
            votre devis vous sera envoyé à
            l'adresse e-mail indiquée dans un
            délai de 24 heures.

          </div>


          {/* =================================
              ENVOYER
          ================================= */}

          <button
            type="submit"
            className="commerce-primary-button"
            disabled={saving}
          >

            {saving
              ? "Envoi en cours..."
              : "📄 Envoyer ma demande"}

          </button>

        </form>

      </main>

    </div>

  );

}


export default QuoteRequest;