import "./Order.css";


function Order({
  cart = [],
  user,
  onBack,
  onConfirmOrder,
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


    if (typeof price === "number") {

      return Number.isFinite(price)
        ? price
        : null;

    }


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


    if (hasComma && hasDot) {

      if (
        value.lastIndexOf(",") >
        value.lastIndexOf(".")
      ) {

        value = value
          .replace(/\./g, "")
          .replace(",", ".");

      } else {

        value =
          value.replace(/,/g, "");

      }

    } else if (hasComma) {

      const parts =
        value.split(",");


      if (
        parts.length === 2 &&
        parts[1].length <= 2
      ) {

        value =
          value.replace(",", ".");

      } else {

        value =
          value.replace(/,/g, "");

      }

    } else if (hasDot) {

      const parts =
        value.split(".");


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


    if (value.includes("CHF")) {
      return "CHF";
    }


    if (
      value.includes("€") ||
      value.includes("EUR")
    ) {
      return "€";
    }


    return "€";

  };


  /* =========================================
     FORMATER LE PRIX
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
     NOMBRE TOTAL DE MACHINES
  ========================================= */

  const totalQuantity =
    cart.reduce(
      (total, machine) => {

        const quantity =
          Math.max(
            1,
            Number(
              machine?.quantity
            ) || 1
          );


        return total + quantity;

      },
      0
    );


  /* =========================================
     TOTAL DE LA COMMANDE
  ========================================= */

  const orderTotal =
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


  /* =========================================
     DEVISE DU TOTAL
  ========================================= */

  const firstProductWithPrice =
    cart.find(
      (machine) =>
        getNumericPrice(
          machine?.price
        ) !== null
    );


  const orderCurrency =
    getCurrency(
      firstProductWithPrice?.price
    );


  return (

    <div className="order-page">


      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="order-header">

        <button
          type="button"
          className="order-back"
          onClick={onBack}
        >
          ←
        </button>


        <h1>
          Ma commande
        </h1>


        <div className="order-header-icon">
          📦
        </div>

      </header>


      {/* =====================================
          CONTENU
      ===================================== */}

      <main className="order-content">


        {/* =====================================
            RÉSUMÉ DU PANIER
        ===================================== */}

        <section className="order-section">

          <div className="order-summary-heading">

            <div>

              <h2>
                Résumé du panier
              </h2>


              <p className="order-count">

                {totalQuantity}

                {" "}

                machine
                {totalQuantity > 1
                  ? "s"
                  : ""}

              </p>

            </div>

          </div>


          {/* =====================================
              PRODUITS
          ===================================== */}

          <div className="order-products">

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

                  <div
                    className="order-product"
                    key={
                      machine?.id ||
                      index
                    }
                  >


                    {/* PHOTO */}

                    <div className="order-product-image">

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

                        <span>
                          ⚙️
                        </span>

                      )}

                    </div>


                    {/* INFORMATIONS */}

                    <div className="order-product-info">

                      <strong className="order-product-name">

                        {machine?.name ||
                          "Machine industrielle"}

                      </strong>


                      {/* PRIX UNITAIRE */}

                      <div className="order-product-detail">

                        <span>
                          Prix unitaire
                        </span>

                        <strong>
                          {unitPrice !== null
                            ? formatPrice(
                                unitPrice,
                                currency
                              )
                            : "Prix sur demande"}
                        </strong>

                      </div>


                      {/* QUANTITÉ */}

                      <div className="order-product-detail">

                        <span>
                          Quantité
                        </span>

                        <strong>
                          {quantity}
                        </strong>

                      </div>


                      {/* SOUS-TOTAL */}

                      <div className="order-product-subtotal">

                        <span>
                          Sous-total
                        </span>

                        <strong>
                          {lineTotal !== null
                            ? formatPrice(
                                lineTotal,
                                currency
                              )
                            : "Prix sur demande"}
                        </strong>

                      </div>

                    </div>

                  </div>

                );

              }
            )}

          </div>


          {/* =====================================
              TOTAL GÉNÉRAL
          ===================================== */}

          <div className="order-total">

            <span>
              Total
            </span>


            <strong>

              {formatPrice(
                orderTotal,
                orderCurrency
              )}

            </strong>

          </div>

        </section>


        {/* =====================================
            INFORMATIONS CLIENT
        ===================================== */}

        <section className="order-section">

          <h2>
            Informations client
          </h2>


          {/* NOM */}

          <div className="order-client-row">

            <span>
              👤
            </span>

            <div>

              <small>
                Nom
              </small>

              <strong>
                {user?.nom ||
                  "Non renseigné"}
              </strong>

            </div>

          </div>


          {/* EMAIL */}

          <div className="order-client-row">

            <span>
              📧
            </span>

            <div>

              <small>
                E-mail
              </small>

              <strong>
                {user?.email ||
                  "Non renseigné"}
              </strong>

            </div>

          </div>


          {/* TÉLÉPHONE */}

          <div className="order-client-row">

            <span>
              📱
            </span>

            <div>

              <small>
                Téléphone
              </small>

              <strong>
                {user?.telephone ||
                  "Non renseigné"}
              </strong>

            </div>

          </div>

        </section>


        {/* =====================================
            INFORMATION PAIEMENT
        ===================================== */}

        <div className="order-information">

          <span>
            🔒
          </span>


          <p>
            Vérifiez votre commande avant
            de continuer vers le paiement.
            Vous pourrez ensuite choisir
            votre moyen de paiement.
          </p>

        </div>

      </main>


      {/* =====================================
          BOUTON PAYER
      ===================================== */}

      <div className="order-bottom">

        <div className="order-bottom-total">

          <span>
            Total
          </span>

          <strong>
            {formatPrice(
              orderTotal,
              orderCurrency
            )}
          </strong>

        </div>


        <button
          type="button"
          className="order-confirm-button"
          onClick={onConfirmOrder}
          disabled={
            cart.length === 0
          }
        >
          Payer
        </button>

      </div>

    </div>

  );

}


export default Order;