import { useState } from "react";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "./firebase";

import "./Login.css";
import logoUmi from "./assets/logo-umi.jpeg";


function Login({
  onBack,
  onRegister,
  onLoginSuccess,
  onAdminLoginSuccess,
}) {

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  /* =========================
     MOT DE PASSE OUBLIÉ
  ========================= */

  const handleForgotPassword =
    async () => {

      if (!email.trim()) {

        alert(
          "Entrez d'abord votre adresse e-mail."
        );

        return;

      }


      try {

        await sendPasswordResetEmail(
          auth,
          email.trim().toLowerCase()
        );


        alert(
          "Un e-mail de réinitialisation du mot de passe vous a été envoyé. Vérifiez votre boîte e-mail."
        );


      } catch (error) {

        console.error(
          "Erreur réinitialisation mot de passe :",
          error
        );


        if (
          error.code ===
          "auth/invalid-email"
        ) {

          alert(
            "L'adresse e-mail n'est pas valide."
          );

        }

        else if (
          error.code ===
          "auth/too-many-requests"
        ) {

          alert(
            "Trop de demandes ont été effectuées. Veuillez réessayer plus tard."
          );

        }

        else {

          alert(
            "Impossible d'envoyer l'e-mail de réinitialisation. Veuillez réessayer."
          );

        }

      }

    };


  /* =========================
     CONNEXION
  ========================= */

  const handleLogin =
    async () => {

      if (
        !email.trim() ||
        !password
      ) {

        alert(
          "Veuillez remplir votre e-mail et votre mot de passe."
        );

        return;

      }


      setLoading(true);


      try {

        /* =========================
           CONNEXION FIREBASE
        ========================= */

        const credential =
          await signInWithEmailAndPassword(
            auth,
            email.trim().toLowerCase(),
            password
          );


        const firebaseUser =
          credential.user;


        /* =========================
           RÉCUPÉRER PROFIL
        ========================= */

        const userReference =
          doc(
            db,
            "users",
            firebaseUser.uid
          );


        const userSnapshot =
          await getDoc(
            userReference
          );


        if (
          !userSnapshot.exists()
        ) {

          alert(
            "Votre profil UMI est introuvable."
          );

          return;

        }


        const userData =
          userSnapshot.data();


        /* =========================
           ENREGISTRER SESSION
        ========================= */

        localStorage.setItem(
          "umiCurrentUser",
          JSON.stringify({

            userId:
              firebaseUser.uid,

            nom:
              userData.nom || "",

            email:
              firebaseUser.email || "",

            telephone:
              userData.telephone || "",

            role:
              userData.role ||
              "client",

          })
        );


        /* =========================
           ADMINISTRATEUR
        ========================= */

        if (
          userData.role ===
          "admin"
        ) {

          alert(
            "Connexion administrateur réussie !"
          );


          if (
            onAdminLoginSuccess
          ) {

            onAdminLoginSuccess();

          }


          return;

        }


        /* =========================
           CLIENT
        ========================= */

        alert(
          "Connexion réussie !"
        );


        if (
          onLoginSuccess
        ) {

          onLoginSuccess();

        }


      } catch (error) {

        console.error(
          "Erreur connexion :",
          error
        );


        if (
          error.code ===
            "auth/invalid-credential" ||
          error.code ===
            "auth/wrong-password" ||
          error.code ===
            "auth/user-not-found"
        ) {

          alert(
            "Adresse e-mail ou mot de passe incorrect."
          );

        }

        else if (
          error.code ===
          "auth/invalid-email"
        ) {

          alert(
            "L'adresse e-mail n'est pas valide."
          );

        }

        else if (
          error.code ===
          "auth/too-many-requests"
        ) {

          alert(
            "Trop de tentatives. Veuillez réessayer plus tard."
          );

        }

        else {

          alert(
            "Impossible de vous connecter. Veuillez réessayer."
          );

        }


      } finally {

        setLoading(false);

      }

    };


  /* =========================
     ENTRÉE = CONNEXION
  ========================= */

  const handleKeyDown =
    (event) => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        handleLogin();

      }

    };


  return (

    <div className="login-page">

      <button
        type="button"
        className="back-button"
        onClick={onBack}
      >
        ‹
      </button>


      <div className="login-container">

        <img
          src={logoUmi}
          alt="Logo UMI"
          className="login-logo"
        />


        <h1 className="login-umi">
          UMI
        </h1>


        <p className="login-company">
          Univers Des Machines Industrielles
        </p>


        <div className="login-card">

          <h2>
            Se connecter
          </h2>


          <p className="login-description">
            Connectez-vous à votre compte UMI
          </p>


          <label>
            Adresse e-mail
          </label>


          <input
            type="email"
            placeholder="Votre adresse e-mail"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            autoComplete="email"
          />


          <label>
            Mot de passe
          </label>


          <input
            type="password"
            placeholder="Votre mot de passe"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            autoComplete="current-password"
          />


          <button
            type="button"
            className="forgot-password"
            onClick={
              handleForgotPassword
            }
          >
            Mot de passe oublié ?
          </button>


          <button
            type="button"
            className="login-submit"
            onClick={
              handleLogin
            }
            disabled={
              loading
            }
          >

            {loading
              ? "Connexion..."
              : "Se connecter"}

          </button>


          <p className="create-text">

            Vous n'avez pas de compte ?

            <span
              onClick={
                onRegister
              }
            >
              {" "}
              Créer un compte
            </span>

          </p>

        </div>

      </div>

    </div>

  );

}


export default Login;