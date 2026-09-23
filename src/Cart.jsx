import "./Cart.css";


function Cart({
  cart = [],
  onBack,
  onHome,
  onCategories,
  onRemove,
  onOpenProduct,
  onContinueOrder,
  onIncreaseQuantity,
  onDecreaseQuantity,
}) {


  /* =========================================
     CONVERTIR LE PRIX EN NOMBRE
  ========================================= */

  const getNumericPrice = (price) => {

    if (
      price === null ||
      price === undefined ||
      price === ""
    ) {
      return null;
    }


    /*
      Si Firebase contient déjà
      un vrai nombre.
    */

    if (typeof price === "number") {

      return Number.isFinite(price)
        ? price
        : null;

    }


    /*
      Exemple accepté :

      2000
      2 000
      2 000 €
      2000 €
      2.000,50 €
      2,000.50 €
    */

    let value = String(price)
      .replace(/\s/g, "")
      .replace(/[^\d.,-]/g, "");


    if (!value) {
      return null;
    }


    const hasComma =
      value.includes(",");

    const hasDot =
      value.includes(".");


    /*
      Cas :
      2.000,50
    */

    if (hasComma && hasDot) {

      if (
        value.lastIndexOf(",") >
        value.lastIndexOf(".")
      ) {

        value = value
          .replace(/\./g, "")
          .replace(",", ".");

      } else {

        /*
          Cas :
          2,000.50
        */

        value =
          value.replace(/,/g, "");

      }

    } else if (hasComma) {

      const parts =
        value.split(",");


      /*
        2000,50
      */

      if (
        parts.length === 2 &&
        parts[1].length <= 2
      ) {

        value =
          value.replace(",", ".");

      } else {

        /*
          2,000
        */

        value =
          value.replace(/,/g, "");

      }

    } else if (hasDot) {

      const parts =
        value.split(".");


      /*
        2.000 = 2000
      */

      if (
        parts.length === 2 &&
        parts[1].length === 3
      ) {

        value =
          value.replace(".", "");

      }

    }


    const number =
      Number(value);


    return Number.isFinite(number)
      ? number
      : null;

  };


  /* =========================================
     RÉCUPÉRER LA DEVISE
  ========================================= */

  const getCurrency = (price) => {

    const value =
      String(price || "")
        .toUpperCase();


    if (
      value.includes("FCFA") ||
      value.includes("CFA")
    ) {
      return "FCFA";
    }


    if (
      value.includes("$") ||
      value.includes("USD")
    ) {
      return "$";
    }


    if (
      value.includes("CHF")
    ) {
      return "CHF";
    }


    if (
      value.includes("€") ||
      value.includes("EUR")
    ) {
      return "€";
    }


    /*
      Devise par défaut si aucun symbole
      n'est enregistré dans le prix.
    */

    return "€";

  };


  /* =========================================
     FORMATER UN PRIX
  ========================================= */

  const formatPrice = (
    amount,
    currency
  ) => {

    if (
      amount === null ||
      amount === undefined
    ) {
      return "Prix sur demande";
    }


    const formattedAmount =
      new Intl.NumberFormat(
        "fr-FR",
        {
          maximumFractionDigits: 2,
        }
      ).format(amount);


    if (currency === "$") {

      return `${formattedAmount} $`;

    }


    return `${formattedAmount} ${currency}`;

  };


  /* =========================================
     CALCUL DU TOTAL DU PANIER
  ========================================= */

  const cartTotal =
    cart.reduce(
      (total, machine) => {

        const unitPrice =
          getNumericPrice(
            machine?.price
          );


        const quantity =
          Math.max(
            1,
            Number(
              machine?.quantity
            ) || 1
          );


        if (unitPrice === null) {

          return total;

        }


        return (
          total +
          unitPrice * quantity
        );

      },
      0
    );


  /*
    Pour le total général, on prend
    la devise du premier produit ayant
    un prix.

    Plus tard, si UMI doit accepter
    plusieurs devises dans le même panier,
    nous gérerons la conversion séparément.
  */

  const firstProductWithPrice =
    cart.find(
      (machine) =>
        getNumericPrice(
          machine?.price
        ) !== null
    );


  const cartCurrency =
    getCurrency(
      firstProductWithPrice?.price
    );


  return (

    <div className="cart-page">


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="cart-header">

        <button
          type="button"
          className="cart-back"
          onClick={onBack}
        >
          ←
        </button>


        <h1>
          Mon panier
        </h1>


        <div className="cart-header-icon">
          🛒
        </div>

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="cart-content">

        {cart.length === 0 ? (

          <div className="cart-empty">

            <div className="cart-empty-icon">
              🛒
            </div>


            <h2>
              Votre panier est vide
            </h2>


            <p>
              Découvrez nos machines industrielles
              et ajoutez celles qui vous intéressent.
            </p>


            <button
              type="button"
              onClick={onCategories}
            >
              Découvrir les machines
            </button>

          </div>

        ) : (

          <>

            {/* =====================================
                LISTE DES MACHINES
            ===================================== */}

            <div className="cart-list">

              {cart.map(
                (machine, index) => {

                  const quantity =
                    Math.max(
                      1,
                      Number(
                        machine?.quantity
                      ) || 1
                    );


                  const unitPrice =
                    getNumericPrice(
                      machine?.price
                    );


                  const currency =
                    getCurrency(
                      machine?.price
                    );


                  const lineTotal =
                    unitPrice !== null
                      ? unitPrice * quantity
                      : null;


                  return (

                    <article
                      className="cart-item"
                      key={
                        machine?.id ||
                        index
                      }
                    >


                      {/* =====================================
                          PHOTO
                      ===================================== */}

                      <div
                        className="cart-item-image"
                        onClick={() =>
                          onOpenProduct?.(
                            machine
                          )
                        }
                      >

                        {machine?.imageUrl ||
                        machine?.image ? (

                          <img
                            src={
                              machine.imageUrl ||
                              machine.image
                            }
                            alt={
                              machine?.name ||
                              "Machine"
                            }
                          />

                        ) : (

                          <div className="cart-no-image">
                            ⚙️
                          </div>

                        )}

                      </div>


                      {/* =====================================
                          INFORMATIONS
                      ===================================== */}

                      <div className="cart-item-info">

                        <h3>
                          {machine?.name ||
                            "Machine industrielle"}
                        </h3>


                        {/* =====================================
                            PRIX MULTIPLIÉ
                        ===================================== */}

                        <p className="cart-item-price">

                          {lineTotal !== null
                            ? formatPrice(
                                lineTotal,
                                currency
                              )
                            : "Prix sur demande"}

                        </p>


                        {/* =====================================
                            PRIX UNITAIRE
                        ===================================== */}

                        {unitPrice !== null &&
                          quantity > 1 && (

                            <p className="cart-unit-price">

                              {formatPrice(
                                unitPrice,
                                currency
                              )}

                              {" × "}

                              {quantity}

                            </p>

                          )}


                        {/* =====================================
                            QUANTITÉ
                        ===================================== */}

                        <div className="cart-quantity">

                          <span className="cart-quantity-label">
                            Quantité
                          </span>


                          <div className="cart-quantity-controls">


                            {/* DIMINUER */}

                            <button
                              type="button"
                              className="cart-quantity-button"
                              onClick={() =>
                                onDecreaseQuantity?.(
                                  machine
                                )
                              }
                              disabled={
                                quantity <= 1
                              }
                              aria-label="Diminuer la quantité"
                            >
                              −
                            </button>


                            {/* NOMBRE */}

                            <span className="cart-quantity-number">
                              {quantity}
                            </span>


                            {/* AUGMENTER */}

                            <button
                              type="button"
                              className="cart-quantity-button"
                              onClick={() =>
                                onIncreaseQuantity?.(
                                  machine
                                )
                              }
                              aria-label="Augmenter la quantité"
                            >
                              +
                            </button>

                          </div>

                        </div>

                      </div>


                      {/* =====================================
                          SUPPRIMER
                      ===================================== */}

                      <button
                        type="button"
                        className="cart-remove"
                        onClick={() =>
                          onRemove?.(
                            machine
                          )
                        }
                        aria-label="Supprimer du panier"
                      >
                        ×
                      </button>

                    </article>

                  );

                }
              )}

            </div>


            {/* =====================================
                TOTAL DU PANIER
            ===================================== */}

            <div className="cart-total-box">

              <div className="cart-total-row">

                <span>
                  Total du panier
                </span>


                <strong>
                  {formatPrice(
                    cartTotal,
                    cartCurrency
                  )}
                </strong>

              </div>

            </div>

          </>

        )}

      </main>


      {/* =====================================
          BARRE FIXE EN BAS
      ===================================== */}

      <div className="cart-taskbar">


        {/* ACCUEIL */}

        <button
          type="button"
          className="cart-taskbar-home"
          onClick={onHome}
        >

          <span className="cart-taskbar-icon">
            ⌂
          </span>

          <small>
            Accueil
          </small>

        </button>


        {/* CATÉGORIES */}

        <button
          type="button"
          className="cart-taskbar-categories"
          onClick={onCategories}
        >

          <span className="cart-taskbar-icon">
            ⚙
          </span>

          <small>
            Catégories
          </small>

        </button>


        {/* CONTINUER */}

        <button
          type="button"
          className="cart-taskbar-order"
          onClick={
            onContinueOrder
          }
          disabled={
            cart.length === 0
          }
        >
          Continuer la commande
        </button>

      </div>

    </div>

  );

}


export default Cart;