import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "./firebase";
import "./CommerceModule.css";


function Packaging({
  onBack,
  onOpenProduct,
}) {

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);


  useEffect(() => {

    const loadProducts = async () => {

      try {

        const snapshot = await getDocs(
          collection(db, "packaging")
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
          "Erreur emballages :",
          error
        );

      } finally {

        setLoading(false);

      }

    };


    loadProducts();

  }, []);


  const filteredProducts = useMemo(() => {

    const text = search
      .trim()
      .toLowerCase();

    if (!text) {
      return products;
    }

    return products.filter((product) => {

      const information = [
        product.name,
        product.type,
        product.material,
        product.size,
        product.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return information.includes(text);

    });

  }, [products, search]);


  return (

    <div className="commerce-page">

      <header className="commerce-header">

        <button
          type="button"
          onClick={onBack}
        >
          ←
        </button>

        <div>
          <h1>Emballages</h1>
          <p>UMI Marketplace</p>
        </div>

        <span>📦</span>

      </header>


      <main className="commerce-content">

        <div className="commerce-intro">

          <h2>
            Emballages professionnels
          </h2>

          <p>
            Sachets, bouteilles, cartons,
            pots, étiquettes et emballages
            personnalisés.
          </p>

        </div>


        <div className="commerce-search">

          <span>🔍</span>

          <input
            type="text"
            placeholder="Rechercher un emballage..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>


        {loading ? (

          <div className="commerce-empty">
            Chargement...
          </div>

        ) : filteredProducts.length === 0 ? (

          <div className="commerce-empty">

            <div>📦</div>

            <h3>
              Aucun emballage disponible
            </h3>

            <p>
              Les emballages ajoutés par
              l'administration apparaîtront ici.
            </p>

          </div>

        ) : (

          <div className="commerce-grid">

            {filteredProducts.map(
              (product) => (

                <button
                  type="button"
                  className="commerce-card"
                  key={product.id}
                  onClick={() =>
                    onOpenProduct(product)
                  }
                >

                  <div className="commerce-card-image">

                    {product.imageUrl ? (

                      <img
                        src={product.imageUrl}
                        alt={product.name}
                      />

                    ) : (

                      <span>📦</span>

                    )}

                  </div>


                  <div className="commerce-card-info">

                    <h3>
                      {product.name}
                    </h3>

                    {product.minimumQuantity && (

                      <p>
                        Minimum :{" "}
                        {product.minimumQuantity}
                      </p>

                    )}

                    <strong>
                      {product.price ||
                        "Prix sur demande"}
                    </strong>

                  </div>

                </button>

              )
            )}

          </div>

        )}

      </main>

    </div>

  );

}


export default Packaging;