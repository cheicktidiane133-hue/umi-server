import { withProductModel } from "./productModel";
import { getProductPrice } from "./productPrice";
import "./Favorites.css";

function Favorites({
  favorites = [],
  onBack,
  onOpenProduct,
  onRemoveFavorite,
}) {

  /* =========================================
     PHOTO PRINCIPALE
  ========================================= */

  const getProductImage = (product) => {

    if (
      Array.isArray(product?.images) &&
      product.images.length > 0
    ) {
      return product.images[0];
    }

    if (
      Array.isArray(product?.imageUrls) &&
      product.imageUrls.length > 0
    ) {
      return product.imageUrls[0];
    }

    return (
      product?.imageUrl ||
      product?.image ||
      ""
    );

  };


  /* =========================================
     NOM DU TYPE
  ========================================= */

  const getProductTypeName = (product) => {

    if (
      product?.productType ===
      "rawMaterial"
    ) {
      return "Matière première";
    }

    if (
      product?.productType ===
      "packaging"
    ) {
      return "Emballage";
    }

    return "Machine";

  };


  return (

    <div className="favorites-page">

      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="favorites-header">

        <button
          type="button"
          className="favorites-back"
          onClick={onBack}
          aria-label="Retour"
        >
          ←
        </button>

        <div>

          <h1>
            Mes favoris
          </h1>

          <p>
            Tous vos articles préférés
          </p>

        </div>

        <span className="favorites-header-heart">
          ♥
        </span>

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="favorites-content">

        {favorites.length === 0 ? (

          <div className="favorites-empty">

            <div className="favorites-empty-icon">
              ♡
            </div>

            <h2>
              Aucun favori
            </h2>

            <p>
              Les articles que vous ajoutez
              à vos favoris apparaîtront ici.
            </p>

          </div>

        ) : (

          <div className="favorites-grid">

            {favorites.map(
              (favorite) => {
                const product = withProductModel(favorite);
                const image =
                  getProductImage(product);

                const favoriteKey =
                  product.favoriteKey ||
                  `${product.productType || "machine"}_${product.id}`;

                return (

                  <article
                    className="favorite-card"
                    key={favoriteKey}
                  >

                    {/* PHOTO */}

                    <button
                      type="button"
                      className="favorite-image-button"
                      onClick={() =>
                        onOpenProduct?.(
                          product
                        )
                      }
                    >

                      {image ? (

                        <img
                          src={image}
                          alt={
                            product?.name ||
                            "Produit UMI"
                          }
                        />

                      ) : (

                        <div className="favorite-no-image">

                          {product?.productType ===
                          "rawMaterial"
                            ? "🌾"
                            : product?.productType ===
                              "packaging"
                              ? "📦"
                              : "⚙️"}

                        </div>

                      )}

                    </button>


                    {/* RETIRER FAVORI */}

<button
  type="button"
  className="favorite-remove"
  onClick={(event) => {
    event.stopPropagation();

    onRemoveFavorite?.(
      product
    );
  }}
  aria-label="Retirer des favoris"
  title="Supprimer des favoris"
>
  ×
</button>

                    {/* INFORMATIONS */}

                    <div className="favorite-info">

                      <small>
                        {getProductTypeName(
                          product
                        )}
                      </small>

                      <button
                        type="button"
                        className="favorite-name"
                        onClick={() =>
                          onOpenProduct?.(
                            product
                          )
                        }
                      >
                        {product?.name ||
                          "Article UMI"}
                      </button>

                      <strong>
  {getProductPrice(product)}
</strong>

                    </div>

                  </article>

                );

              }
            )}

          </div>

        )}

      </main>

    </div>

  );

}

export default Favorites;