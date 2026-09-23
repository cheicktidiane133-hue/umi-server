import "./Account.css";

function Account({
  user,
  onBack,
  onLogout,
  onOpenOrders,
  onOpenCart,
  onOpenAdmin,
  onHome,
  onCategories,
}) {

  const isAdmin =
    user?.role === "admin";

  return (

    <div className="account-page">

      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="account-header">

        <button
          type="button"
          className="account-back"
          onClick={onBack}
        >
          ←
        </button>

        <h1>
          Mon compte
        </h1>

        <div className="account-header-icon">
          👤
        </div>

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="account-content">


        {/* ===================================
            PROFIL
        =================================== */}

        <section className="account-profile">

          <div className="account-avatar">
            👤
          </div>

          <h2>
            {user?.nom || "Utilisateur UMI"}
          </h2>

          <p>
            {isAdmin
              ? "Compte administrateur"
              : "Compte client"}
          </p>

        </section>


        {/* ===================================
            INFORMATIONS
        =================================== */}

        <section className="account-info">

          <h3>
            Mes informations
          </h3>


          {/* EMAIL */}

          <div className="account-info-row">

            <span>
              📧
            </span>

            <div>

              <small>
                E-mail
              </small>

              <strong>
                {user?.email || "Non renseigné"}
              </strong>

            </div>

          </div>


          {/* TÉLÉPHONE */}

          <div className="account-info-row">

            <span>
              📱
            </span>

            <div>

              <small>
                Téléphone
              </small>

              <strong>
                {user?.telephone || "Non renseigné"}
              </strong>

            </div>

          </div>

        </section>


        {/* ===================================
            MENU DU COMPTE
        =================================== */}

        <section className="account-menu">


          {/* MES COMMANDES */}

          <button
            type="button"
            onClick={onOpenOrders}
          >

            <span>
              📦
            </span>

            <div>

              <strong>
                Mes commandes
              </strong>

              <small>
                Suivre mes commandes
              </small>

            </div>

            <b>
              ›
            </b>

          </button>


          {/* =================================
              ADMINISTRATION UMI
              Visible seulement pour admin
          ================================= */}

          {isAdmin && (

            <button
              type="button"
              className="account-admin-button"
              onClick={onOpenAdmin}
            >

              <span>
                ⚙️
              </span>

              <div>

                <strong>
                  Administration UMI
                </strong>

                <small>
                  Accéder à l'administration
                </small>

              </div>

              <b>
                ›
              </b>

            </button>

          )}

        </section>

      </main>


      {/* =====================================
          BARRE DE NAVIGATION DU BAS
      ===================================== */}

      <nav className="account-bottom-nav">


        {/* ACCUEIL */}

        <button
          type="button"
          onClick={onHome}
        >

          <span className="account-nav-icon">
            🏠
          </span>

          <small>
            Accueil
          </small>

        </button>


        {/* CATÉGORIES */}

        <button
          type="button"
          onClick={onCategories}
        >

          <span className="account-nav-icon">
            ▦
          </span>

          <small>
            Catégories
          </small>

        </button>


        {/* PANIER */}

        <button
          type="button"
          onClick={onOpenCart}
        >

          <span className="account-nav-icon">
            🛒
          </span>

          <small>
            Panier
          </small>

        </button>


        {/* DÉCONNEXION */}

        <button
          type="button"
          className="account-nav-logout"
          onClick={onLogout}
        >

          <span className="account-nav-icon">
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

export default Account;