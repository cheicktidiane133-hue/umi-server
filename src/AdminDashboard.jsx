import "./AdminDashboard.css";
import logoUmi from "./assets/logo-umi.jpeg";


function AdminDashboard({
  onHome,
  onOpenMachines,
  onOpenAdminLive,
  onOpenRawMaterials,
  onOpenPackaging,
  onOpenQuotes,
  onOpenAdminChat,
  onOpenOrders,
  onOpenReviews,
  onOpenHomeMedia,
  onLogout,
  onOpenAccounts,
  onOpenPrivacy,
}) {

  return (

    <div className="admin-dashboard">


      {/* =========================
          EN-TÊTE
      ========================= */}

      <header className="dashboard-header">

        <button
  type="button"
  className="dashboard-home-button"
  onClick={onHome}
  aria-label="Accueil"
>
  <span className="dashboard-home-icon">
    🏠
  </span>

  <span className="dashboard-home-label">
    Accueil
  </span>
</button>

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


          {/* =========================
              GESTION DU CATALOGUE
          ========================= */}

          <button
            type="button"
            className="dashboard-action-card"
            onClick={onOpenMachines}
          >

            <div className="dashboard-action-icon">
              ⚙️
            </div>

            <div className="dashboard-action-text">

              <strong>
                Machines industrielles
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


          


          {/* =========================
              MATIÈRES PREMIÈRES
          ========================= */}

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


          {/* =========================
              EMBALLAGES
          ========================= */}

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

<button type="button" className="dashboard-action-card" onClick={onOpenAccounts}>
  <div className="dashboard-action-icon">👥</div><div className="dashboard-action-text"><strong>Gestion des comptes</strong><span>Bloquer, débloquer ou supprimer un compte</span></div><div className="dashboard-action-arrow">›</div>
</button>
<button type="button" className="dashboard-action-card" onClick={onOpenPrivacy}>
  <div className="dashboard-action-icon">🔒</div><div className="dashboard-action-text"><strong>Confidentialité</strong><span>Modifier la politique de confidentialité</span></div><div className="dashboard-action-arrow">›</div>
</button>
{/* =========================
    MÉDIA D'ACCUEIL
========================= */}

<button
  type="button"
  className="dashboard-action-card"
  onClick={onOpenHomeMedia}
>
  <div className="dashboard-action-icon">
    🖼️
  </div>

  <div className="dashboard-action-text">

    <strong>
      Média d'accueil
    </strong>

    <span>
      Modifier la photo ou la vidéo d'accueil
    </span>

  </div>

  <div className="dashboard-action-arrow">
    ›
  </div>
</button>
          {/* =========================
              DEVIS
          ========================= */}

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

{/* =========================
    COMMANDES CLIENTS
========================= */}

<button
  type="button"
  className="dashboard-action-card"
  onClick={onOpenOrders}
>
  <div className="dashboard-action-icon">
    📦
  </div>

  <div className="dashboard-action-text">
    <strong>
      Les commandes
    </strong>

    <span>
      Consulter et gérer les commandes
    </span>
  </div>

  <div className="dashboard-action-arrow">
    ›
  </div>
</button>
{/* =========================
    AVIS CLIENTS
========================= */}

<button
  type="button"
  className="dashboard-action-card"
  onClick={onOpenReviews}
>
  <div className="dashboard-action-icon">
    ⭐
  </div>

  <div className="dashboard-action-text">
    <strong>
      Avis clients
    </strong>

    <span>
      Consulter et supprimer les avis clients
    </span>
  </div>

  <div className="dashboard-action-arrow">
    ›
  </div>
</button>
          {/* =========================
              MESSAGES CLIENTS
          ========================= */}

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

        
{/* =========================
              UMI LIVE
          ========================= */}

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
</div>
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