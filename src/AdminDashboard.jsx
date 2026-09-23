import "./AdminDashboard.css";
import logoUmi from "./assets/logo-umi.jpeg";


function AdminDashboard({
  onOpenMachines,
  onOpenAdminLive,
  onOpenRawMaterials,
  onOpenPackaging,
  onOpenQuotes,
  onOpenAdminChat,
  onLogout,
}) {

  return (

    <div className="admin-dashboard">


      {/* =========================
          EN-TÊTE
      ========================= */}

      <header className="dashboard-header">

        <div className="dashboard-header-space"></div>

        <div className="dashboard-brand">

          <div className="dashboard-title">
            ADMINISTRATION <span>UMI</span>
          </div>

          <div className="dashboard-subtitle">
            Tableau de bord administrateur
          </div>

        </div>

        <img
          src={logoUmi}
          alt="UMI"
          className="dashboard-logo"
        />

      </header>


      {/* =========================
          CONTENU
      ========================= */}

      <main className="dashboard-content">


        {/* =========================
            BIENVENUE
        ========================= */}

        <section className="dashboard-welcome">

          <div>

            <p className="dashboard-small-title">
              ESPACE ADMINISTRATEUR
            </p>

            <h1>
              Gestion de la plateforme
            </h1>

            <p className="dashboard-welcome-text">
              Gérez les machines, les matières
              premières, les emballages, les devis,
              les clients et UMI LIVE.
            </p>

          </div>

        </section>


        {/* =========================
            ACTIONS PRINCIPALES
        ========================= */}

        <div className="dashboard-actions">


          {/* GESTION DU CATALOGUE */}

          <button
  type="button"
  className="dashboard-action-card"
  onClick={() => {
    alert("BOUTON FONCTIONNE");

    if (onOpenMachines) {
      onOpenMachines();
    }
  }}
>

            <div className="dashboard-action-icon">
              ⚙️
            </div>

            <div className="dashboard-action-text">

              <strong>
                Gestion du catalogue
              </strong>

              <span>
                Ajouter, rechercher, modifier
                ou supprimer une machine
              </span>

            </div>

            <div className="dashboard-action-arrow">
              ›
            </div>

          </button>


          {/* UMI LIVE */}

          <button
            type="button"
            className="dashboard-action-card"
            onClick={onOpenAdminLive}
          >

            <div className="dashboard-action-icon live">
              ▶
            </div>

            <div className="dashboard-action-text">

              <strong>
                Gérer UMI LIVE
              </strong>

              <span>
                Créer et gérer les directs
              </span>

            </div>

            <div className="dashboard-action-arrow">
              ›
            </div>

          </button>


          {/* MATIÈRES PREMIÈRES */}

          <button
            type="button"
            className="dashboard-action-card"
            onClick={onOpenRawMaterials}
          >

            <div className="dashboard-action-icon">
              🌾
            </div>

            <div className="dashboard-action-text">

              <strong>
                Matières premières
              </strong>

              <span>
                Ajouter, modifier, stock et prix
              </span>

            </div>

            <div className="dashboard-action-arrow">
              ›
            </div>

          </button>


          {/* EMBALLAGES */}

          <button
            type="button"
            className="dashboard-action-card"
            onClick={onOpenPackaging}
          >

            <div className="dashboard-action-icon">
              📦
            </div>

            <div className="dashboard-action-text">

              <strong>
                Emballages
              </strong>

              <span>
                Gérer le catalogue d'emballages
              </span>

            </div>

            <div className="dashboard-action-arrow">
              ›
            </div>

          </button>


          {/* DEVIS */}

          <button
            type="button"
            className="dashboard-action-card"
            onClick={onOpenQuotes}
          >

            <div className="dashboard-action-icon">
              📄
            </div>

            <div className="dashboard-action-text">

              <strong>
                Demandes de devis
              </strong>

              <span>
                Consulter et répondre aux clients
              </span>

            </div>

            <div className="dashboard-action-arrow">
              ›
            </div>

          </button>


          {/* MESSAGES CLIENTS */}

          <button
            type="button"
            className="dashboard-action-card"
            onClick={onOpenAdminChat}
          >

            <div className="dashboard-action-icon">
              💬
            </div>

            <div className="dashboard-action-text">

              <strong>
                Messages clients
              </strong>

              <span>
                Chat instantané avec les clients
              </span>

            </div>

            <div className="dashboard-action-arrow">
              ›
            </div>

          </button>

        </div>


        {/* =========================
            CENTRE UMI
        ========================= */}

        <section className="dashboard-machines-section">

          <div className="dashboard-section-header">

            <div>

              <p className="dashboard-section-label">
                GESTION COMMERCIALE
              </p>

              <h2>
                Centre UMI
              </h2>

            </div>

          </div>


          <div className="admin-commerce-summary">


            <button
              type="button"
              className="admin-commerce-box"
              onClick={onOpenQuotes}
            >

              <span>📄</span>

              <div>

                <strong>
                  Devis
                </strong>

                <small>
                  Suivre les demandes clients
                </small>

              </div>

            </button>


            <button
              type="button"
              className="admin-commerce-box"
              onClick={onOpenAdminChat}
            >

              <span>💬</span>

              <div>

                <strong>
                  Assistance
                </strong>

                <small>
                  Répondre aux clients
                </small>

              </div>

            </button>


            <button
              type="button"
              className="admin-commerce-box"
              onClick={onOpenRawMaterials}
            >

              <span>🌾</span>

              <div>

                <strong>
                  Matières
                </strong>

                <small>
                  Catalogue et stock
                </small>

              </div>

            </button>


            <button
              type="button"
              className="admin-commerce-box"
              onClick={onOpenPackaging}
            >

              <span>📦</span>

              <div>

                <strong>
                  Emballages
                </strong>

                <small>
                  Catalogue et stock
                </small>

              </div>

            </button>


            <button
              type="button"
              className="admin-commerce-box"
              onClick={onOpenMachines}
            >

              <span>⚙️</span>

              <div>

                <strong>
                  Catalogue
                </strong>

                <small>
                  Gérer les machines
                </small>

              </div>

            </button>

          </div>

        </section>


        {/* =========================
            DÉCONNEXION
        ========================= */}

        <button
          type="button"
          className="dashboard-logout"
          onClick={onLogout}
        >
          ↪ Se déconnecter
        </button>


      </main>

    </div>

  );

}


export default AdminDashboard;