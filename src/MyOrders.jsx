
import "./MyOrders.css";

function MyOrders({
  orders = [],
  onBack,
  onOpenOrder,
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

    const cleaned = String(price)
      .replace(/\s/g, "")
      .replace(/[^\d.,-]/g, "")
      .replace(/,/g, ".");

    const number = Number(cleaned);

    return Number.isFinite(number)
      ? number
      : null;
  };


  /* =========================================
     DEVISE
  ========================================= */

  const getCurrency = (order) => {

    if (order?.currency) {
      return order.currency;
    }

    const firstProduct =
      Array.isArray(order?.products)
        ? order.products[0]
        : null;

    const price =
      String(firstProduct?.price || "")
        .toUpperCase();

    if (
      price.includes("FCFA") ||
      price.includes("CFA")
    ) {
      return "FCFA";
    }

    if (
      price.includes("$") ||
      price.includes("USD")
    ) {
      return "$";
    }

    if (price.includes("CHF")) {
      return "CHF";
    }

    if (
      price.includes("€") ||
      price.includes("EUR")
    ) {
      return "€";
    }

    /*
      Les anciennes commandes UMI
      utilisent principalement le FCFA.
    */

    return "FCFA";
  };


  /* =========================================
     FORMAT DU PRIX
  ========================================= */

  const formatPrice = (
    amount,
    currency = "FCFA"
  ) => {

    if (
      amount === null ||
      amount === undefined
    ) {
      return "Prix non renseigné";
    }

    const number = Number(amount);

    if (!Number.isFinite(number)) {
      return "Prix non renseigné";
    }

    const formatted =
      new Intl.NumberFormat(
        "fr-FR",
        {
          maximumFractionDigits: 2,
        }
      ).format(number);

    if (currency === "$") {
      return `${formatted} $`;
    }

    return `${formatted} ${currency}`;
  };


  /* =========================================
     TOTAL D'UNE COMMANDE
  ========================================= */

  const getOrderTotal = (order) => {

    if (
      order?.total !== null &&
      order?.total !== undefined &&
      Number.isFinite(Number(order.total))
    ) {
      return Number(order.total);
    }

    if (!Array.isArray(order?.products)) {
      return 0;
    }

    return order.products.reduce(
      (total, product) => {

        const price =
          getNumericPrice(
            product?.price
          );

        const quantity =
          Math.max(
            1,
            Number(
              product?.quantity
            ) || 1
          );

        if (price === null) {
          return total;
        }

        return (
          total +
          price * quantity
        );

      },
      0
    );
  };


  /* =========================================
     QUANTITÉ TOTALE
  ========================================= */

  const getTotalQuantity = (order) => {

    if (!Array.isArray(order?.products)) {
      return 0;
    }

    return order.products.reduce(
      (total, product) =>
        total +
        Math.max(
          1,
          Number(
            product?.quantity
          ) || 1
        ),
      0
    );
  };


  /* =========================================
     NOM DU PRODUIT
  ========================================= */

  const getProductsName = (order) => {

    if (
      !Array.isArray(order?.products) ||
      order.products.length === 0
    ) {
      return "Produit non renseigné";
    }

    if (order.products.length === 1) {
      return (
        order.products[0]?.name ||
        "Machine industrielle"
      );
    }

    return `${order.products.length} produits`;
  };


  /* =========================================
     MODE DE PAIEMENT
  ========================================= */

  const getPaymentMethodName = (
    method
  ) => {

    if (method === "card") {
      return "Carte bancaire";
    }

    if (method === "orange") {
      return "Orange Money";
    }

    if (method === "wave") {
      return "Wave";
    }

    /*
      Les anciennes commandes n'avaient
      pas encore le paiement PayTech.
    */

    return "Non renseigné";
  };


  /* =========================================
     STATUT
  ========================================= */

  const getStatusName = (status) => {

    const value =
      String(status || "")
        .toLowerCase()
        .trim();

    if (value === "paid") {
      return "Payée";
    }

    if (value === "pending") {
      return "En attente";
    }

    if (value === "cancelled") {
      return "Annulée";
    }

    if (value === "nouvelle") {
      return "Nouvelle";
    }

    if (value === "expédiée") {
      return "Expédiée";
    }

    if (value === "livrée") {
      return "Livrée";
    }

    return status || "Commande";
  };


  /* =========================================
     CLASSE DU STATUT
  ========================================= */

  const getStatusClass = (status) => {

    const value =
      String(status || "")
        .toLowerCase()
        .trim();

    if (
      value === "paid" ||
      value === "payée" ||
      value === "livrée"
    ) {
      return "paid";
    }

    if (
      value === "cancelled" ||
      value === "annulée"
    ) {
      return "cancelled";
    }

    return "pending";
  };


  /* =========================================
     DATE
  ========================================= */

  const getOrderDate = (order) => {

    if (order?.paymentDate) {
      return order.paymentDate;
    }

    if (order?.date) {
      return order.date;
    }

    const createdAt =
      order?.createdAt;

    if (!createdAt) {
      return "Date non renseignée";
    }

    try {

      let date = null;

      if (
        typeof createdAt?.toDate ===
        "function"
      ) {
        date = createdAt.toDate();
      } else if (
        createdAt?.seconds
      ) {
        date = new Date(
          createdAt.seconds * 1000
        );
      } else {
        date = new Date(
          createdAt
        );
      }

      if (
        !date ||
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "Date non renseignée";
      }

      return new Intl.DateTimeFormat(
        "fr-FR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      ).format(date);

    } catch (error) {

      return "Date non renseignée";

    }
  };


  /* =========================================
     NUMÉRO DE COMMANDE
  ========================================= */

  const getOrderNumber = (
    order,
    index
  ) => {

    if (order?.orderNumber) {
      return order.orderNumber;
    }

    if (order?.id) {

      const shortId =
        String(order.id)
          .slice(-6)
          .toUpperCase();

      return `UMI-${shortId}`;
    }

    return `UMI-${index + 1}`;
  };


  return (

    <div className="my-orders-page">

      {/* EN-TÊTE */}

      <header className="my-orders-header">

        <button
          type="button"
          className="my-orders-back"
          onClick={onBack}
        >
          ←
        </button>

        <h1>
          Mes commandes
        </h1>

        <div className="my-orders-header-space" />

      </header>


      {/* CONTENU */}

      <main className="my-orders-content">

        {orders.length === 0 ? (

          <div className="my-orders-empty">

            <div className="my-orders-empty-icon">
              📦
            </div>

            <h2>
              Aucune commande
            </h2>

            <p>
              Vos commandes apparaîtront ici
              après leur enregistrement.
            </p>

          </div>

        ) : (

          <div className="my-orders-list">

            {orders.map(
              (order, index) => {

                const currency =
                  getCurrency(order);

                const total =
                  getOrderTotal(order);

                const quantity =
                  getTotalQuantity(order);

                return (

                  <button
                    type="button"
                    className="my-order-card"
                    key={
                      order?.id ||
                      order?.orderNumber ||
                      index
                    }
                    onClick={() =>
                      onOpenOrder?.(
                        order
                      )
                    }
                  >

                    {/* HAUT */}

                    <div className="my-order-top">

                      <div>

                        <span className="my-order-label">
                          Commande
                        </span>

                        <strong className="my-order-number">
                          {getOrderNumber(
                            order,
                            index
                          )}
                        </strong>

                      </div>


                      <span
                        className={`my-order-status ${getStatusClass(
                          order?.status
                        )}`}
                      >
                        {getStatusName(
                          order?.status
                        )}
                      </span>

                    </div>


                    {/* PRODUIT */}

                    <div className="my-order-product">

                      <span>
                        🏭
                      </span>

                      <div>

                        <strong>
                          {getProductsName(
                            order
                          )}
                        </strong>

                        <small>
                          Quantité : {quantity}
                        </small>

                      </div>

                    </div>


                    {/* INFORMATIONS */}

                    <div className="my-order-details">

                      <div>

                        <span>
                          Date
                        </span>

                        <strong>
                          {getOrderDate(
                            order
                          )}
                        </strong>

                      </div>


                      <div>

                        <span>
                          Paiement
                        </span>

                        <strong>
                          {getPaymentMethodName(
                            order?.paymentMethod
                          )}
                        </strong>

                      </div>

                    </div>


                    {/* TOTAL */}

                    <div className="my-order-bottom">

                      <div>

                        <span>
                          Total
                        </span>

                        <strong>
                          {formatPrice(
                            total,
                            currency
                          )}
                        </strong>

                      </div>

                      <span className="my-order-arrow">
                        ›
                      </span>

                    </div>

                  </button>

                );

              }
            )}

          </div>

        )}

      </main>

    </div>

  );

}

export default MyOrders;