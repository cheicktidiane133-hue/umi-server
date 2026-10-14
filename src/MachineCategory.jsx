import { getProductPrice } from "./productPrice";
import { useState } from "react";

import "./MachineCategory.css";
import logoUmi from "./assets/logo-umi.jpeg";


function MachineCategory({
  selectionMode = false,
  selectedIds = [],
  category,
  machines = [],
  onBack,
  onOpenProduct,
}) {

  /* =========================================
     RECHERCHE
  ========================================= */

  const [search, setSearch] =
    useState("");


  /* =========================================
     NORMALISER LE TEXTE
  ========================================= */

  const normalizeText = (value) => {

    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-z0-9]+/g,
        " "
      )
      .trim();

  };


  /* =========================================
     NOM DE LA CATÉGORIE
  ========================================= */

  const categoryName =
    typeof category === "string"
      ? category
      : category?.name ||
        category?.category ||
        category?.categorie ||
        "";


  const normalizedCategory =
    normalizeText(categoryName);


  /* =========================================
     CATÉGORIE D'UNE MACHINE
  ========================================= */

  const getMachineCategory =
    (machine) => {

      return (
        machine?.category ||
        machine?.categorie ||
        machine?.categoryName ||
        machine?.categorieName ||
        ""
      );

    };


  /* =========================================
     MACHINES DE LA CATÉGORIE
  ========================================= */

  const categoryMachines =
    machines.filter(
      (machine) => {

        const machineCategory =
          normalizeText(
            getMachineCategory(
              machine
            )
          );


        if (
          !machineCategory ||
          !normalizedCategory
        ) {
          return false;
        }


        /*
          1. Correspondance exacte
        */

        if (
          machineCategory ===
          normalizedCategory
        ) {
          return true;
        }


        /*
          2. Correspondance plus souple
        */

        return (
          machineCategory.includes(
            normalizedCategory
          ) ||
          normalizedCategory.includes(
            machineCategory
          )
        );

      }
    );


  /* =========================================
     PHOTO D'UNE MACHINE
  ========================================= */

  const getMachineImage =
    (machine) => {

      if (!machine) {
        return "";
      }


      if (machine.imageUrl) {
        return machine.imageUrl;
      }


      if (machine.imageURL) {
        return machine.imageURL;
      }


      if (machine.photoUrl) {
        return machine.photoUrl;
      }


      if (machine.photoURL) {
        return machine.photoURL;
      }


      if (machine.image) {
        return machine.image;
      }


      if (machine.photo) {
        return machine.photo;
      }


      if (
        Array.isArray(
          machine.imageUrls
        ) &&
        machine.imageUrls.length > 0
      ) {

        return (
          machine.imageUrls[0] ||
          ""
        );

      }


      if (
        Array.isArray(
          machine.images
        ) &&
        machine.images.length > 0
      ) {

        const firstImage =
          machine.images[0];


        if (
          typeof firstImage ===
          "string"
        ) {

          return firstImage;

        }


        if (
          typeof firstImage ===
          "object"
        ) {

          return (
            firstImage?.url ||
            firstImage?.imageUrl ||
            firstImage?.secure_url ||
            firstImage?.photoURL ||
            ""
          );

        }

      }


      return "";

    };


  /* =========================================
     NOM MACHINE
  ========================================= */

  const getMachineName =
    (machine) => {

      return (
        machine?.name ||
        machine?.nom ||
        machine?.title ||
        "Machine industrielle"
      );

    };


  /* =========================================
     PRIX
  ========================================= */

  const getMachinePrice = (machine) => {
  return getProductPrice(machine);
};
  /* =========================================
     LOCALISATION
  ========================================= */

  const getMachineLocation =
    (machine) => {

      return (
        machine?.location ||
        machine?.localisation ||
        ""
      );

    };


  /* =========================================
     RECHERCHE
  ========================================= */

  const searchText =
    normalizeText(search);


  const filteredMachines =
    categoryMachines.filter(
      (machine) => {

        if (!searchText) {
          return true;
        }


        const searchableText =
          normalizeText(
            [
              machine?.name,
              machine?.nom,
              machine?.title,

              machine?.brand,
              machine?.marque,

              machine?.model,
              machine?.modele,

              machine?.location,
              machine?.localisation,

              machine?.description,

              machine?.price,
              machine?.prix,

              machine?.condition,
              machine?.capacity,
              machine?.power,
              machine?.year,
            ]
              .filter(Boolean)
              .join(" ")
          );


        return searchableText.includes(
          searchText
        );

      }
    );


  /* =========================================
     OUVRIR UNE MACHINE
  ========================================= */

  const handleOpenMachine =
    (machine) => {

      if (!machine) {
        return;
      }


      if (onOpenProduct) {

        onOpenProduct(
          machine
        );

      }

    };


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
          {categoryName ||
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


        {/* =================================
            NOMBRE DE RÉSULTATS
        ================================= */}

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
              (machine, index) => {

                const machineImage =
                  getMachineImage(
                    machine
                  );


                const machineName =
                  getMachineName(
                    machine
                  );


                const machinePrice =
                  getMachinePrice(
                    machine
                  );


                const machineLocation =
                  getMachineLocation(
                    machine
                  );


                return (

                  <button
                    type="button"
                    className="category-machine-item"
              aria-pressed={selectionMode ? selectedIds.includes(machine.id) : undefined}
                    key={
                      machine?.id ||
                      machine?.machineId ||
                      index
                    }
                    onClick={() =>
                      handleOpenMachine(
                        machine
                      )
                    }
                  >


                    {/* =====================
                        PHOTO
                    ===================== */}

                    {machineImage ? (

                      <img
                        src={
                          machineImage
                        }
                        alt={
                          machineName
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


                    {/* =====================
                        INFORMATIONS
                    ===================== */}

                    <div className="category-machine-info">


                      <h3>
                        {machineName}
                      </h3>


                      {machineLocation && (

                        <p>
                          📍{" "}
                          {machineLocation}
                        </p>

                      )}


                      {machine?.description && (

                        <p>
                          {machine.description}
                        </p>

                      )}


                      <strong>
                        {machinePrice}
                      </strong>


                    </div>


                    <span className="category-machine-arrow">
                      ›
                    </span>


                  </button>

                );

              }
            )

          )}


        </div>


      </main>


    </div>

  );

}


export default MachineCategory;