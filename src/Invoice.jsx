import "./Invoice.css";

function Invoice({
  cart = [],
  user,
  orderNumber = "",
  paymentMethod = "",
  paymentDate = "",
}) {

  /* =========================================
     CONVERTIR LE PRIX
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

    const hasComma = value.includes(",");
    const hasDot = value.includes(".");

    if (hasComma && hasDot) {
      if (
        value.lastIndexOf(",") >
        value.lastIndexOf(".")
      ) {
        value = value
          .replace(/\./g, "")
          .replace(",", ".");
      } else {
        value = value.replace(/,/g, "");
      }
    } else if (hasComma) {
      const parts = value.split(",");

      if (
        parts.length === 2 &&
        parts[1].length <= 2
      ) {
        value = value.replace(",", ".");
      } else {
        value = value.replace(/,/g, "");
      }
    } else if (hasDot) {
      const parts = value.split(".");

      if (
        parts.length === 2 &&
        parts[1].length === 3
      ) {
        value = value.replace(".", "");
      }
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  };


  /* =========================================
     DEVISE
  ========================================= */

  const getCurrency = (price) => {
    const value = String(price || "").toUpperCase();

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
     DEVISE DE LA COMMANDE
  ========================================= */

  const firstProductWithPrice =
    cart.find(
      (item) =>
        getNumericPrice(item?.price) !== null
    );

  const currency =
    getCurrency(firstProductWithPrice?.price);


  /* =========================================
     FORMATER LE PRIX
  ========================================= */

  const formatPrice = (amount) => {
    if (
      amount === null ||
      amount === undefined
    ) {
      return "Prix sur demande";
    }

    const formatted =
      new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
      }).format(amount);

    if (currency === "$") {
      return `${formatted} $`;
    }

    return `${formatted} ${currency}`;
  };


  /* =========================================
     TOTAL
  ========================================= */

  const total = cart.reduce(
    (currentTotal, item) => {
      const unitPrice =
        getNumericPrice(item?.price);

      const quantity = Math.max(
        1,
        Number(item?.quantity) || 1
      );

      if (unitPrice === null) {
        return currentTotal;
      }

      return (
        currentTotal +
        unitPrice * quantity
      );
    },
    0
  );


  /* =========================================
     NOM DU MOYEN DE PAIEMENT
  ========================================= */

  const getPaymentMethodName = () => {
    if (paymentMethod === "card") {
      return "Carte bancaire";
    }

    if (paymentMethod === "orange") {
      return "Orange Money";
    }

    if (paymentMethod === "wave") {
      return "Wave";
    }

    return "Paiement en ligne";
  };


  return (
    <div className="invoice-page">

      {/* EN-TÊTE */}

      <header className="invoice-header">

        <div>
          <h1>UMI</h1>

          <p>
            Univers Des Machines Industrielles
          </p>
        </div>

        <div className="invoice-title">
          FACTURE
        </div>

      </header>


      {/* INFORMATIONS FACTURE */}

      <section className="invoice-info">

        <div>
          <span>N° de facture</span>

          <strong>
            {orderNumber || "—"}
          </strong>
        </div>

        <div>
          <span>Date</span>

          <strong>
            {paymentDate || "—"}
          </strong>
        </div>

        <div>
          <span>Paiement</span>

          <strong>
            {getPaymentMethodName()}
          </strong>
        </div>

      </section>


      {/* CLIENT */}

      <section className="invoice-client">

        <h2>
          Facturé à
        </h2>

        <strong>
          {user?.nom || "Client UMI"}
        </strong>

        {user?.email && (
          <p>{user.email}</p>
        )}

        {user?.telephone && (
          <p>{user.telephone}</p>
        )}

      </section>


      {/* PRODUITS */}

      <section className="invoice-products">

        <div className="invoice-table-header">

          <span>Produit</span>
          <span>Qté</span>
          <span>Prix</span>
          <span>Total</span>

        </div>


        {cart.map((item, index) => {

          const unitPrice =
            getNumericPrice(item?.price);

          const quantity = Math.max(
            1,
            Number(item?.quantity) || 1
          );

          const subtotal =
            unitPrice === null
              ? null
              : unitPrice * quantity;


          return (
            <div
              className="invoice-product-row"
              key={
                item?.id ||
                `${item?.name || "produit"}-${index}`
              }
            >

              <span className="invoice-product-name">
                {item?.name || "Machine"}
              </span>

              <span>
                {quantity}
              </span>

              <span>
                {formatPrice(unitPrice)}
              </span>

              <strong>
                {formatPrice(subtotal)}
              </strong>

            </div>
          );
        })}

      </section>


      {/* TOTAL */}

      <section className="invoice-total">

        <span>
          TOTAL PAYÉ
        </span>

        <strong>
          {formatPrice(total)}
        </strong>

      </section>


      {/* STATUT */}

      <div className="invoice-paid">
        ✓ PAYÉ
      </div>


      {/* BAS DE FACTURE */}

      <footer className="invoice-footer">

        <strong>
          Merci pour votre confiance.
        </strong>

        <p>
          UMI — Univers Des Machines Industrielles
        </p>

        <small>
          Facture générée après confirmation
          du paiement.
        </small>

      </footer>

    </div>
  );
}

export default Invoice;