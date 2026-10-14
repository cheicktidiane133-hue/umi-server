import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import { useState } from "react";

import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  auth,
  db,
} from "./firebase";

import "./Register.css";
import logoUmi from "./assets/logo-umi.jpeg";


function Register({
  onBack,
  onLogin,
  onRegisterSuccess,
}) {

  const [formData, setFormData] =
    useState({

      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      password: "",
      confirmPassword: "",

    });


  const [loading, setLoading] =
    useState(false);


  /* =========================
     CRÉER LE COMPTE
  ========================= */

  const handleRegister =
    async () => {

      /* =========================
         VÉRIFIER CHAMPS
      ========================= */

      if (
        !formData.nom.trim() ||
        !formData.prenom.trim() ||
        !formData.email.trim() ||
        !formData.telephone.trim() ||
        !formData.password ||
        !formData.confirmPassword
      ) {

        await umiNotify(
          "Veuillez remplir tous les champs."
        );

        return;

      }


      /* =========================
         VÉRIFIER EMAIL
      ========================= */

      if (
        !formData.email.includes(
          "@"
        )
      ) {

        await umiNotify(
          "Veuillez entrer une adresse e-mail valide."
        );

        return;

      }


      /* =========================
         VÉRIFIER MOT DE PASSE
      ========================= */

      if (
        formData.password.length <
        6
      ) {

        await umiNotify(
          "Le mot de passe doit contenir au moins 6 caractères."
        );

        return;

      }


      /* =========================
         CONFIRMATION MOT DE PASSE
      ========================= */

      if (
        formData.password !==
        formData.confirmPassword
      ) {

        await umiNotify(
          "Les deux mots de passe ne sont pas identiques."
        );

        return;

      }


      setLoading(true);


      try {

        const email =
          formData.email
            .trim()
            .toLowerCase();


        const nom =
          formData.nom.trim();


        const prenom =
          formData.prenom.trim();


        const telephone =
          formData.telephone.trim();


        /* =========================
           CRÉER COMPTE FIREBASE
        ========================= */

        const credential =
          await createUserWithEmailAndPassword(
            auth,
            email,
            formData.password
          );


        const firebaseUser =
          credential.user;


        /* =========================
           AJOUTER NOM + PRÉNOM
           DANS FIREBASE AUTH
        ========================= */

        await updateProfile(
          firebaseUser,
          {

            displayName:
              `${prenom} ${nom}`,

          }
        );


        /* =========================
           CRÉER PROFIL FIRESTORE
        ========================= */

        await setDoc(
          doc(
            db,
            "users",
            firebaseUser.uid
          ),
          {

            userId:
              firebaseUser.uid,

            nom,

            prenom,

            email,

            telephone,

            /*
              Toute inscription publique
              crée uniquement un CLIENT.
            */

            role:
              "client",

            createdAt:
              serverTimestamp(),

          }
        );


        /* =========================
           ENREGISTRER SESSION UMI
        ========================= */

        localStorage.setItem(
          "umiCurrentUser",
          JSON.stringify({

            userId:
              firebaseUser.uid,

            nom,

            prenom,

            email,

            telephone,

            role:
              "client",

          })
        );


        await umiNotify(
          "Votre compte UMI a été créé avec succès !"
        );


        /* =========================
           RETOUR AUTOMATIQUE
        ========================= */

        if (
          onRegisterSuccess
        ) {

          onRegisterSuccess();

          return;

        }


        /*
          Sécurité si ce composant
          est utilisé ailleurs.
        */

        if (
          onLogin
        ) {

          onLogin();

        }


      } catch (error) {

        console.error(
          "Erreur création compte :",
          error
        );


        if (
          error.code ===
          "auth/email-already-in-use"
        ) {

          await umiNotify(
            "Cette adresse e-mail possède déjà un compte UMI."
          );

        }

        else if (
          error.code ===
          "auth/invalid-email"
        ) {

          await umiNotify(
            "L'adresse e-mail n'est pas valide."
          );

        }

        else if (
          error.code ===
          "auth/weak-password"
        ) {

          await umiNotify(
            "Le mot de passe est trop faible."
          );

        }

        else {

          await umiNotify(
            "Impossible de créer le compte. Veuillez réessayer."
          );

        }


      } finally {

        setLoading(false);

      }

    };


  /* =========================
     ENTRÉE = CRÉER COMPTE
  ========================= */

  const handleKeyDown =
    (event) => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        handleRegister();

      }

    };


  return (

    <div className="register-page">

      <button
        type="button"
        className="register-back"
        onClick={
          onBack
        }
      >
        ‹
      </button>


      <div className="register-container">

        <img
          src={logoUmi}
          alt="Logo UMI"
          className="register-logo"
        />


        <h1 className="register-umi">
          UMI
        </h1>


        <p className="register-company">
          Univers Des Machines Industrielles
        </p>


        <div className="register-card">

          <h2>
            Créer un compte
          </h2>


          <p className="register-description">
            Rejoignez UMI et commencez votre activité
          </p>


          {/* NOM */}

          <label>
            Nom
          </label>


          <input
            type="text"
            placeholder="Votre nom"
            value={
              formData.nom
            }
            onChange={(event) =>
              setFormData({
                ...formData,

                nom:
                  event.target.value,
              })
            }
            onKeyDown={
              handleKeyDown
            }
            autoComplete="family-name"
          />


          {/* PRÉNOM */}

          <label>
            Prénom
          </label>


          <input
            type="text"
            placeholder="Votre prénom"
            value={
              formData.prenom
            }
            onChange={(event) =>
              setFormData({
                ...formData,

                prenom:
                  event.target.value,
              })
            }
            onKeyDown={
              handleKeyDown
            }
            autoComplete="given-name"
          />


          {/* EMAIL */}

          <label>
            Adresse e-mail
          </label>


          <input
            type="email"
            placeholder="Votre adresse e-mail"
            value={
              formData.email
            }
            onChange={(event) =>
              setFormData({
                ...formData,

                email:
                  event.target.value,
              })
            }
            onKeyDown={
              handleKeyDown
            }
            autoComplete="email"
          />


          {/* TÉLÉPHONE */}

          <label>
            Numéro de téléphone
          </label>


          <input
            type="tel"
            placeholder="+223 ..."
            value={
              formData.telephone
            }
            onChange={(event) =>
              setFormData({
                ...formData,

                telephone:
                  event.target.value,
              })
            }
            onKeyDown={
              handleKeyDown
            }
            autoComplete="tel"
          />


          {/* MOT DE PASSE */}

          <label>
            Mot de passe
          </label>


          <input
            type="password"
            placeholder="Créez un mot de passe"
            value={
              formData.password
            }
            onChange={(event) =>
              setFormData({
                ...formData,

                password:
                  event.target.value,
              })
            }
            onKeyDown={
              handleKeyDown
            }
            autoComplete="new-password"
          />


          {/* CONFIRMATION */}

          <label>
            Confirmer le mot de passe
          </label>


          <input
            type="password"
            placeholder="Confirmez votre mot de passe"
            value={
              formData.confirmPassword
            }
            onChange={(event) =>
              setFormData({
                ...formData,

                confirmPassword:
                  event.target.value,
              })
            }
            onKeyDown={
              handleKeyDown
            }
            autoComplete="new-password"
          />


          {/* CRÉER */}

          <button
            type="button"
            className="register-submit"
            onClick={
              handleRegister
            }
            disabled={
              loading
            }
          >

            {loading
              ? "Création..."
              : "Créer mon compte"}

          </button>


          {/* DÉJÀ UN COMPTE */}

          <p className="register-login-text">

            Vous avez déjà un compte ?

            <span
              onClick={
                onLogin
              }
            >
              {" "}
              Se connecter
            </span>

          </p>

        </div>

      </div>

    </div>

  );

}


export default Register;