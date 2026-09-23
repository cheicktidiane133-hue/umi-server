import { useMemo, useState } from "react";

import {
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "./firebase";

import "./AdminMachines.css";
import logoUmi from "./assets/logo-umi.jpeg";


function AdminMachines({
  machines = [],
  onBack,
  onAddMachine,
  onEditMachine,
  onMachineDeleted,
}) {


  /* =========================
     RECHERCHE
  ========================= */

  const [
    search,
    setSearch,
  ] = useState("");


  const filteredMachines =
    useMemo(() => {

      const text =
        search
          .trim()
          .toLowerCase();


      if (!text) {
        return machines;
      }


      return machines.filter(
        (machine) => {

          const searchableText = [
            machine.name,
            machine.category,
            machine.reference,
            machine.price,
            machine.description,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


          return searchableText.includes(
            text
          );

        }
      );

    }, [machines, search]);


  /* =========================
     SUPPRIMER UNE MACHINE
  ========================= */

  const handleDelete =
    async (machineId) => {

      const confirmation =
        window.confirm(
          "Voulez-vous vraiment supprimer cette machine ?"
        );


      if (!confirmation) {
        return;
      }


      try {

        await deleteDoc(
          doc(
            db,
            "machines",
            machineId
          )
        );


        onMachineDeleted?.(
          machineId
        );


        alert(
          "Machine supprimée avec succès."
        );


      } catch (error) {

        console.error(
          "Erreur lors de la suppression :",
          error
        );


        alert(
          "Erreur lors de la suppression."
        );

      }

    };


  return (

    <div className="admin-machines-page">


      {/* =========================
          BANNIÈRE
      ========================= */}

      <header className="admin-machines-header">


        <button
          type="button"
          className="admin-machines-back"
          onClick={onBack}
          aria-label="Retour"
        >
          ←
        </button>


        <div className="admin-machines-brand">

          <h1>
            Gestion du catalogue
          </h1>

          <p>
            Machines UMI
          </p>

        </div>


        <img
          src={logoUmi}
          alt="UMI"
          className="admin-machines-logo"
        />


      </header>


      {/* =========================
          CONTENU
      ========================= */}

      <main className="admin-machines-content">


        {/* =========================
            INTRODUCTION
        ========================= */}

        <section className="admin-machines-intro">


          <div>

            <span>
              CATALOGUE UMI
            </span>

            <h2>
              Machines publiées
            </h2>

            <p>
              Ajoutez une machine ou retrouvez
              rapidement un produit à modifier.
            </p>

          </div>


          <div className="admin-machines-count">

            <strong>
              {machines.length}
            </strong>

            <span>
              machines
            </span>

          </div>


        </section>


        {/* =========================
            AJOUTER UNE MACHINE
        ========================= */}

        <button
          type="button"
          className="admin-machines-add-button"
          onClick={onAddMachine}
        >

          <span>
            ＋
          </span>

          Ajouter une machine

        </button>


        {/* =========================
            RECHERCHE
        ========================= */}

        <section className="admin-machines-search-section">


          <div className="admin-machines-search">


            <span className="admin-search-icon">
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
            />


            {search && (

              <button
                type="button"
                className="admin-search-clear"
                onClick={() =>
                  setSearch("")
                }
                aria-label="Effacer la recherche"
              >
                ×
              </button>

            )}


          </div>


          <p className="admin-search-help">
            Recherche par nom, catégorie,
            référence ou prix.
          </p>


        </section>


        {/* =========================
            NOMBRE DE RÉSULTATS
        ========================= */}

        <div className="admin-machines-results-header">

          <strong>

            {search
              ? `${filteredMachines.length} résultat${
                  filteredMachines.length !== 1
                    ? "s"
                    : ""
                }`
              : "Toutes les machines"}

          </strong>

        </div>


        {/* =========================
            MACHINES
        ========================= */}

        {filteredMachines.length > 0 ? (

          <div className="admin-catalog-grid">


            {filteredMachines.map(
              (machine) => (

                <article
                  key={machine.id}
                  className="admin-catalog-card"
                >


                  {/* PHOTO */}

                  <div className="admin-catalog-image-box">


                    {machine.imageUrl ? (

                      <img
                        src={machine.imageUrl}
                        alt={
                          machine.name ||
                          "Machine UMI"
                        }
                        className="admin-catalog-image"
                      />

                    ) : (

                      <div className="admin-catalog-no-image">
                        📷
                      </div>

                    )}


                  </div>


                  {/* INFORMATIONS */}

                  <div className="admin-catalog-info">


                    <h3>
                      {machine.name ||
                        "Machine sans nom"}
                    </h3>


                    {machine.category && (

                      <p className="admin-catalog-category">
                        {machine.category}
                      </p>

                    )}


                    {machine.reference && (

                      <p className="admin-catalog-reference">

                        Réf.{" "}
                        {machine.reference}

                      </p>

                    )}


                    <p className="admin-catalog-price">

                      {machine.price
                        ? machine.price
                        : "Prix non renseigné"}

                    </p>


                    {/* ACTIONS */}

                    <div className="admin-catalog-actions">


                      <button
                        type="button"
                        className="admin-catalog-edit"
                        onClick={() =>
                          onEditMachine?.(
                            machine
                          )
                        }
                      >
                        ✏️ Modifier
                      </button>


                      <button
                        type="button"
                        className="admin-catalog-delete"
                        onClick={() =>
                          handleDelete(
                            machine.id
                          )
                        }
                      >
                        🗑️ Supprimer
                      </button>


                    </div>


                  </div>


                </article>

              )
            )}


          </div>

        ) : (

          <div className="admin-catalog-empty">


            <div>
              🔍
            </div>


            <h3>

              {search
                ? "Aucune machine trouvée"
                : "Aucune machine publiée"}

            </h3>


            <p>

              {search
                ? `Aucun résultat pour « ${search} ».`
                : "Ajoutez votre première machine au catalogue UMI."}

            </p>


            {search ? (

              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
              >
                Afficher toutes les machines
              </button>

            ) : (

              <button
                type="button"
                onClick={onAddMachine}
              >
                ＋ Ajouter une machine
              </button>

            )}


          </div>

        )}


      </main>


    </div>

  );

}


export default AdminMachines;