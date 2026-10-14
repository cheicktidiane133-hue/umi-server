import "./OrderDetail.css";

function OrderDetail({
  order,
  onBack,
}) {

  /* =========================================
     PRIX
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

  const getCurrency = () => {
    if (order?.currency) {
      return order.currency;
    }

    return "FCFA";
  };


  /* =========================================
     FORMAT PRIX
  ========================================= */

  const formatPrice = (
    amount,
    currency = "FCFA"
  ) => {
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

    return `${formatted} ${currency}`;
  };


  /* =========================================
     TOTAL
  ========================================= */

  const getTotal = () => {
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

        return total +
          price * quantity;
      },
      0
    );
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

    if (
      value === "expédiée" ||
      value === "expediee"
    ) {
      return "Expédiée";
    }

    if (
      value === "livrée" ||
      value === "livree"
    ) {
      return "Livrée";
    }

    return status || "Commande";
  };


  /* =========================================
     PAIEMENT
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

    return (
      method ||
      "Non renseigné"
    );
  };


  /* =========================================
     DATE
  ========================================= */

  const getOrderDate = () => {
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
      let date;

      if (
        typeof createdAt?.toDate ===
        "function"
      ) {
        date =
          createdAt.toDate();
      } else if (
        createdAt?.seconds
      ) {
        date =
          new Date(
            createdAt.seconds *
              1000
          );
      } else {
        date =
          new Date(createdAt);
      }

      if (
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
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(date);
    } catch {
      return "Date non renseignée";
    }
  };


  /* =========================================
     NUMÉRO COMMANDE
  ========================================= */

  const getOrderNumber = () => {
    if (order?.orderNumber) {
      return order.orderNumber;
    }

    if (order?.id) {
      return `UMI-${String(
        order.id
      )
        .slice(-6)
        .toUpperCase()}`;
    }

    return "Commande UMI";
  };


  /* =========================================
     QUANTITÉ EXACTE
  ========================================= */

  const getQuantity = (product) => {
    /*
      On conserve volontairement la valeur
      telle qu'elle a été enregistrée.

      Exemple :
      3kg reste 3kg
      25 sacs reste 25 sacs
    */

    return (
      product?.quantity ??
      product?.quantite ??
      "Non renseignée"
    );
  };


  /* =========================================
     IMAGE PRODUIT
  ========================================= */

  const getProductImage = (
    product
  ) => {
    return (
      product?.imageUrl ||
      product?.image ||
      product?.photo ||
      product?.images?.[0] ||
      ""
    );
  };


  /* =========================================
     PAS DE COMMANDE
  ========================================= */

  if (!order) {
    return (
      <div className="order-detail-page">

        <header className="order-detail-header">
          <button
            type="button"
            onClick={onBack}
          >
            ←
          </button>

          <h1>
            Ma commande
          </h1>

          <div />
        </header>

        <div className="order-detail-empty">
          <span>📦</span>

          <h2>
            Commande introuvable
          </h2>

          <button
            type="button"
            onClick={onBack}
          >
            Retour
          </button>
        </div>

      </div>
    );
  }


  const currency =
    getCurrency();

  const total =
    getTotal();

  const products =
    Array.isArray(order?.products)
      ? order.products
      : [];


  return (
    <div className="order-detail-page">

      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <header className="order-detail-header">

        <button
          type="button"
          className="order-detail-back"
          onClick={onBack}
        >
          ←
        </button>

        <h1>
          Détails de la commande
        </h1>

        <div className="order-detail-header-space" />

      </header>


      <main className="order-detail-content">

        {/* ===================================
            COMMANDE
        =================================== */}

        <section className="order-detail-summary">

          <div>
            <small>
              Commande
            </small>

            <strong>
              {getOrderNumber()}
            </strong>
          </div>

          <span className="order-detail-status">
            {getStatusName(
              order?.status
            )}
          </span>

        </section>


        {/* ===================================
            DATE
        =================================== */}

        <section className="order-detail-card">

          <h2>
            Informations
          </h2>

          <div className="order-detail-row">
            <span>
              Date
            </span>

            <strong>
              {getOrderDate()}
            </strong>
          </div>

          <div className="order-detail-row">
            <span>
              Paiement
            </span>

            <strong>
              {getPaymentMethodName(
                order?.paymentMethod
              )}
            </strong>
          </div>

          <div className="order-detail-row">
            <span>
              Statut
            </span>

            <strong>
              {getStatusName(
                order?.status
              )}
            </strong>
          </div>

        </section>


        {/* ===================================
            ARTICLES
        =================================== */}

        <section className="order-detail-card">

          <h2>
            Articles commandés
          </h2>

          {products.length === 0 ? (

            <p className="order-detail-no-product">
              Aucun article enregistré.
            </p>

          ) : (

            <div className="order-detail-products">

              {products.map(
                (product, index) => {

                  const image =
                    getProductImage(
                      product
                    );

                  const price =
                    getNumericPrice(
                      product?.price
                    );

                  return (

                    <article
                      className="order-detail-product"
                      key={
                        product?.id ||
                        index
                      }
                    >

                      <div className="order-detail-product-image">

                        {image ? (
                          <img
                            src={image}
                            alt={
                              product?.name ||
                              "Article"
                            }
                          />
                        ) : (
                          <span>
                            🏭
                          </span>
                        )}

                      </div>


                      <div className="order-detail-product-info">

                        <h3>
                          {product?.name ||
                            "Article UMI"}
                        </h3>

                        {product?.category && (
                          <small>
                            {
                              product.category
                            }
                          </small>
                        )}

                        <p>
                          Quantité :{" "}
                          <strong>
                            {getQuantity(
                              product
                            )}
                          </strong>
                        </p>

                        <strong className="order-detail-product-price">
                          {price !== null
                            ? formatPrice(
                                price,
                                currency
                              )
                            : product?.price ||
                              "Prix non renseigné"}
                        </strong>

                      </div>

                    </article>

                  );
                }
              )}

            </div>

          )}

        </section>


        {/* ===================================
            CLIENT / LIVRAISON
        =================================== */}

        <section className="order-detail-card">

          <h2>
            Livraison
          </h2>

          <div className="order-detail-row">
            <span>
              Nom
            </span>

            <strong>
              {order?.firstName ||
                order?.prenom ||
                order?.customer?.prenom ||
                ""}
              {" "}
              {order?.lastName ||
                order?.nom ||
                order?.customer?.nom ||
                "Non renseigné"}
            </strong>
          </div>

          <div className="order-detail-row">
            <span>
              Téléphone
            </span>

            <strong>
              {order?.phone ||
                order?.telephone ||
                order?.customer?.telephone ||
                "Non renseigné"}
            </strong>
          </div>

          <div className="order-detail-row">
            <span>
              E-mail
            </span>

            <strong>
              {order?.email ||
                order?.customer?.email ||
                "Non renseigné"}
            </strong>
          </div>

          <div className="order-detail-row">
            <span>
              Adresse
            </span>

            <strong>
              {order?.address ||
                order?.adresse ||
                order?.customer?.adresse ||
                "Non renseignée"}
            </strong>
          </div>

          <div className="order-detail-row">
            <span>
              Lieu de livraison
            </span>

            <strong>
              {order?.deliveryLocation ||
                order?.lieuLivraison ||
                order?.customer?.lieuLivraison ||
                order?.location ||
                "Non renseigné"}
            </strong>
          </div>

        </section>


        {/* ===================================
            TOTAL
        =================================== */}

        <section className="order-detail-total">

          <span>
            Total de la commande
          </span>

          <strong>
            {formatPrice(
              total,
              currency
            )}
          </strong>

        </section>

      </main>

    </div>
  );
}

export default OrderDetail;