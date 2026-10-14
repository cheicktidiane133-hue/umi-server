import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import { useEffect, useState } from "react";
import "./Order.css";


function Order({
  cart = [],
  user,
  onBack,
  onConfirmOrder,
}) {


  /* =========================================
     INFORMATIONS DE L'ACHETEUR
  ========================================= */

  const [buyerInfo, setBuyerInfo] = useState({
    nom: "",
    prenom: "",
    adresse: "",
    email: "",
    telephone: "",
    lieuLivraison: "",
  });


  /* =========================================
     PRÉREMPLIR AVEC LE COMPTE
  ========================================= */

  useEffect(() => {

    setBuyerInfo({
      nom: user?.nom || "",
      prenom: user?.prenom || "",
      adresse: user?.adresse || "",
      email: user?.email || "",
      telephone: user?.telephone || "",
      lieuLivraison:
        user?.lieuLivraison || "",
    });

  }, [user]);


  /* =========================================
     MODIFIER UNE INFORMATION
  ========================================= */

  const handleBuyerChange = (event) => {

    const {
      name,
      value,
    } = event.target;


    setBuyerInfo(
      (previousInfo) => ({
        ...previousInfo,
        [name]: value,
      })
    );

  };


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
  /* =========================================
     DEVISE
     UMI UTILISE UNIQUEMENT FCFA
  ========================================= */

  const getCurrency = () => {
    return "FCFA";
  };
  /* =========================================
     FORMATER LE PRIX
  ========================================= */
const formatPrice = (amount, currency = "FCFA") => {
  if (
    amount === null ||
    amount === undefined ||
    !Number.isFinite(amount)
  ) {
    return "Prix non renseigné";
  }

  const formattedAmount =
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 2,
    }).format(amount);

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


  /* =========================================
     CONTINUER VERS LE PAIEMENT
  ========================================= */

  const handleContinuePayment = () => {

    if (!buyerInfo.nom.trim()) {
      umiNotify("Veuillez renseigner votre nom.");
      return;
    }


    if (!buyerInfo.prenom.trim()) {
      umiNotify("Veuillez renseigner votre prénom.");
      return;
    }


    if (!buyerInfo.adresse.trim()) {
      umiNotify("Veuillez renseigner votre adresse.");
      return;
    }


    if (!buyerInfo.email.trim()) {
      umiNotify("Veuillez renseigner votre e-mail.");
      return;
    }


    if (!buyerInfo.telephone.trim()) {
      umiNotify("Veuillez renseigner votre téléphone.");
      return;
    }


    if (!buyerInfo.lieuLivraison.trim()) {
      umiNotify(
        "Veuillez renseigner le lieu de livraison."
      );
      return;
    }


    onConfirmOrder?.({
      buyerInfo,
      cart,
      total: orderTotal,
      currency: orderCurrency,
    });

  };


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
  article
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


                    <div className="order-product-info">

                      <strong className="order-product-name">

                        {machine?.name ||
                          "Machine industrielle"}

                      </strong>


                      <div className="order-product-detail">

                        <span>
                          Prix unitaire
                        </span>

                        <strong>
  {formatPrice(unitPrice, currency)}
</strong>
                      </div>


                      <div className="order-product-detail">

  <span>
    Quantité
  </span>

  <strong>
    {quantity}
    {machine?.unit ? ` ${machine.unit}` : ""}
  </strong>

</div>


                      <div className="order-product-subtotal">

                        <span>
                          Sous-total
                        </span>

                       <strong>
  {formatPrice(lineTotal, currency)}
</strong>

                      </div>

                    </div>

                  </div>

                );

              }
            )}

          </div>


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
            INFORMATIONS DE L'ACHETEUR
        ===================================== */}

        <section className="order-section">

          <h2>
            Informations de l'acheteur
          </h2>


          <div className="order-buyer-form">


            {/* NOM */}

            <label className="order-buyer-field">

              <span>
                Nom
              </span>

              <input
                type="text"
                name="nom"
                value={buyerInfo.nom}
                onChange={handleBuyerChange}
                placeholder="Votre nom"
              />

            </label>


            {/* PRÉNOM */}

            <label className="order-buyer-field">

              <span>
                Prénom
              </span>

              <input
                type="text"
                name="prenom"
                value={buyerInfo.prenom}
                onChange={handleBuyerChange}
                placeholder="Votre prénom"
              />

            </label>


            {/* ADRESSE */}

            <label className="order-buyer-field">

              <span>
                Adresse
              </span>

              <input
                type="text"
                name="adresse"
                value={buyerInfo.adresse}
                onChange={handleBuyerChange}
                placeholder="Votre adresse"
              />

            </label>


            {/* EMAIL */}

            <label className="order-buyer-field">

              <span>
                E-mail
              </span>

              <input
                type="email"
                name="email"
                value={buyerInfo.email}
                onChange={handleBuyerChange}
                placeholder="Votre e-mail"
              />

            </label>


            {/* TÉLÉPHONE */}

            <label className="order-buyer-field">

              <span>
                Téléphone
              </span>

              <input
                type="tel"
                name="telephone"
                value={buyerInfo.telephone}
                onChange={handleBuyerChange}
                placeholder="Votre téléphone"
              />

            </label>


            {/* LIEU DE LIVRAISON */}

            <label className="order-buyer-field">

              <span>
                Lieu de livraison
              </span>

              <input
                type="text"
                name="lieuLivraison"
                value={
                  buyerInfo.lieuLivraison
                }
                onChange={
                  handleBuyerChange
                }
                placeholder="Ex. Bamako, Mali"
              />

            </label>


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
            Vérifiez votre commande et vos
            informations de livraison avant
            de continuer vers le paiement.
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
          onClick={
            handleContinuePayment
          }
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