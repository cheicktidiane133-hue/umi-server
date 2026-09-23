import { useState } from "react";

import "./AdminLogin.css";
import logoUmi from "./assets/logo-umi.jpeg";


function AdminLogin({
  onBack,
  onAdminLogin,
}) {

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);


  const handleLogin = (e) => {

    e.preventDefault();

    if (
      email.trim() === "" ||
      password.trim() === ""
    ) {

      alert(
        "Veuillez remplir tous les champs."
      );

      return;
    }

    onAdminLogin();
  };


  return (

    <div className="admin-login-page">


      {/* =========================
          EN-TÊTE
      ========================= */}

      <header className="admin-login-header">

        <button
          type="button"
          className="admin-login-back"
          onClick={onBack}
        >
          ←
        </button>


        <div className="admin-login-brand">

          <div className="admin-login-header-title">
            ADMINISTRATION
          </div>

          <div className="admin-login-header-subtitle">
            UNIVERS DES MACHINES INDUSTRIELLES
          </div>

        </div>


        <img
          src={logoUmi}
          alt="UMI"
          className="admin-login-header-logo"
        />

      </header>


      {/* =========================
          CONTENU
      ========================= */}

      <main className="admin-login-content">


        {/* =========================
            CARTE
        ========================= */}

        <div className="admin-login-card">


          {/* LOGO */}

          <div className="admin-login-logo-box">

            <img
              src={logoUmi}
              alt="Logo UMI"
              className="admin-login-main-logo"
            />

          </div>


          {/* TITRE */}

          <h1>
            Espace Administrateur
          </h1>

          <p className="admin-login-description">
            Connectez-vous pour gérer
            votre plateforme UMI.
          </p>


          {/* =========================
              FORMULAIRE
          ========================= */}

          <form
            className="admin-login-form"
            onSubmit={handleLogin}
          >


            {/* EMAIL */}

            <div className="admin-login-field">

              <label htmlFor="admin-email">
                Adresse e-mail
              </label>

              <div className="admin-login-input-box">

                <span className="admin-input-icon">
                  ✉
                </span>

                <input
                  id="admin-email"
                  type="email"
                  placeholder="admin@umi.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  autoComplete="email"
                />

              </div>

            </div>


            {/* MOT DE PASSE */}

            <div className="admin-login-field">

              <label htmlFor="admin-password">
                Mot de passe
              </label>

              <div className="admin-login-input-box">

                <span className="admin-input-icon">
                  🔒
                </span>

                <input
                  id="admin-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  autoComplete="current-password"
                />


                <button
                  type="button"
                  className="show-password-button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >
                  {showPassword
                    ? "🙈"
                    : "👁"}
                </button>

              </div>

            </div>


            {/* BOUTON */}

            <button
              type="submit"
              className="admin-login-submit"
            >
              Se connecter
            </button>


          </form>


          {/* SÉCURITÉ */}

          <div className="admin-login-security">
            🔒 Accès réservé à
            l'administration UMI
          </div>


        </div>

      </main>

    </div>

  );
}

export default AdminLogin;