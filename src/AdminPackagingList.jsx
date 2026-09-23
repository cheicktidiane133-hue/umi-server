import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";

import { db } from "./firebase";

import "./AdminCommerce.css";


function AdminPackagingList({
  onBack,
  onEdit,
}) {

  const [
    products,
    setProducts,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);


  /* =========================================
     CHARGER LES EMBALLAGES
  ========================================= */

  useEffect(() => {

    const packagingRef =
      collection(
        db,
        "packaging"
      );

    const unsubscribe =
      onSnapshot(

        packagingRef,

        (snapshot) => {

          const data =
            snapshot.docs.map(
              (document) => ({
                id: document.id,
                ...document.data(),
              })
            );

          setProducts(
            data
          );

          setLoading(
            false
          );

        },

        (error) => {

          console.error(
            "Erreur chargement emballages :",
            error
          );

          setLoading(
            false
          );

          alert(
            "Impossible de charger les emballages."
          );

        }

      );


    return () => {
      unsubscribe();
    };

  }, []);


  /* =========================================
     SUPPRIMER
  ========================================= */

  const handleDelete = async (
    product
  ) => {

    const confirmation =
      window.confirm(
        `Voulez-vous vraiment supprimer "${product?.name || "cet emballage"}" ?`
      );

    if (!confirmation) {
      return;
    }


    try {

      await deleteDoc(
        doc(
          db,
          "packaging",
          product.id
        )
      );

      alert(
        "Emballage supprimé avec succès."
      );


    } catch (error) {

      console.error(
        "Erreur suppression emballage :",
        error
      );

      alert(
        "Impossible de supprimer cet emballage."
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
            Emballages publiés
          </h1>

          <p>
            Administration UMI
          </p>

        </div>


        <span className="admin-commerce-header-icon">
          📦
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
                Gérer les emballages
              </h2>

            </div>


            <strong>
              {products.length}
            </strong>

          </div>


          {/* =================================
              CHARGEMENT
          ================================= */}

          {loading ? (

            <div className="admin-commerce-empty">
              Chargement...
            </div>

          ) : products.length === 0 ? (

            /* =================================
               VIDE
            ================================= */

            <div className="admin-commerce-empty">

              <span>
                📦
              </span>

              <h3>
                Aucun emballage publié
              </h3>

              <p>
                Les emballages que vous publierez
                apparaîtront sur cette page.
              </p>

            </div>

          ) : (

            /* =================================
               PRODUITS
            ================================= */

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
                          alt={product.name}
                        />

                      ) : (

                        <span>
                          📦
                        </span>

                      )}

                    </div>


                    {/* INFORMATIONS */}

                    <div className="admin-commerce-product-info">

                      <h3>
                        {product.name ||
                          "Emballage"}
                      </h3>


                      <strong className="admin-commerce-product-price">

                        {product.price ||
                          "Prix sur demande"}

                      </strong>


                      <div className="admin-commerce-product-details">

                        {product.type && (

                          <span>
                            Type : {product.type}
                          </span>

                        )}


                        {product.material && (

                          <span>
                            Matière : {product.material}
                          </span>

                        )}


                        {product.size && (

                          <span>
                            Dimensions : {product.size}
                          </span>

                        )}


                        {product.color && (

                          <span>
                            Couleur : {product.color}
                          </span>

                        )}


                        {product.stock && (

                          <span>
                            Stock : {product.stock}
                          </span>

                        )}


                        {product.minimumQuantity && (

                          <span>
                            Minimum : {product.minimumQuantity}
                          </span>

                        )}


                        {product.customizable && (

                          <span>
                            ✓ Personnalisable
                          </span>

                        )}

                      </div>


                      {/* ACTIONS */}

                      <div className="admin-commerce-product-actions">

                        <button
                          type="button"
                          className="admin-commerce-edit"
                          onClick={() =>
                            onEdit?.(
                              product
                            )
                          }
                        >
                          ✏️ Modifier
                        </button>


                        <button
                          type="button"
                          className="admin-commerce-delete"
                          onClick={() =>
                            handleDelete(
                              product
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

          )}

        </section>

      </main>

    </div>

  );

}


export default AdminPackagingList;