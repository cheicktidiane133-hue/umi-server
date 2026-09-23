import { useEffect, useState } from "react";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";

import { db } from "./firebase";

import "./AdminCommerce.css";


function AdminRawMaterialsList({
  onBack,
  onEdit,
}) {

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);


  /* =========================================
     CHARGER LES MATIÈRES PUBLIÉES
  ========================================= */

  const loadProducts = async () => {

    try {

      setLoading(true);

      const snapshot = await getDocs(
        collection(db, "rawMaterials")
      );

      const data = snapshot.docs.map(
        (document) => ({
          id: document.id,
          ...document.data(),
        })
      );

      setProducts(data);

    } catch (error) {

      console.error(
        "Erreur chargement matières premières :",
        error
      );

      alert(
        "Impossible de charger les matières premières."
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    loadProducts();

  }, []);


  /* =========================================
     SUPPRIMER
  ========================================= */

  const handleDelete = async (product) => {

    const confirmation = window.confirm(
      `Voulez-vous vraiment supprimer "${product?.name || "cette matière première"}" ?`
    );

    if (!confirmation) {
      return;
    }

    try {

      await deleteDoc(
        doc(
          db,
          "rawMaterials",
          product.id
        )
      );

      setProducts(
        (previousProducts) =>
          previousProducts.filter(
            (item) =>
              item.id !== product.id
          )
      );

      alert(
        "Matière première supprimée avec succès."
      );

    } catch (error) {

      console.error(
        "Erreur suppression matière première :",
        error
      );

      alert(
        "Impossible de supprimer cette matière première."
      );

    }

  };


  return (

    <div className="admin-commerce-page">

      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="admin-commerce-header">

        <button
          type="button"
          onClick={onBack}
          className="admin-commerce-back"
        >
          ←
        </button>

        <div>

          <h1>
            Matières publiées
          </h1>

          <p>
            Administration UMI
          </p>

        </div>

        <span className="admin-commerce-header-icon">
          🌾
        </span>

      </header>


      <main className="admin-commerce-content">

        {/* =====================================
            TITRE
        ===================================== */}

        <section className="admin-commerce-list-section">

          <div className="admin-commerce-list-header">

            <div>

              <span>
                CATALOGUE
              </span>

              <h2>
                Matières premières publiées
              </h2>

            </div>

            <strong>
              {products.length}
            </strong>

          </div>


          {/* =====================================
              CHARGEMENT
          ===================================== */}

          {loading ? (

            <div className="admin-commerce-empty">

              Chargement...

            </div>

          ) : products.length === 0 ? (

            <div className="admin-commerce-empty">

              <span>
                🌾
              </span>

              <h3>
                Aucune matière première publiée
              </h3>

              <p>
                Les matières premières publiées
                apparaîtront sur cette page.
              </p>

            </div>

          ) : (

            /* =====================================
               LISTE
            ===================================== */

            <div className="admin-commerce-products">

              {products.map(
                (product) => (

                  <article
                    className="admin-commerce-product"
                    key={product.id}
                  >

                    {/* IMAGE */}

                    <div className="admin-commerce-product-image">

                      {product.imageUrl ? (

                        <img
                          src={product.imageUrl}
                          alt={
                            product.name ||
                            "Matière première"
                          }
                        />

                      ) : (

                        <span>
                          🌾
                        </span>

                      )}

                    </div>


                    {/* INFORMATIONS */}

                    <div className="admin-commerce-product-info">

                      <h3>
                        {product.name ||
                          "Sans nom"}
                      </h3>

                      <strong className="admin-commerce-product-price">

                        {product.price ||
                          "Prix sur demande"}

                      </strong>


                      <div className="admin-commerce-product-details">

                        {product.category && (

                          <span>
                            Catégorie :{" "}
                            {product.category}
                          </span>

                        )}

                        {product.unit && (

                          <span>
                            Unité :{" "}
                            {product.unit}
                          </span>

                        )}

                        {product.stock && (

                          <span>
                            Stock :{" "}
                            {product.stock}
                          </span>

                        )}

                        {product.origin && (

                          <span>
                            Origine :{" "}
                            {product.origin}
                          </span>

                        )}

                      </div>


                      {/* BOUTONS */}

                      <div className="admin-commerce-product-actions">

                        <button
                          type="button"
                          className="admin-commerce-edit"
                          onClick={() => {

                            if (onEdit) {
                              onEdit(product);
                            }

                          }}
                        >
                          ✏️ Modifier
                        </button>


                        <button
                          type="button"
                          className="admin-commerce-delete"
                          onClick={() =>
                            handleDelete(product)
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

          )}

        </section>

      </main>

    </div>

  );

}


export default AdminRawMaterialsList;