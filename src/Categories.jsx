import "./Categories.css";

import magroImg from "./assets/magro.jpeg";
import mfabricaImg from "./assets/mfabrica.jpeg";
import mproduImg from "./assets/mprodu.jpeg";
import mcosImg from "./assets/mcos.jpeg";
import mequiImg from "./assets/mequi.jpeg";
import mconsImg from "./assets/mcons.jpeg";
import mboisImg from "./assets/mbois.jpeg";
import mtextImg from "./assets/mtext.jpeg";
import mpapImg from "./assets/mpap.jpeg";
import menerImg from "./assets/mener.jpeg";
import macceImg from "./assets/macce.jpeg";
import mmatiImg from "./assets/mmati.jpeg";
import embalImg from "./assets/membal.png";

/* =====================================
   CATÉGORIES MACHINES
===================================== */

const machineCategories = [
  {
    name: "Machine Agroalimentaire",
    image: magroImg,
  },
  {
    name: "Machine de fabrication plastique et recyclage",
    image: mfabricaImg,
  },
  {
    name: "Machine Produits chimiques & entretien",
    image: mproduImg,
  },
  {
    name: "Machine Cosmétiques",
    image: mcosImg,
  },
  {
    name: "Equipement Agriculture & élevage",
    image: mequiImg,
  },
  {
    name: "Machine Construction & BTP",
    image: mconsImg,
  },
  {
    name: "Machine à Bois & menuiserie",
    image: mboisImg,
  },
  {
    name: "Machine Textile & habillement",
    image: mtextImg,
  },
  {
    name: "Machine Papier & impression",
    image: mpapImg,
  },
  {
    name: "Equipement Énergie & équipements",
    image: menerImg,
  },
  {
    name: "Autres Machines et accessoires",
    image: macceImg,
  },
  
];

function Categories({
  userPhoto,
  onBack,
  onOpenCategory,
  onOpenRawMaterials,
  onOpenPackaging,
  onHome,
  onCategories,
  onLive,
  onCart,
  onAccount,
}) {

  return (

    <div className="categories-page">

      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="categories-header">

        <button
          type="button"
          className="categories-back"
          onClick={onBack}
          aria-label="Retour"
        >
          ←
        </button>

        <h1>
          Catégories
        </h1>

        <div className="categories-header-space" />

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="categories-content">

        <section className="categories-section">

          <div className="categories-grid">

            {/* =====================================
                MACHINES
            ===================================== */}

            {machineCategories.map(
              (category) => (

                <button
                  key={category.name}
                  type="button"
                  className="category-box"
                  onClick={() =>
                    onOpenCategory?.(
                      category.name
                    )
                  }
                >

                  <div className="category-box-icon">

                    {category.image ? (

                      <img
                        src={category.image}
                        alt={category.name}
                        className="category-box-image"
                      />

                    ) : (

                      <span>
                        ⚙️
                      </span>

                    )}

                  </div>

                  <span className="category-box-name">
                    {category.name}
                  </span>

                </button>

              )
            )}


            {/* =====================================
                MATIÈRES PREMIÈRES
            ===================================== */}

            <button
              type="button"
              className="category-box"
              onClick={onOpenRawMaterials}
            >

              <div className="category-box-icon">

                <img
                  src={mmatiImg}
                  alt="Matières premières"
                  className="category-box-image"
                />

              </div>

              <span className="category-box-name">
                Matières premières
              </span>

            </button>


            {/* =====================================
                EMBALLAGES
            ===================================== */}

            <button
              type="button"
              className="category-box"
              onClick={onOpenPackaging}
            >

              <div className="category-box-icon">

                <img
                  src={embalImg}
                  alt="Emballages"
                  className="category-box-image"
                />

              </div>

              <span className="category-box-name">
                Emballages
              </span>

            </button>

          </div>

        </section>

      </main>


      {/* =====================================
          BARRE DES TÂCHES
      ===================================== */}

      <nav className="categories-bottom-nav">

        {/* ACCUEIL */}

        <button
          type="button"
          className="categories-bottom-nav-item"
          onClick={onHome}
        >

          <span className="categories-bottom-nav-icon">
            🏠
          </span>

          <span>
            Accueil
          </span>

        </button>


        {/* CATÉGORIES */}

        <button
          type="button"
          className="categories-bottom-nav-item active"
          onClick={onCategories}
        >

          <span className="categories-bottom-nav-icon">
            ▦
          </span>

          <span>
            Catégories
          </span>

        </button>


        {/* UMI LIVE */}

        <button
          type="button"
          className="categories-bottom-nav-item"
          onClick={onLive}
        >

          <span className="categories-bottom-nav-icon categories-live-icon">
            ▶
          </span>

          <span>
            UMI LIVE
          </span>

        </button>


        {/* PANIER */}

        <button
          type="button"
          className="categories-bottom-nav-item"
          onClick={onCart}
        >

          <span className="categories-bottom-nav-icon">
            🛒
          </span>

          <span>
            Panier
          </span>

        </button>


        {/* COMPTE */}

        <button
          type="button"
          className="categories-bottom-nav-item"
          onClick={onAccount}
        >

          <span className="categories-account-photo-wrapper">

            {userPhoto ? (

              <img
                src={userPhoto}
                alt="Compte"
                className="categories-account-photo"
              />

            ) : (

              <span className="categories-account-placeholder">
                👤
              </span>

            )}

          </span>

          <span>
            Compte
          </span>

        </button>

      </nav>

    </div>

  );
}

export default Categories;