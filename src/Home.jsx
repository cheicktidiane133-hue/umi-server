import { useEffect, useMemo, useRef, useState } from "react";
import "./Home.css";

import logoUmi from "./assets/logo-umi.jpeg";

import img1 from "./assets/img1.jpeg";
import img2 from "./assets/img2.jpeg";
import img3 from "./assets/img3.jpeg";


function Home({
  machines = [],
  onOpenProduct,
  onOpenMachines,
  onOpenUmiLive,
  onOpenAccount,
  onOpenQuote,
  onOpenCart,
  onOpenRawMaterials,
  onOpenChat,
  onOpenPackaging,
}) {

  /* =========================================
     CARROUSEL
  ========================================= */

  const slides = [img1, img2, img3];

  const [currentSlide, setCurrentSlide] =
    useState(0);


  useEffect(() => {

    const timer = setInterval(() => {

      setCurrentSlide((previous) =>
        previous === slides.length - 1
          ? 0
          : previous + 1
      );

    }, 4000);


    return () =>
      clearInterval(timer);

  }, [slides.length]);


  /* =========================================
     RECHERCHE TEXTE
  ========================================= */

  const [searchText, setSearchText] =
    useState("");


  const filteredMachines = useMemo(() => {

    const search =
      searchText
        .trim()
        .toLowerCase();


    if (!search) {
      return [];
    }


    return machines.filter((machine) => {

      const information = [
        machine?.name,
        machine?.category,
        machine?.brand,
        machine?.model,
        machine?.description,
        machine?.condition,
        machine?.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();


      return information.includes(search);

    });

  }, [machines, searchText]);


  /* =========================================
     RECHERCHE PAR IMAGE
  ========================================= */

  const fileInputRef =
    useRef(null);


  const [
    imageSearchLoading,
    setImageSearchLoading,
  ] = useState(false);


  const handleImageSearch = (event) => {

    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    setImageSearchLoading(true);


    const reader =
      new FileReader();


    reader.onloadend = async () => {

      try {

        const response =
          await fetch(
            "/search-machine-image",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                image: reader.result,
              }),
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          console.error(
            "Erreur recherche image :",
            data
          );

          return;

        }


        const keywords =
          data.keywords ||
          data.search ||
          data.result ||
          "";


        if (keywords) {

          setSearchText(
            keywords
          );

        }


      } catch (error) {

        console.error(
          "Erreur recherche image :",
          error
        );


      } finally {

        setImageSearchLoading(
          false
        );

      }

    };


    reader.readAsDataURL(file);

    event.target.value = "";

  };


  /* =========================================
     MACHINES POPULAIRES
  ========================================= */

  const [
    popularStart,
    setPopularStart,
  ] = useState(0);


  useEffect(() => {

    if (machines.length <= 2) {
      return;
    }


    const timer =
      setInterval(() => {

        setPopularStart(
          (previous) => {

            const next =
              previous + 2;


            if (
              next >=
              machines.length
            ) {
              return 0;
            }


            return next;

          }
        );

      }, 5000);


    return () =>
      clearInterval(timer);

  }, [machines.length]);


  useEffect(() => {

    if (
      popularStart >=
      machines.length
    ) {

      setPopularStart(0);

    }

  }, [
    machines.length,
    popularStart,
  ]);


  const popularMachines =
    useMemo(() => {

      if (
        machines.length === 0
      ) {
        return [];
      }


      if (
        machines.length <= 2
      ) {
        return machines;
      }


      const first =
        machines[
          popularStart %
          machines.length
        ];


      const second =
        machines[
          (popularStart + 1) %
          machines.length
        ];


      return [
        first,
        second,
      ].filter(Boolean);

    }, [
      machines,
      popularStart,
    ]);


  /* =========================================
     CARTE MACHINE
  ========================================= */

  const renderMachineCard = (
    machine,
    index,
    showPopularBadge = false
  ) => {

    return (

      <article
        className="machine-card"
        key={
          machine?.id ||
          index
        }
        onClick={() =>
          onOpenProduct?.(
            machine
          )
        }
      >

        <div className="machine-photo">


          {(machine?.imageUrl ||
            machine?.image) ? (

            <img
              src={
                machine.imageUrl ||
                machine.image
              }
              alt={
                machine?.name ||
                "Machine industrielle"
              }
            />

          ) : (

            <div className="machine-no-image">
              ⚙️
            </div>

          )}


          {showPopularBadge && (

            <span className="machine-badge">
              Populaire
            </span>

          )}


          <button
            type="button"
            className="favorite-button"
            onClick={(event) => {
              event.stopPropagation();
            }}
            aria-label="Ajouter aux favoris"
          >
            ♡
          </button>


        </div>


        <div className="machine-info">

          <h3>
            {machine?.name ||
              "Machine industrielle"}
          </h3>


          <p className="machine-price">
            {machine?.price ||
              "Prix sur demande"}
          </p>

        </div>


      </article>

    );

  };


  return (

    <div className="home-page">


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="home-header">


        <div className="home-brand">


          <img
            src={logoUmi}
            alt="Logo UMI"
            className="home-logo"
          />


          <div className="home-brand-text">

            <h2>
              UMI
            </h2>

            <span>
              UNIVERS DES MACHINES INDUSTRIELLES
            </span>

          </div>


        </div>


        <button
          type="button"
          className="home-profile"
          onClick={onOpenAccount}
          aria-label="Compte"
        >
          👤
        </button>


      </header>


      {/* =====================================
          RECHERCHE
      ===================================== */}

      <section className="home-search-section">


        <div className="home-search-box">


          <span className="search-icon">
            🔍
          </span>


          <input
            type="text"
            value={searchText}
            onChange={(event) =>
              setSearchText(
                event.target.value
              )
            }
            placeholder="Rechercher une machine..."
          />


          {searchText && (

            <button
              type="button"
              className="search-clear-button"
              onClick={() =>
                setSearchText("")
              }
              aria-label="Effacer"
            >
              ×
            </button>

          )}


          <button
            type="button"
            className="image-search-button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            aria-label="Recherche par image"
          >

            {imageSearchLoading
              ? "..."
              : "📷"}

          </button>


          <input
            ref={fileInputRef}
            className="image-search-input"
            type="file"
            accept="image/*"
            onChange={
              handleImageSearch
            }
          />


        </div>


      </section>


      {/* =====================================
          RECHERCHE ACTIVE
      ===================================== */}

      {searchText.trim() ? (

        <section className="search-results-section">


          <div className="search-results-header">

            <div>

              <h2>
                Résultats de recherche
              </h2>

              <p>

                {filteredMachines.length}
                {" machine"}

                {filteredMachines.length > 1
                  ? "s"
                  : ""}

                {" trouvée"}

                {filteredMachines.length > 1
                  ? "s"
                  : ""}

              </p>

            </div>

          </div>


          {filteredMachines.length > 0 ? (

            <div className="machines-grid">

              {filteredMachines.map(
                (machine, index) =>
                  renderMachineCard(
                    machine,
                    index,
                    false
                  )
              )}

            </div>

          ) : (

            <div className="no-machine-result">

              <div className="no-result-icon">
                🔍
              </div>

              <p>

                Aucune machine trouvée pour{" "}

                <strong>
                  « {searchText} »
                </strong>

              </p>

            </div>

          )}


        </section>

      ) : (

        <>


          {/* =================================
              CARROUSEL
          ================================= */}

          <section className="home-banner-slider">


            <div
              className="home-banner-track"
              style={{
                transform:
                  `translateX(-${currentSlide * 100}%)`,
              }}
            >

              {slides.map(
                (image, index) => (

                  <div
                    className="home-banner-slide"
                    key={index}
                  >

                    <img
                      className="home-banner-image"
                      src={image}
                      alt={`UMI ${index + 1}`}
                    />

                  </div>

                )
              )}

            </div>


            <div className="home-banner-dots">

              {slides.map(
                (_, index) => (

                  <span
                    key={index}
                    className={
                      index ===
                      currentSlide
                        ? "home-banner-dot active"
                        : "home-banner-dot"
                    }
                  />

                )
              )}

            </div>


          </section>


          {/* =================================
              SERVICES
          ================================= */}

          <section className="home-services">


            <div className="home-menu-grid">


              {/* MACHINES */}

              <button
                type="button"
                className="home-menu-button"
                onClick={
                  onOpenMachines
                }
              >

                <div className="home-menu-icon">
                  ⚙️
                </div>

                <span>
                  Machines
                </span>

              </button>


              {/* UMI LIVE */}

              <button
                type="button"
                className="home-menu-button"
                onClick={
                  onOpenUmiLive
                }
              >

                <div className="home-menu-icon live-menu-icon">
                  ▶
                </div>

                <span>
                  UMI LIVE
                </span>

              </button>


              {/* MATIÈRE PREMIÈRE */}

              <button
                type="button"
                className="home-menu-button"
                onClick={
                  onOpenRawMaterials
                }
              >

                <div className="home-menu-icon">
                  🌾
                </div>

                <span>
                  Matière première
                </span>

              </button>


              {/* DEVIS */}

              <button
                type="button"
                className="home-menu-button"
                onClick={
                  onOpenQuote
                }
              >

                <div className="home-menu-icon">
                  📄
                </div>

                <span>
                  Devis
                </span>

              </button>


              {/* CHAT */}

              <button
                type="button"
                className="home-menu-button"
                onClick={
                  onOpenChat
                }
              >

                <div className="home-menu-icon">
                  💬
                </div>

                <span>
                  Chat
                </span>

              </button>


              {/* EMBALLAGE */}

              <button
                type="button"
                className="home-menu-button"
                onClick={
                  onOpenPackaging
                }
              >

                <div className="home-menu-icon">
                  📦
                </div>

                <span>
                  Emballage
                </span>

              </button>


            </div>


          </section>


          {/* =================================
              MACHINES POPULAIRES
          ================================= */}

          <section className="popular-section">


            <div className="popular-header">


              <div>

                <h2>
                  Machines populaires
                </h2>

                <p>
                  Découvrez nos machines industrielles
                </p>

              </div>


              <button
                type="button"
                onClick={
                  onOpenMachines
                }
              >
                Voir tout
              </button>


            </div>


            {popularMachines.length > 0 ? (

              <div className="machines-grid">

                {popularMachines.map(
                  (machine, index) =>
                    renderMachineCard(
                      machine,
                      index,
                      true
                    )
                )}

              </div>

            ) : (

              <div className="no-machine-result">
                Aucune machine disponible.
              </div>

            )}


          </section>


        </>

      )}


      {/* =====================================
          NAVIGATION BAS
      ===================================== */}

      <nav className="bottom-nav">


        <button
          type="button"
          className="nav-item active"
          onClick={() =>
            setSearchText("")
          }
        >

          <span>
            🏠
          </span>

          <p>
            Accueil
          </p>

        </button>


        <button
          type="button"
          className="nav-item"
          onClick={
            onOpenMachines
          }
        >

          <span>
            ▦
          </span>

          <p>
            Catégories
          </p>

        </button>


        <button
          type="button"
          className="nav-item live-nav"
          onClick={
            onOpenUmiLive
          }
        >

          <span className="bottom-live-icon">
            ▶
          </span>

          <p>
            UMI LIVE
          </p>

        </button>


        <button
          type="button"
          className="nav-item"
          onClick={
            onOpenCart
          }
        >

          <span>
            🛒
          </span>

          <p>
            Panier
          </p>

        </button>


        <button
          type="button"
          className="nav-item"
          onClick={
            onOpenAccount
          }
        >

          <span>
            👤
          </span>

          <p>
            Compte
          </p>

        </button>


      </nav>


    </div>

  );

}


export default Home;