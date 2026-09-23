import { useState } from "react";

import "./MachineCategory.css";
import logoUmi from "./assets/logo-umi.jpeg";


function MachineCategory({
  category,
  machines,
  onBack,
  onOpenProduct,
}) {

  /* =========================================
     RECHERCHE
  ========================================= */

  const [search, setSearch] =
    useState("");


  /* =========================================
     MACHINES DE LA CATÉGORIE
  ========================================= */

  const categoryMachines =
    machines.filter(
      (machine) =>
        machine.category ===
        category?.name
    );


  /* =========================================
     FILTRER AVEC LA RECHERCHE
  ========================================= */

  const searchText =
    search
      .trim()
      .toLowerCase();


  const filteredMachines =
    categoryMachines.filter(
      (machine) => {

        if (!searchText) {
          return true;
        }


        const searchableText = [
          machine?.name,
          machine?.brand,
          machine?.model,
          machine?.location,
          machine?.description,
          machine?.price,
          machine?.condition,
          machine?.capacity,
          machine?.power,
          machine?.year,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


        return searchableText.includes(
          searchText
        );

      }
    );


  /* =========================================
     AFFICHAGE
  ========================================= */

  return (

    <div className="machine-category-page">


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="machine-category-header">


        <button
          type="button"
          className="machine-category-back"
          onClick={onBack}
          aria-label="Retour"
        >
          ←
        </button>


        <h1>
          {category?.name ||
            "Machines"}
        </h1>


        <img
          src={logoUmi}
          alt="UMI"
          className="machine-category-logo"
        />


      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="machine-category-content">


        <p className="machine-category-intro">

          Découvrez toutes les machines
          disponibles dans cette catégorie

        </p>


        {/* =================================
            BARRE DE RECHERCHE
        ================================= */}

        <div className="machine-category-search">


          <span className="machine-category-search-icon">
            🔍
          </span>


          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Rechercher une machine..."
            aria-label="Rechercher une machine"
          />


          {search && (

            <button
              type="button"
              className="machine-category-search-clear"
              onClick={() =>
                setSearch("")
              }
              aria-label="Effacer la recherche"
            >
              ×
            </button>

          )}


        </div>


        {/* NOMBRE DE RÉSULTATS */}

        {search && (

          <p className="machine-category-search-count">

            {filteredMachines.length}

            {" "}

            {filteredMachines.length <= 1
              ? "machine trouvée"
              : "machines trouvées"}

          </p>

        )}


        {/* =================================
            LISTE DES MACHINES
        ================================= */}

        <div className="category-machines-list">


          {categoryMachines.length === 0 ? (

            <div className="machine-category-empty">

              <span>
                ⚙️
              </span>

              <p>
                Aucune machine disponible
                pour le moment.
              </p>

            </div>

          ) : filteredMachines.length === 0 ? (

            <div className="machine-category-empty">

              <span>
                🔍
              </span>

              <p>
                Aucune machine ne correspond
                à votre recherche.
              </p>

              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
              >
                Effacer la recherche
              </button>

            </div>

          ) : (

            filteredMachines.map(
              (machine) => (

                <div
                  className="category-machine-item"
                  key={machine.id}
                  onClick={() =>
                    onOpenProduct(
                      machine
                    )
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {

                    if (
                      event.key ===
                        "Enter" ||
                      event.key === " "
                    ) {

                      onOpenProduct(
                        machine
                      );

                    }

                  }}
                >


                  {/* PHOTO */}

                  {machine.imageUrl ? (

                    <img
                      src={
                        machine.imageUrl
                      }
                      alt={
                        machine.name ||
                        "Machine"
                      }
                      className="category-machine-image"
                    />

                  ) : (

                    <div className="category-machine-no-image">

                      📷

                      <span>
                        Photo bientôt disponible
                      </span>

                    </div>

                  )}


                  {/* INFORMATIONS */}

                  <div className="category-machine-info">


                    <h3>
                      {machine.name}
                    </h3>


                    {machine.location && (

                      <p>
                        📍 {machine.location}
                      </p>

                    )}


                    {machine.description && (

                      <p>
                        {machine.description}
                      </p>

                    )}


                    <strong>
                      {machine.price ||
                        "Prix sur demande"}
                    </strong>


                  </div>


                </div>

              )
            )

          )}


        </div>


      </main>


    </div>

  );

}


export default MachineCategory;