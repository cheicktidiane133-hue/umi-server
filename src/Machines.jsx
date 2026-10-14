import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import { getProductPrice } from "./productPrice";
import {
  useMemo,
  useRef,
  useState,
} from "react";

import "./Machines.css";


function Machines({
  selectionMode = false,
  selectedIds = [],
  userPhoto,

  machines = [],

  onBack,
  onOpenCategory,
  onOpenProduct,

  onHome,
  onMachines,
  onLive,
  onCart,
  onAccount,
}) {


  /* =========================================
     RECHERCHE
  ========================================= */

  const [search, setSearch] =
    useState("");


  /* =========================================
     RECHERCHE PAR PHOTO
  ========================================= */

  const fileInputRef =
    useRef(null);

  const [
    imageSearchLoading,
    setImageSearchLoading,
  ] = useState(false);


  /* =========================================
     CATÉGORIES
  ========================================= */

  const categories = [

    {
      id: 1,
      name: "Machine Agroalimentaire",
    },

    {
      id: 2,
      name: "Emballage & Conditionnement",
    },

    {
      id: 3,
      name: "Machine de fabrication plastique",
    },

    {
      id: 4,
      name: "Machines pour l’eau & boissons",
    },

    {
      id: 5,
      name: "Machine Produits chimiques & entretien",
    },

    {
      id: 6,
      name: "Machine Cosmétiques",
    },

    {
      id: 7,
      name: "Equipement Agriculture & élevage",
    },

    {
      id: 8,
      name: "Machine Construction & BTP",
    },

    {
      id: 9,
      name: "Machine à Bois & menuiserie",
    },

    {
      id: 10,
      name: "Equipement Métallurgie & fabrication",
    },

    {
      id: 11,
      name: "Machine Textile & habillement",
    },

    {
      id: 12,
      name: "Machine Papier & impression",
    },

    {
      id: 13,
      name: "Equipement Énergie & équipements",
    },

    {
      id: 14,
      name: "Equipement Recyclage & environnement",
    },

    {
      id: 15,
      name: "Autres Machines et accessoires",
    },

  ];


  /* =========================================
     NORMALISER TEXTE
  ========================================= */

  const normalizeText =
    (value) => {

      return String(
        value || ""
      )
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
            firstImage.url ||
            firstImage.imageUrl ||
            firstImage.secure_url ||
            firstImage.photoURL ||
            ""
          );

        }

      }


      return "";

    };


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
     PREMIÈRE MACHINE DE CHAQUE CATÉGORIE
  ========================================= */

  const categoryMachines =
    useMemo(() => {

      const result = {};


      categories.forEach(
        (category) => {

          const categoryText =
            normalizeText(
              category.name
            );


          /* =================================
             RECHERCHE EXACTE
          ================================= */

          let firstMachine =
            machines.find(
              (machine) => {

                const machineCategory =
                  normalizeText(
                    getMachineCategory(
                      machine
                    )
                  );


                return (
                  machineCategory ===
                  categoryText
                );

              }
            );


          /* =================================
             RECHERCHE PLUS SOUPLE
             si le nom n'est pas exactement
             identique dans Firestore
          ================================= */

          if (!firstMachine) {

            firstMachine =
              machines.find(
                (machine) => {

                  const machineCategory =
                    normalizeText(
                      getMachineCategory(
                        machine
                      )
                    );


                  if (
                    !machineCategory
                  ) {
                    return false;
                  }


                  return (
                    machineCategory.includes(
                      categoryText
                    ) ||
                    categoryText.includes(
                      machineCategory
                    )
                  );

                }
              );

          }


          result[
            category.id
          ] = firstMachine || null;

        }
      );


      return result;

    }, [machines]);


  /* =========================================
     RECHERCHE PAR PHOTO
  ========================================= */

  const handleImageSearch =
    (event) => {

      const file =
        event.target.files?.[0];


      event.target.value = "";


      if (!file) {
        return;
      }


      if (
        !file.type.startsWith(
          "image/"
        )
      ) {

        umiNotify(
          "Veuillez sélectionner une image."
        );

        return;

      }


      if (
        file.size >
        10 * 1024 * 1024
      ) {

        umiNotify(
          "La photo doit faire moins de 10 MB."
        );

        return;

      }


      setImageSearchLoading(
        true
      );


      const reader =
        new FileReader();


      reader.onloadend =
        async () => {

          try {

            const response =
              await fetch(
                "https://umi-server.onrender.com/search-machine-image",
                {
                  method:
                    "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body:
                    JSON.stringify({
                      image:
                        reader.result,
                    }),
                }
              );


            const data =
              await response.json();


            if (!response.ok) {

              console.error(
                "Erreur recherche photo :",
                data
              );


              await umiNotify(
                data?.message ||
                data?.error ||
                "Impossible d'analyser cette photo."
              );

              return;

            }


            let keywords = "";


            if (
              typeof data?.keywords ===
              "string"
            ) {

              keywords =
                data.keywords;

            }

            else if (
              Array.isArray(
                data?.keywords
              )
            ) {

              keywords =
                data.keywords.join(
                  " "
                );

            }

            else if (
              typeof data?.search ===
              "string"
            ) {

              keywords =
                data.search;

            }

            else if (
              typeof data?.result ===
              "string"
            ) {

              keywords =
                data.result;

            }

            else if (
              typeof data?.query ===
              "string"
            ) {

              keywords =
                data.query;

            }


            keywords =
              String(
                keywords || ""
              ).trim();


            if (keywords) {

              setSearch(
                keywords
              );

            } else {

              await umiNotify(
                "Aucune machine n'a été reconnue sur cette photo."
              );

            }


          } catch (error) {

            console.error(
              "Erreur recherche photo :",
              error
            );


            await umiNotify(
              "Impossible d'effectuer la recherche par photo."
            );


          } finally {

            setImageSearchLoading(
              false
            );

          }

        };


      reader.onerror =
        () => {

          setImageSearchLoading(
            false
          );


          umiNotify(
            "Impossible de lire cette photo."
          );

        };


      reader.readAsDataURL(
        file
      );

    };


  /* =========================================
     RECHERCHE TEXTE
  ========================================= */

  const normalizedSearch =
    normalizeText(search);


  const isSearching =
    normalizedSearch.length > 0;


  const filteredMachines =
    useMemo(() => {

      if (!isSearching) {
        return [];
      }


      const searchWords =
        normalizedSearch
          .split(/\s+/)
          .filter(
            (word) =>
              word.length >= 2
          );


      return machines.filter(
        (machine) => {

          const searchableText =
            normalizeText(
              [
                machine?.name,
                machine?.nom,
                machine?.title,

                machine?.category,
                machine?.categorie,
                machine?.categoryName,
                machine?.categorieName,

                machine?.brand,
                machine?.marque,

                machine?.model,
                machine?.modele,

                machine?.description,

                machine?.condition,

                machine?.location,
                machine?.localisation,

                machine?.price,
                machine?.prix,
              ]
                .filter(Boolean)
                .join(" ")
            );


          if (
            searchableText.includes(
              normalizedSearch
            )
          ) {

            return true;

          }


          return searchWords.some(
            (word) =>
              searchableText.includes(
                word
              )
          );

        }
      );

    }, [
      machines,
      normalizedSearch,
      isSearching,
    ]);


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
     PRIX MACHINE
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
     OUVRIR CATÉGORIE
  ========================================= */

  const handleOpenCategory =
    (category) => {

      onOpenCategory?.(
        category.name
      );

    };


  /* =========================================
     OUVRIR MACHINE
  ========================================= */

  const handleOpenMachine =
    (machine) => {

      onOpenProduct?.(
        machine
      );

    };


  /* =========================================
     AFFICHAGE
  ========================================= */

  return (

    <div className="machines-page">


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="machines-header">

        <button
          type="button"
          className="machines-back"
          onClick={onBack}
        >
          ←
        </button>

<h1>Toutes les machines</h1>

        <div className="machines-header-space" />

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="machines-content">


        {/* =====================================
            RECHERCHE TEXTE + PHOTO
        ===================================== */}

        <div className="machines-search">

          <span className="machines-search-icon">
            🔍
          </span>


          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Rechercher une machine..."
          />


          {search && (

            <button
              type="button"
              className="machines-search-clear"
              onClick={() =>
                setSearch("")
              }
              aria-label="Effacer la recherche"
            >
              ×
            </button>

          )}


          {/* PHOTO */}

          <button
            type="button"
            className="machines-image-search-button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={
              imageSearchLoading
            }
            aria-label="Rechercher par photo"
          >

            {imageSearchLoading
              ? "..."
              : "📷"}

          </button>


          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="machines-image-search-input"
            onChange={
              handleImageSearch
            }
          />

        </div>


        {/* =====================================
    TOUTES LES MACHINES
===================================== */}

{!isSearching && (
  <>
    <div className="machines-search-results-header">
      

      <span>
        {machines.length}{" "}
        {machines.length > 1
          ? "machines"
          : "machine"}
      </span>
    </div>

    {machines.length > 0 ? (
      <div className="machines-search-results">

        {machines.map((machine, index) => {

          const machineImage =
            getMachineImage(machine);

          const machineName =
            getMachineName(machine);

          const machinePrice =
            getMachinePrice(machine);

          const machineLocation =
            getMachineLocation(machine);

          return (
            <button
              type="button"
              className="machines-search-result-card"
              aria-pressed={selectionMode ? selectedIds.includes(machine.id) : undefined}
              key={
                machine?.id ||
                machine?.machineId ||
                index
              }
              onClick={() =>
                handleOpenMachine(machine)
              }
            >

              <div className="machines-search-result-image">

                {machineImage ? (
                  <img
                    src={machineImage}
                    alt={machineName}
                  />
                ) : (
                  <span>
                    ⚙️
                  </span>
                )}

              </div>

              <div className="machines-search-result-info">

                <strong className="machines-search-result-name">
                  {machineName}
                </strong>

                <span className="machines-search-result-price">
                  {machinePrice}
                </span>

                {machineLocation && (
                  <small className="machines-search-result-location">
                    📍 {machineLocation}
                  </small>
                )}

              </div>

              <span className="machines-search-result-arrow">
                ›
              </span>

            </button>
          );
        })}

      </div>
    ) : (
      <div className="machines-no-result">
        <div>⚙️</div>

        <strong>
          Aucune machine disponible
        </strong>

        <p>
          Les machines ajoutées apparaîtront ici.
        </p>
      </div>
    )}
  </>
)}

        {/* =====================================
            RÉSULTATS DE RECHERCHE
        ===================================== */}

        {isSearching && (

          <>

            <div className="machines-search-results-header">

              <strong>
                Résultats de recherche
              </strong>


              <span>

                {
                  filteredMachines.length
                }

                {" "}

                {
                  filteredMachines.length >
                  1
                    ? "machines"
                    : "machine"
                }

              </span>

            </div>


            {filteredMachines.length >
            0 ? (

              <div className="machines-search-results">

                {filteredMachines.map(
                  (
                    machine,
                    index
                  ) => {


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
                        className="machines-search-result-card"
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


                        {/* PHOTO */}

                        <div className="machines-search-result-image">

                          {machineImage ? (

                            <img
                              src={
                                machineImage
                              }
                              alt={
                                machineName
                              }
                            />

                          ) : (

                            <span>
                              ⚙️
                            </span>

                          )}

                        </div>


                        {/* INFORMATIONS */}

                        <div className="machines-search-result-info">

                          <strong className="machines-search-result-name">

                            {
                              machineName
                            }

                          </strong>


                          <span className="machines-search-result-price">

                            {
                              machinePrice
                            }

                          </span>


                          {machineLocation && (

                            <small className="machines-search-result-location">

                              📍{" "}
                              {
                                machineLocation
                              }

                            </small>

                          )}

                        </div>


                        <span className="machines-search-result-arrow">
                          ›
                        </span>


                      </button>

                    );

                  }
                )}

              </div>

            ) : (

              <div className="machines-no-result">

                <div>
                  🔍
                </div>


                <strong>
                  Aucune machine trouvée
                </strong>


                <p>
                  Aucune machine ne correspond à{" "}
                  « {search} »
                </p>


                <button
                  type="button"
                  className="machines-no-result-clear"
                  onClick={() =>
                    setSearch("")
                  }
                >
                  Voir toutes les catégories
                </button>

              </div>

            )}

          </>

        )}


      </main>


      {/* =====================================
          BARRE DES TÂCHES
      ===================================== */}

      <nav className="machines-bottom-nav">


        {/* ACCUEIL */}

        <button
          type="button"
          className="machines-bottom-nav-item"
          onClick={onHome}
        >

          <span className="machines-bottom-nav-icon">
            🏠
          </span>

          <span>
            Accueil
          </span>

        </button>


        {/* MACHINES */}

        <button
          type="button"
          className="machines-bottom-nav-item active"
          onClick={onMachines}
        >

          <span className="machines-bottom-nav-icon">
            ⚙️
          </span>

          <span>
            Machines
          </span>

        </button>


        {/* UMI LIVE */}

        <button
          type="button"
          className="machines-bottom-nav-item"
          onClick={onLive}
        >

          <span
            className="
              machines-bottom-nav-icon
              machines-live-icon
            "
          >
            ▶
          </span>

          <span>
            UMI LIVE
          </span>

        </button>


        {/* PANIER */}

        <button
          type="button"
          className="machines-bottom-nav-item"
          onClick={onCart}
        >

          <span className="machines-bottom-nav-icon">
            🛒
          </span>

          <span>
            Panier
          </span>

        </button>


        {/* COMPTE */}

        <button
          type="button"
          className="machines-bottom-nav-item"
          onClick={onAccount}
        >

          <span className="machines-account-photo-wrapper">

            {userPhoto ? (

              <img
                src={userPhoto}
                alt="Compte"
                className="machines-account-photo"
              />

            ) : (

              <span className="machines-account-placeholder">
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


export default Machines;